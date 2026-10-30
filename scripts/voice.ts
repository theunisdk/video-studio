// Usage: pnpm voice <videoId> [--adopt <sceneId>=<file.mp3> ...] [--placeholder] [--kokoro[=<voice>]]
// --placeholder writes silent clips sized to the text (~150 wpm) so scenes can be built
// before narration exists; render refuses a full video while any are present.
// --kokoro voices this run with the free offline Kokoro voice (default af_heart) instead of
// video.json's voice, without editing video.json; a plain `pnpm voice <id>` switches back.
// Synthesises one clip per scene with video.json's voice provider (ElevenLabs or Kokoro) and
// caches it by content hash, so only scenes whose narration or voice changed cost credits.
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  kokoroVoiceSchema,
  videoSchema,
  voiceFingerprint,
  voiceLabel,
  type Alignment,
  type VideoSpec,
  type Voice,
  type VoiceManifest,
} from "../src/video/schema";
import { kokoroSynthesize } from "./kokoro";

const [videoId, ...rest] = process.argv.slice(2);
if (!videoId) throw new Error("Usage: pnpm voice <videoId> [--placeholder] [--adopt <sceneId>=<file.mp3> ...] [--kokoro[=<voice>]]");

const adopt = new Map<string, string>();
let placeholder = false;
let kokoroFlag: string | null = null;
for (let i = 0; i < rest.length; i++) {
  if (rest[i] === "--placeholder") {
    placeholder = true;
    continue;
  }
  if (rest[i] === "--kokoro" || rest[i].startsWith("--kokoro=")) {
    kokoroFlag = rest[i].slice("--kokoro=".length);
    if (rest[i] === "--kokoro=") throw new Error("--kokoro= needs a voice name, e.g. --kokoro=bm_george");
    continue;
  }
  if (rest[i] !== "--adopt") throw new Error(`Unknown argument ${rest[i]}`);
  const pair = rest[++i] ?? "";
  const eq = pair.indexOf("=");
  const sceneId = eq > 0 ? pair.slice(0, eq) : "";
  const file = eq > 0 ? pair.slice(eq + 1) : "";
  if (!sceneId || !file) throw new Error("--adopt needs <sceneId>=<file.mp3>");
  adopt.set(sceneId, file);
}

const videoDir = join("videos", videoId);
const video: VideoSpec = videoSchema.parse(JSON.parse(readFileSync(join(videoDir, "video.json"), "utf8")));
if (video.id !== videoId) throw new Error(`${join(videoDir, "video.json")} has id "${video.id}"; set it to "${videoId}" first`);
const unknown = [...adopt.keys()].filter((sceneId) => !video.scenes.some((s) => s.id === sceneId));
if (unknown.length) throw new Error(`--adopt names scenes not in video.json: ${unknown.join(", ")}`);
const audioDir = join(videoDir, "audio");
mkdirSync(audioDir, { recursive: true });

const flagged =
  kokoroFlag === null
    ? null
    : kokoroVoiceSchema.parse({
        ...(video.voice.provider === "kokoro" ? video.voice : { provider: "kokoro" }),
        ...(kokoroFlag ? { voice: kokoroFlag, lang: undefined } : {}),
      });
const override = flagged && voiceFingerprint(flagged) !== voiceFingerprint(video.voice) ? flagged : null;
const voice: Voice = override ?? video.voice;
console.log(`voice: ${voiceLabel(voice)}${override ? ` (one-off --kokoro; video.json's voice is ${video.voice.provider})` : ""}`);

const clipKey = (text: string) =>
  createHash("sha256")
    .update(JSON.stringify({ text, voice: voiceFingerprint(voice) }))
    .digest("hex")
    .slice(0, 16);

const probeSeconds = (path: string) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).toString().trim());

// Quiet stretches of a clip, as [start, end] seconds.
const silences = (path: string): [number, number][] => {
  const run = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", path, "-af", "silencedetect=noise=-35dB:d=0.04", "-f", "null", "-"], { encoding: "utf8" });
  if (run.error || run.status !== 0) throw new Error(`ffmpeg silencedetect failed on ${path}: ${run.error?.message ?? run.stderr?.slice(-300)}`);
  const spans: [number, number][] = [];
  let open: number | null = null;
  for (const [, kind, value] of run.stderr.matchAll(/silence_(start|end): (-?[0-9.e+-]+)/g)) {
    if (kind === "start") open = Math.max(0, Number(value));
    else if (open !== null) spans.push([open, Number(value)]), (open = null);
  }
  if (open !== null) spans.push([open, probeSeconds(path)]);
  return spans;
};

