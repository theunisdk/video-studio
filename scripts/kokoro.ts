// Kokoro-82M narration in Node, CPU only: onnxruntime-node runs the timestamped ONNX export of the model, and
// phonemizer (espeak-ng in WebAssembly) turns the narration into phonemes. Both install on first use into the
// Kokoro cache from the lockfile in scripts/kokoro-engine/, so a plain `pnpm install` never pulls them in.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { KOKORO_MODEL, kokoroLang, type Alignment, type KokoroVoice } from "../src/video/schema";

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

// Changing the model or a pin in scripts/kokoro-engine/package.json changes the voice: change KOKORO_MODEL in
// src/video/schema.ts with it (checked below).
const REVISION = "dd4401a9add81ac692d20e240d22ec9dda82cc29";
const HUB = `https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX-timestamped/resolve/${REVISION}`;
const FILES = {
  "onnx/model.onnx": "651ea8291843a92276a4a003581a215cb07d15e47dde6fcfb1b768f9a1682054",
  "tokenizer.json": "77a02c8e164413299b4b4c403b14f8e0e1c1b727db4d46a09d6327b861060a34",
};
const SAMPLE_RATE = 24_000;
const SAMPLES_PER_FRAME = 600;
// The voice files hold one style per input length, 510 of them; each run of the model also takes two pad tokens.
const MAX_PHONEMES = 509;
const ENGINE = join(import.meta.dirname, "kokoro-engine");

type Tensor = { data: ArrayLike<number | bigint>; dims: readonly number[] };
type Ort = {
  Tensor: new (type: string, data: BigInt64Array | Float32Array, dims: number[]) => Tensor;
  InferenceSession: {
    create(path: string, options: object): Promise<{ run(feeds: Record<string, Tensor>): Promise<Record<string, Tensor>>; release(): Promise<void> }>;
  };
};
type Phonemizer = {
  phonemize(text: string, language: string): Promise<string[]>;
  list_voices(): Promise<{ languages: { name: string }[] }[]>;
};

const cacheDir = () =>
  process.env.KOKORO_CACHE_DIR || join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "video-studio", "kokoro");

const engineFile = (name: string) => readFileSync(join(ENGINE, name));

/** Installs the locked engine packages into the cache once, then loads them from there. */
const loadEngine = (): { ort: Ort; phonemizer: Phonemizer } => {
  const pins: Record<string, string> = JSON.parse(engineFile("package.json").toString()).dependencies;
  const stale = [`@${REVISION.slice(0, 7)}`, ...Object.entries(pins).map(([name, version]) => `${name} ${version}`)].filter((s) => !KOKORO_MODEL.includes(s));
  if (stale.length) throw new Error(`KOKORO_MODEL in src/video/schema.ts does not name ${stale.join(", ")}; update it with the engine`);

  const lock = ["package.json", "pnpm-lock.yaml"];
  const hash = createHash("sha256");
  for (const name of lock) hash.update(engineFile(name));
  const dir = join(cacheDir(), `engine-${hash.digest("hex").slice(0, 12)}`);
  if (!existsSync(dir)) {
    console.error(`Installing the Kokoro engine (${Object.keys(pins).join(", ")}) into ${dir} (first run only)`);
    const tmp = `${dir}.${process.pid}.tmp`;
    rmSync(tmp, { recursive: true, force: true });
    mkdirSync(tmp, { recursive: true });
    for (const name of lock) copyFileSync(join(ENGINE, name), join(tmp, name));
    try {
      execFileSync("pnpm", ["install", "--frozen-lockfile", "--prod", "--ignore-scripts"], {
        cwd: tmp,
        stdio: ["ignore", 2, 2],
        // Windows runs pnpm through pnpm.cmd, which needs a shell.
        shell: process.platform === "win32",
      });
    } catch (e) {
      rmSync(tmp, { recursive: true, force: true });
      if ((e as NodeJS.ErrnoException).code === "ENOENT") throw new Error("Kokoro installs its engine with pnpm, which is not on PATH");
      throw new Error("Installing the Kokoro engine failed; pnpm's error is above");
    }
    try {
      renameSync(tmp, dir);
    } catch (e) {
      rmSync(tmp, { recursive: true, force: true });
      if (!existsSync(dir)) throw e;
    }
  }
  const require = createRequire(join(dir, "package.json"));
  // espeak-ng's WebAssembly build makes every later uncaught error rethrow from inside its 1 MB bundle.
  const events = ["uncaughtException", "unhandledRejection"];
  const emitter: NodeJS.EventEmitter = process;
  const handlers = events.map((e) => emitter.listeners(e));
  const phonemizer: Phonemizer = require("phonemizer");
  events.forEach((e, i) => emitter.listeners(e).forEach((l) => handlers[i].includes(l) || emitter.off(e, l as () => void)));
  return { ort: require("onnxruntime-node"), phonemizer };
};

