// Usage: pnpm render <videoId> [--stills-only] [--frames 120,480] [--preview]
// Every render is kept: outputs go to out/<id>/<id>-v<N>.{mp4,srt,md} (or <id>-preview-v<N>.mp4)
// with N one past the highest existing version. --preview allows placeholder narration.
// Bundles once, grabs a QA still from every scene (plus stills/contact.jpg), renders the MP4
// with loudness-normalised audio, writes captions (.srt) and the narration script (.md),
// then checks the MP4 with ffprobe. A passed render also keeps the sources that made it
// (videos/<id>/versions/<name>/) and its contact sheet (out/<id>/contacts/<name>.jpg).
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { buildCues, toSrt } from "../src/video/captions";
import { checkDesign } from "./design-check";
import { loadVideos } from "./videos";
import { copySources } from "./versions";

const args = process.argv.slice(2);
const videoId = args[0];
if (!videoId || videoId.startsWith("--")) throw new Error("Usage: pnpm render <videoId> [--stills-only] [--frames 120,480] [--preview]");
const stillsOnly = args.includes("--stills-only");
const preview = args.includes("--preview");
const framesArg = args.indexOf("--frames");
const unknownArgs = args.slice(1).filter((a, i) => !["--stills-only", "--preview", "--frames"].includes(a) && args[i] !== "--frames");
if (unknownArgs.length) throw new Error(`Unknown argument ${unknownArgs.join(" ")}`);
const { videos, broken } = await loadVideos();
const video = videos.find((v) => v.id === videoId);
if (!video) {
  const why = broken.find((b) => videoId === b.dir || videoId.startsWith(`${b.dir}-`));
  if (why) throw new Error(`videos/${why.dir} could not be loaded: ${why.reason}`);
  throw new Error(`Unknown video "${videoId}". Known: ${videos.map((v) => v.id).join(", ")}`);
}

const designCheck = await checkDesign(video);
designCheck.notes.forEach((n) => console.log(`note: ${n}`));
if (designCheck.errors.length) throw new Error(`design in videos/${video.videoId}/video.json:\n  ${designCheck.errors.join("\n  ")}`);

const outDir = resolve("out", video.id);
const stillDir = join(outDir, "stills");
rmSync(stillDir, { recursive: true, force: true });
mkdirSync(stillDir, { recursive: true });

const chromiumOptions = { gl: "swangle" as const };
const serveUrl = await bundle({ entryPoint: resolve("src/index.ts"), publicDir: resolve("videos") });
const inputProps = { videoId: video.videoId, timeline: video.timeline, ...(video.design ? { design: video.design } : {}) };
const composition = await selectComposition({ serveUrl, id: video.id, inputProps, chromiumOptions });

const { timeline } = video;
const stillFrames =
  framesArg >= 0
    ? (args[framesArg + 1] ?? "").split(",").map((f) => {
        const n = f.trim() === "" ? NaN : Number(f);
        if (!Number.isInteger(n) || n < 0 || n >= timeline.durationInFrames) throw new Error(`--frames: "${f}" is not a frame between 0 and ${timeline.durationInFrames - 1}`);
        return n;
      })
    : timeline.scenes.map((s) => s.from + Math.floor(s.durationInFrames * 0.6)).concat(timeline.durationInFrames - 1);
for (const frame of stillFrames) {
  const output = join(stillDir, `f${String(frame).padStart(5, "0")}.jpg`);
  await renderStill({ serveUrl, composition, frame, output, imageFormat: "jpeg", jpegQuality: 85, inputProps, chromiumOptions, scale: 0.5 });
  console.log(`still ${output}`);
}
const stills = readdirSync(stillDir).filter((f) => f.endsWith(".jpg")).length;
execFileSync("ffmpeg", [
  "-v", "error", "-y", "-framerate", "1", "-pattern_type", "glob", "-i", join(stillDir, "f*.jpg"),
  "-vf", `tile=3x${Math.ceil(stills / 3)}:padding=6:color=white`, "-frames:v", "1", join(stillDir, "contact.jpg"),
]);
console.log(`contact sheet ${join(stillDir, "contact.jpg")}`);
if (stillsOnly) process.exit(0);

const placeholders = timeline.scenes.filter((s) => s.placeholder).map((s) => s.id);
if (placeholders.length && !preview) {
  console.error(`Narration is still placeholder silence for: ${placeholders.join(", ")}. Run: pnpm voice ${video.id}`);
  process.exit(1);
}