// Where to cut the clip for a pause after `spoken` (the narration up to the pause): inside the gap the
// voice left there, found from the word timings when there are any, else from the silences near the
// proportional estimate. The cut sits on a frame boundary, where the timeline splits the clip.
// Changing the pause length later needs no new clip.
const cutAfter = (path: string, text: string, spoken: string, seconds: number, alignment: Alignment | null, silent: boolean, fps: number) => {
  const onFrame = (from: number, to: number) => {
    const mid = (from + to) / 2;
    const frame = [Math.round(mid * fps), Math.ceil(from * fps), Math.floor(to * fps)].find((f) => f / fps >= from && f / fps <= to && f > 0);
    return frame === undefined ? null : frame / fps;
  };
  const estimate = (spoken.length / text.length) * seconds;
  if (silent) return { cutSeconds: Math.max(1, Math.round(estimate * fps)) / fps };
  const quiet = silences(path).filter(([s]) => s > 0.05);
  const longest = (lo: number, hi: number) => quiet.filter(([s, e]) => e > lo && s < hi).sort((a, b) => b[1] - b[0] - (a[1] - a[0]))[0];
  const tooShort = { cutSeconds: null, note: "the gap is shorter than a frame" };
  if (alignment && alignment.characters.length === text.length) {
    const lo = alignment.endSeconds[spoken.trimEnd().length - 1];
    const body = text.slice(spoken.length).search(/[\p{L}\p{N}]/u);
    const hi = alignment.startSeconds[body < 0 ? text.length - text.slice(spoken.length).trimStart().length : spoken.length + body];
    const gap = longest(lo, hi);
    if (gap) {
      const from = Math.max(gap[0], lo);
      const to = Math.min(gap[1], hi);
      const cut = to > from ? onFrame(from, to) ?? onFrame(gap[0], gap[1]) : onFrame(gap[0], gap[1]);
      return cut ? { cutSeconds: cut } : tooShort;
    }
    const near = longest(lo - 0.15, hi + 0.15);
    if (near) {
      const cut = onFrame(near[0], near[1]);
      return cut ? { cutSeconds: cut, note: "cut in a silence next to the timed gap" } : tooShort;
    }
    if (hi > lo) {
      const cut = onFrame(lo, hi);
      return cut ? { cutSeconds: cut, note: "no silence found; cut between the timed words" } : tooShort;
    }
    return { cutSeconds: null, note: "no gap in the word timings" };
  }
  const gap = quiet.filter(([s, e]) => e - s >= 0.15 && Math.abs((s + e) / 2 - estimate) < Math.max(0.5, estimate * 0.08)).sort((a, b) => b[1] - b[0] - (a[1] - a[0]))[0];
  const cut = gap ? onFrame(gap[0], gap[1]) : null;
  return cut
    ? { cutSeconds: cut, note: "no word timings; cut at the longest silence near the estimate" }
    : { cutSeconds: null, note: "no word timings and no silence near the estimate" };
};

