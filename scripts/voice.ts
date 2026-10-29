// Usage: pnpm voice <videoId> [--adopt <sceneId>=<file.mp3> ...] [--placeholder]
// --placeholder writes silent clips sized to the text (~150 wpm) so scenes can be built
// before narration exists; render refuses a full video while any are present.
// Synthesises one clip per scene with ElevenLabs and caches it by content hash,
// so only scenes whose narration or voice changed cost credits.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { videoSchema, voiceFingerprint, type Alignment, type VideoSpec, type VoiceManifest } from "../src/video/schema";

const [videoId, ...rest] = process.argv.slice(2);
if (!videoId) throw new Error("Usage: pnpm voice <videoId> [--placeholder] [--adopt <sceneId>=<file.mp3> ...]");

const adopt = new Map<string, string>();
let placeholder = false;
for (let i = 0; i < rest.length; i++) {
  if (rest[i] === "--placeholder") {
    placeholder = true;
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

const clipKey = (text: string) =>
  createHash("sha256")
    .update(JSON.stringify({ text, voice: voiceFingerprint(video.voice) }))
    .digest("hex")
    .slice(0, 16);

const probeSeconds = (path: string) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).toString().trim());

const synthesize = async (text: string): Promise<{ audio: Buffer; alignment: Alignment | null }> => {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set (export it first; see README)");
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(video.voice.voiceId)}/with-timestamps?output_format=mp3_44100_128`;
  for (let attempt = 1; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ text, model_id: video.voice.modelId, voice_settings: video.voice.settings }),
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

const manifest: VoiceManifest = { videoId, voiceFingerprint: voiceFingerprint(video.voice), clips: {} };

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
    const { audio, alignment } = await synthesize(scene.narration);
    storeClip(audioPath, (tmp) => writeFileSync(tmp, audio));
    if (alignment) writeFileSync(alignmentPath, JSON.stringify(alignment));
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
  const timing = !alignment ? "timing: estimated" : alignment.characters.length === scene.narration.length ? "timing: exact" : "timing: estimated (alignment length mismatch)";
  console.log(`${scene.id.padEnd(16)} ${status.padEnd(12)} ${manifest.clips[scene.id].durationSeconds.toFixed(2)}s  ${file}  ${timing}`);
}

writeFileSync(join(videoDir, "voice.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`Wrote ${join(videoDir, "voice.json")}`);