// Everything renders to temp names and is only moved into place after QA passes,
// so out/<id>/ never mixes a new transcript with an old or failed video.
const stem = preview ? `${video.id}-preview` : video.id;
// Saved sources count too, so a video folder copied without its out/ never reuses a version number.
const savedDir = resolve("videos", video.videoId, "versions");
const taken = [...readdirSync(outDir), ...(existsSync(savedDir) ? readdirSync(savedDir) : [])];
const version = Math.max(0, ...taken.map((f) => Number(new RegExp(`^${stem}-v(\\d+)(?:\\.mp4)?$`).exec(f)?.[1] ?? 0))) + 1;
const name = `${stem}-v${version}`;
const output = join(outDir, `${name}.mp4`);
if (existsSync(output)) throw new Error(`${output} already exists`);
const rawVideo = join(outDir, "render.raw.mp4");
const candidate = join(outDir, "render.candidate.mp4");
const cleanup = () => [rawVideo, candidate].forEach((f) => rmSync(f, { force: true }));
const fail = (message: string): never => {
  cleanup();
  console.error(`QA FAILED: ${message}`);
  process.exit(1);
};
const started = Date.now();
let lastLogged = -1;
try {
await renderMedia({
  serveUrl,
  composition,
  codec: "h264",
  audioCodec: "aac",
  outputLocation: rawVideo,
  inputProps,
  chromiumOptions,
  imageFormat: "jpeg",
  jpegQuality: 92,
  onProgress: ({ progress }) => {
    const pct = Math.floor(progress * 10) * 10;
    if (pct !== lastLogged) console.log(`render ${pct}%`), (lastLogged = pct);
  },
});
} catch (e) {
  fail(`render failed: ${(e as Error).message}`);
}

// -16 LUFS is the usual web/mobile delivery target; the video stream is copied untouched.
try {
  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-i", rawVideo, "-c:v", "copy",
    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", candidate,
  ]);
} catch (e) {
  fail(`loudness pass failed: ${(e as Error).message}`);
}

const probe = JSON.parse(
  execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,width,height,r_frame_rate", "-of", "json", candidate]).toString(),
) as { format: { duration: string }; streams: { codec_type: string; codec_name: string; width?: number; height?: number; r_frame_rate?: string }[] };
const v = probe.streams.find((s) => s.codec_type === "video");
const a = probe.streams.find((s) => s.codec_type === "audio");
const expected = timeline.durationInFrames / timeline.fps;
const duration = Number(probe.format.duration);
const problems = [
  !v && "no video stream",
  !a && "no audio stream",
  v && (v.width !== video.width || v.height !== video.height) && `size ${v.width}x${v.height}`,
  v && v.r_frame_rate !== `${timeline.fps}/1` && `fps ${v.r_frame_rate}`,
  (!Number.isFinite(duration) || Math.abs(duration - expected) > 0.2) && `duration ${duration.toFixed(2)}s, expected ${expected.toFixed(2)}s`,
].filter(Boolean);

if (problems.length) fail(problems.join("; "));

renameSync(candidate, output);
cleanup();
if (!preview) writeFileSync(join(outDir, `${name}.srt`), toSrt(buildCues(timeline), timeline.fps));
if (!preview) writeFileSync(
  join(outDir, `${name}.md`),
  `# ${video.title}\n\n` + timeline.scenes.map((s) => `## ${s.kicker || s.headline || s.id}\n\n${s.narration}\n`).join("\n"),
);

console.log(`rendered ${output} in ${((Date.now() - started) / 1000).toFixed(0)}s: ${duration.toFixed(2)}s ${v?.codec_name} ${v?.width}x${v?.height} ${a?.codec_name}`);
console.log("QA passed: streams, size, fps and duration match the timeline");

// Keep what made this version, so any earlier look can be restored (pnpm restore) and rendered again.
// The video is already in place, so a failure here is reported but does not fail the render.
try {
  const snapshot = join(savedDir, name);
  copySources(resolve("videos", video.videoId), snapshot);
  mkdirSync(join(outDir, "contacts"), { recursive: true });
  copyFileSync(join(stillDir, "contact.jpg"), join(outDir, "contacts", `${name}.jpg`));
  console.log(`sources saved in ${snapshot}`);
} catch (e) {
  console.error(`WARNING: ${name} rendered and passed QA, but its sources were not saved: ${(e as Error).message}`);
}