const elevenLabs = async (voice: Extract<Voice, { provider: "elevenlabs" }>, text: string): Promise<{ audio: Buffer; alignment: Alignment | null }> => {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    throw new Error(
      `ELEVENLABS_API_KEY is not set (export it first; see README). Without a key, use the free offline Kokoro voice: ` +
        `pnpm voice ${videoId} --kokoro for a one-off test, or set "voice": { "provider": "kokoro" } in video.json`,
    );
  }
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice.voiceId)}/with-timestamps?output_format=mp3_44100_128`;
  for (let attempt = 1; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ text, model_id: voice.modelId, voice_settings: voice.settings }),
        signal: AbortSignal.timeout(120_000),
      });
    } catch (e) {
      // A timed-out request may still have been synthesised and billed; don't pay for it twice.
      if (attempt >= 4 || (e as Error).name === "TimeoutError") throw new Error(`ElevenLabs request failed: ${(e as Error).message}`);
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    if (res.ok) {
      const body = (await res.json()) as {
        audio_base64: string;
        alignment?: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] };
      };
      const a = body.alignment;
      return {
        audio: Buffer.from(body.audio_base64, "base64"),
        alignment: a ? { characters: a.characters, startSeconds: a.character_start_times_seconds, endSeconds: a.character_end_times_seconds } : null,
      };
    }
    const retryable = res.status === 429 || res.status >= 500;
    const detail = (await res.text()).slice(0, 300);
    if (!retryable || attempt >= 4) throw new Error(`ElevenLabs ${res.status}: ${detail}`);
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }
};

// Kokoro voices every missing clip in one run of the model; ElevenLabs is asked one clip at a time.
const missing = video.scenes
  .filter((s) => !adopt.has(s.id) && !placeholder && !existsSync(join(audioDir, `${clipKey(s.narration)}.mp3`)))
  .map((s) => s.narration);
const kokoro = voice.provider === "kokoro" && missing.length ? await kokoroSynthesize(voice, [...new Set(missing)]) : null;
const synthesize = async (text: string) => (voice.provider === "kokoro" ? kokoro!.get(text)! : elevenLabs(voice, text));

const manifest: VoiceManifest = { videoId, voiceFingerprint: voiceFingerprint(voice), ...(override ? { override } : {}), clips: {} };

// Writes to a temp name and only keeps the clip if ffprobe can read a real duration from it.
const storeClip = (audioPath: string, write: (tmp: string) => void) => {
  const tmp = `${audioPath}.tmp`;
  write(tmp);
  const seconds = probeSeconds(tmp);
  if (!(seconds > 0)) {
    rmSync(tmp, { force: true });
    throw new Error(`Clip ${audioPath} is unreadable or empty`);
  }
  renameSync(tmp, audioPath);
};
for (const scene of video.scenes) {
  const key = clipKey(scene.narration);
  const real = existsSync(join(audioDir, `${key}.mp3`));
  const usePlaceholder = placeholder && !real && !adopt.has(scene.id);
  const file = usePlaceholder ? `placeholder-${key}.mp3` : `${key}.mp3`;
  const audioPath = join(audioDir, file);
  const alignmentPath = join(audioDir, `${key}.alignment.json`);
  let status = "cached";
  let note: string | null = null;
  if (adopt.has(scene.id)) {
    storeClip(audioPath, (tmp) => copyFileSync(adopt.get(scene.id)!, tmp));
    rmSync(alignmentPath, { force: true });
    status = "adopted";
  } else if (usePlaceholder) {
    const words = scene.narration.split(/\s+/).length;
    const seconds = (words / 150) * 60 + 0.3;
    storeClip(audioPath, (tmp) =>
      execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", seconds.toFixed(2), "-c:a", "libmp3lame", "-f", "mp3", tmp]),
    );
    status = "placeholder";
  } else if (!existsSync(audioPath)) {
    const clip = await synthesize(scene.narration);
    rmSync(alignmentPath, { force: true });
    storeClip(audioPath, (tmp) => writeFileSync(tmp, clip.audio));
    if (clip.alignment) writeFileSync(alignmentPath, JSON.stringify(clip.alignment));
    note = "note" in clip ? clip.note : null;
    status = "synthesised";
  }
  manifest.clips[scene.id] = {
    file,
    text: scene.narration,
    durationSeconds: probeSeconds(audioPath),
    alignment: existsSync(alignmentPath) && !usePlaceholder ? JSON.parse(readFileSync(alignmentPath, "utf8")) : null,
    placeholder: usePlaceholder,
  };
  const alignment = manifest.clips[scene.id].alignment;
  if (scene.spokenHeading) {
    const cut = cutAfter(audioPath, scene.narration, scene.spokenHeading, manifest.clips[scene.id].durationSeconds, alignment, usePlaceholder, video.fps);
    manifest.clips[scene.id].heading = { text: scene.spokenHeading, fps: video.fps, ...cut };
  }
  if (scene.pauses?.length) {
    manifest.clips[scene.id].pauses = scene.pauses.map(({ after }) => {
      const spoken = scene.narration.slice(0, scene.narration.indexOf(after) + after.length);
      return { after, fps: video.fps, ...cutAfter(audioPath, scene.narration, spoken, manifest.clips[scene.id].durationSeconds, alignment, usePlaceholder, video.fps) };
    });
  }
  const timing = !alignment ? `timing: estimated${note ? ` (${note})` : ""}` : alignment.characters.length === scene.narration.length ? "timing: exact" : "timing: estimated (alignment length mismatch)";
  const { heading, pauses = [] } = manifest.clips[scene.id];
  const describe = (label: string, cut: { cutSeconds: number | null; note?: string }) =>
    cut.cutSeconds === null ? `  ${label} pause: NONE (${cut.note})` : `  ${label} cut at ${cut.cutSeconds.toFixed(2)}s${cut.note ? ` (${cut.note})` : ""}`;
  const pause = (heading ? describe("heading", heading) : "") + pauses.map((p) => describe(`"${p.after}"`, p)).join("");
  console.log(`${scene.id.padEnd(16)} ${status.padEnd(12)} ${manifest.clips[scene.id].durationSeconds.toFixed(2)}s  ${file}  ${timing}${pause}`);
}

writeFileSync(join(videoDir, "voice.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`Wrote ${join(videoDir, "voice.json")}`);
