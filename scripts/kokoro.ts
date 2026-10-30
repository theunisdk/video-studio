// Kokoro-82M narration: runs scripts/kokoro.py through uv (pinned Python, locked dependencies, CPU only) for
// every clip a `pnpm voice` run needs, in one process so the model loads once.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { kokoroLang, type Alignment, type KokoroVoice } from "../src/video/schema";

export type KokoroClip = { audio: Buffer; alignment: Alignment | null; note: string | null };

type Word = { index: number; length: number };

/** One timing per UTF-16 unit of `text`, the shape ElevenLabs returns; the gap after a word runs to the next one. */
export const wordAlignment = (text: string, words: Word[], spans: [number, number][]): Alignment => {
  const startSeconds: number[] = [];
  const endSeconds: number[] = [];
  words.forEach(({ index, length }, i) => {
    const [start, end] = spans[i];
    const next = words[i + 1]?.index ?? text.length;
    const nextStart = spans[i + 1]?.[0] ?? end;
    for (let c = i === 0 ? 0 : index; c < next; c++) {
      const inWord = c >= index && c < index + length;
      startSeconds[c] = inWord || c < index ? start : end;
      endSeconds[c] = inWord || c < index ? end : Math.max(end, nextStart);
    }
  });
  return { characters: text.split(""), startSeconds, endSeconds };
};

export const kokoroSynthesize = (voice: KokoroVoice, texts: string[]): Map<string, KokoroClip> => {
  const dir = mkdtempSync(join(tmpdir(), "kokoro-"));
  try {
    const words = texts.map((text) => [...text.matchAll(/\S+/g)].map((m) => ({ index: m.index, length: m[0].length, text: m[0] })));
    const items = texts.map((text, i) => ({
      text,
      words: words[i].map((w) => w.text),
      voice: voice.voice,
      speed: voice.speed,
      lang: kokoroLang(voice),
      wav: join(dir, `${i}.wav`),
    }));
    let stdout: Buffer;
    try {
      stdout = execFileSync(process.env.UV ?? "uv", ["run", "--locked", "--script", join(import.meta.dirname, "kokoro.py")], {
        input: JSON.stringify({ items }),
        stdio: ["pipe", "pipe", "inherit"],
        maxBuffer: 64 << 20,
      });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error("Kokoro needs uv (https://docs.astral.sh/uv/), which is not on PATH; install it, or point UV at it");
      }
      throw new Error(`Kokoro failed (scripts/kokoro.py); its error is above`);
    }
    const result = JSON.parse(stdout.toString()) as { items: { words: [number, number][] | null; note: string | null }[] };
    return new Map(
      texts.map((text, i) => {
        const mp3 = join(dir, `${i}.mp3`);
        execFileSync("ffmpeg", ["-v", "error", "-y", "-i", items[i].wav, "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "128k", mp3]);
        const spans = result.items[i].words;
        return [text, { audio: readFileSync(mp3), alignment: spans ? wordAlignment(text, words[i], spans) : null, note: result.items[i].note }];
      }),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