/** Downloads a model file into the cache once, checking its SHA-256. */
const fetchFile = async (name: string, sha256: string): Promise<string> => {
  const path = join(cacheDir(), `Kokoro-82M-v1.0-ONNX-timestamped-${REVISION.slice(0, 7)}`, name);
  if (existsSync(path)) return path;
  mkdirSync(join(path, ".."), { recursive: true });
  const part = `${path}.${process.pid}.part`;
  const res = await fetch(`${HUB}/${name}`);
  if (!res.ok || !res.body) throw new Error(`Downloading ${name} failed: HTTP ${res.status}`);
  const total = Number(res.headers.get("content-length")) || 0;
  if (total > 10 << 20) console.error(`Downloading ${name} to ${cacheDir()} (first run only)`);
  const digest = createHash("sha256");
  let done = 0;
  let shown = -1;
  const meter = new Transform({
    transform(chunk: Buffer, _, next) {
      digest.update(chunk);
      done += chunk.length;
      const pct = total ? Math.floor((done * 100) / total) : -1;
      if (total > 10 << 20 && Math.floor(pct / 10) !== Math.floor(shown / 10)) {
        console.error(`  ${name} ${done >> 20} MB (${pct}%)`);
        shown = pct;
      }
      next(null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(res.body as import("node:stream/web").ReadableStream), meter, createWriteStream(part));
  } catch (e) {
    rmSync(part, { force: true });
    throw new Error(`Downloading ${name} failed: ${(e as Error).message}`);
  }
  if (digest.digest("hex") !== sha256) {
    rmSync(part, { force: true });
    throw new Error(`${name} failed its checksum; run again, and if it fails again the file changed upstream`);
  }
  renameSync(part, path);
  return path;
};

// Punctuation stays as it is (the model reads it as pauses); espeak only sees the words between it.
const PUNCTUATION = /(\s*[;:,.!?¡¿—…"«»“”(){}[\]]+\s*)+/g;
const STRESS = new Set(["ˈ", "ˌ"]);
const isCore = (c: string) => /\p{L}/u.test(c) && !STRESS.has(c);

/** espeak's phonemes, moved onto the symbols Kokoro was trained on, as kokoro-js does. */
const pronounce = async (phonemizer: Phonemizer, text: string, lang: string): Promise<string> => {
  const said = (await phonemizer.phonemize(text, lang))
    .join(" ")
    .replace(/kəkˈoːɹoʊ/g, "kˈoʊkəɹoʊ")
    .replace(/kəkˈɔːɹəʊ/g, "kˈəʊkəɹəʊ")
    .replace(/ʲ/g, "j")
    .replace(/r/g, "ɹ")
    .replace(/x/g, "k")
    .replace(/ɬ/g, "l")
    .replace(/(?<=[a-zɹː])(?=hˈʌndɹɪd)/g, " ")
    .replace(/ z(?=[;:,.!?¡¿—…"«»“” ]|$)/g, "z");
  return lang === "en-us" ? said.replace(/(?<=nˈaɪn)ti(?!ː)/g, "di") : said;
};

const phonemesOf = async (phonemizer: Phonemizer, text: string, lang: string, vocab: Record<string, number>): Promise<string> => {
  const normal = text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
  let out = "";
  let at = 0;
  for (const m of normal.matchAll(PUNCTUATION)) {
    out += (m.index > at ? await pronounce(phonemizer, normal.slice(at, m.index), lang) : "") + m[0];
    at = m.index + m[0].length;
  }
  if (at < normal.length) out += await pronounce(phonemizer, normal.slice(at), lang);
  return [...out.trim()].filter((c) => c in vocab).join("");
};

/** Splits phonemes into runs the model takes in one go, at punctuation where it can, else between words. */
const chunks = (phonemes: string[]): string[][] => {
  const out: string[][] = [];
  let rest = phonemes;
  while (rest.length > MAX_PHONEMES) {
    const head = rest.slice(0, MAX_PHONEMES).join("");
    const at = head.match(/^.*[;:,.!?—…] /s)?.[0].length || head.lastIndexOf(" ") + 1 || MAX_PHONEMES;
    const take = [...head.slice(0, at)].length;
    out.push(rest.slice(0, take));
    rest = rest.slice(take);
  }
  return [...out, rest];
};

/** Index pairs of a longest common subsequence of `a` and `b`. */
const commonSubsequence = (a: string[], b: string[]): [number, number][] => {
  const w = b.length + 1;
  const t = new Uint16Array((a.length + 1) * w);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      t[i * w + j] = a[i] === b[j] ? t[(i + 1) * w + j + 1] + 1 : Math.max(t[(i + 1) * w + j], t[i * w + j + 1]);
    }
  }
  const pairs: [number, number][] = [];
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (a[i] === b[j]) pairs.push([i++, j++]);
    else if (t[(i + 1) * w + j] >= t[i * w + j + 1]) i++;
    else j++;
  }
  return pairs;
};

/**
 * Places the per-phoneme timings on the words, or says why it cannot.
 *
 * espeak joins and splits words when it reads a whole sentence ("of the" becomes one word, "MP4" two), so
 * each word is phonemized on its own and lined up with the spoken phonemes, letter by letter.
 */
const wordSpans = (
  words: string[],
  alone: string[],
  spoken: string[],
  times: [number, number][],
  seconds: number,
): { spans: [number, number][] | null; note: string | null } => {
  const said = times.filter((_, i) => isCore(spoken[i]));
  const heard = spoken.filter(isCore);
  const aloneByWord = alone.map((p) => [...p].filter(isCore));
  const owner = aloneByWord.flatMap((p, i) => p.map(() => i));
  if (!said.length) return { spans: null, note: "the model returned no phoneme timings" };
  if (!owner.length) return { spans: null, note: "espeak found nothing to pronounce in the words" };
  const pairs = commonSubsequence(heard, aloneByWord.flat());
  if (pairs.length < 0.6 * owner.length) return { spans: null, note: `only ${pairs.length} of ${owner.length} phonemes lined up with the words` };

  const spans: ([number, number] | null)[] = words.map(() => null);
  for (const [a, b] of pairs) {
    const [start, end] = said[a];
    const span = spans[owner[b]];
    spans[owner[b]] = span ? [Math.min(span[0], start), Math.max(span[1], end)] : [start, end];
  }
  // Words with no matched phoneme (a dash, a symbol espeak skips) share the gap around them by length.
  for (let i = 0; i < words.length; ) {
    if (spans[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < words.length && !spans[j]) j++;
    const lo = i > 0 ? spans[i - 1]![1] : 0;
    const hi = Math.max(j < words.length ? spans[j]![0] : seconds, lo);
    const total = words.slice(i, j).reduce((n, w) => n + w.length, 0);
    let at = lo;
    for (let k = i; k < j; k++) {
      const step = ((hi - lo) * words[k].length) / total;
      spans[k] = [at, at + step];
      at += step;
    }
    i = j;
  }
  const placed = spans as [number, number][];
  for (let i = 0; i < placed.length - 1; i++) placed[i][1] = Math.max(placed[i][0], Math.min(placed[i][1], placed[i + 1][0]));
  return { spans: placed.map(([s, e]) => [Math.round(s * 1000) / 1000, Math.round(e * 1000) / 1000]), note: null };
};

const toMp3 = (samples: Float32Array): Buffer =>
  execFileSync(
    "ffmpeg",
    ["-v", "error", "-f", "f32le", "-ar", String(SAMPLE_RATE), "-ac", "1", "-i", "pipe:0", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "128k", "-f", "mp3", "pipe:1"],
    { input: Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength), maxBuffer: 256 << 20 },
  );

/** Voices every text with one load of the model. */
export const kokoroSynthesize = async (voice: KokoroVoice, texts: string[]): Promise<Map<string, KokoroClip>> => {
  const voices: Record<string, string> = JSON.parse(engineFile("voices.json").toString());
  if (!voices[voice.voice]) throw new Error(`Kokoro has no voice "${voice.voice}". Voices: ${Object.keys(voices).join(", ")}`);
  const { ort, phonemizer } = loadEngine();
  const lang = kokoroLang(voice);
  const langs = [...new Set((await phonemizer.list_voices()).flatMap((v) => v.languages.map((l) => l.name)))];
  if (!langs.includes(lang)) {
    throw new Error(
      `Kokoro's phonemizer has no "${lang}" (voice ${voice.voice}); it speaks ${langs.join(", ")}. ` +
        `Use an English voice (af_* or bf_*, say), or set "lang" to one of those`,
    );
  }

  const model = await fetchFile("onnx/model.onnx", FILES["onnx/model.onnx"]);
  const vocab: Record<string, number> = JSON.parse(readFileSync(await fetchFile("tokenizer.json", FILES["tokenizer.json"]), "utf8")).model.vocab;
  const raw = readFileSync(await fetchFile(`voices/${voice.voice}.bin`, voices[voice.voice]));
  const styles = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
  const session = await ort.InferenceSession.create(model, { executionProviders: ["cpu"] });

  try {
    const clips = new Map<string, KokoroClip>();
    for (const text of texts) {
      const spoken = [...(await phonemesOf(phonemizer, text, lang, vocab))];
      if (!spoken.length) throw new Error(`Kokoro found nothing to pronounce in "${text.slice(0, 80)}"`);
      const audio: Float32Array[] = [];
      const times: [number, number][] = [];
      let offset = 0;
      let note: string | null = null;
      for (const chunk of chunks(spoken)) {
        const ids = [0, ...chunk.map((c) => vocab[c]), 0];
        const out = await session.run({
          input_ids: new ort.Tensor("int64", BigInt64Array.from(ids, BigInt), [1, ids.length]),
          style: new ort.Tensor("float32", styles.slice(chunk.length * 256, chunk.length * 256 + 256), [1, 256]),
          speed: new ort.Tensor("float32", Float32Array.of(voice.speed), [1]),
        });
        const waveform = Float32Array.from(out.waveform.data as Float32Array);
        // The model rounds each token's duration to whole frames (at least one) before it draws the audio.
        const frames = Array.from(out.durations.data, (d) => Math.max(1, Math.round(Number(d))));
        if (frames.length !== ids.length || frames.reduce((a, b) => a + b, 0) * SAMPLES_PER_FRAME !== waveform.length) {
          note ??= "the model's phoneme durations do not add up to its audio";
        }
        let frame = frames[0];
        for (let k = 1; k <= chunk.length; k++) {
          const start = (offset + frame * SAMPLES_PER_FRAME) / SAMPLE_RATE;
          frame += frames[k] ?? 0;
          times.push([start, (offset + frame * SAMPLES_PER_FRAME) / SAMPLE_RATE]);
        }
        audio.push(waveform);
        offset += waveform.length;
      }
      const samples = new Float32Array(offset);
      audio.reduce((at, part) => (samples.set(part, at), at + part.length), 0);

      const words = [...text.matchAll(/\S+/g)].map((m) => ({ index: m.index, length: m[0].length, text: m[0] }));
      const alone: string[] = [];
      for (const w of words) alone.push(await pronounce(phonemizer, w.text, lang));
      const placed = note ? { spans: null, note } : wordSpans(words.map((w) => w.text), alone, spoken, times, offset / SAMPLE_RATE);
      clips.set(text, {
        audio: toMp3(samples),
        alignment: placed.spans ? wordAlignment(text, words, placed.spans) : null,
        note: placed.note,
      });
    }
    return clips;
  } finally {
    await session.release();
  }
};
