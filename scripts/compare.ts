// Usage: pnpm compare <videoId>
// Puts this video's storyboard (out/<id>/stills/contact.jpg) above the contact sheets it should be
// judged against, in out/<id>/stills/compare.jpg:
// - a video with no series: its own earlier look (last render) and the three other videos rendered most recently;
//   the question is "does this look different?"
// - a series episode: the previous episode in the same series; the question is "does this look like the same family?"
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const videoId = process.argv[2];
if (!videoId || process.argv.length > 3) throw new Error("Usage: pnpm compare <videoId>");

type Sheet = { label: string; file: string; time: number };

const outRoot = resolve("out");
const mine = join(outRoot, videoId, "stills", "contact.jpg");
if (!existsSync(mine)) throw new Error(`No storyboard yet. Run: pnpm render ${videoId} --stills-only`);

/** The videos/ folder an out/ folder belongs to (a variant "<id>-flat" belongs to "<id>"). */
const sourceOf = (outId: string): string | null => {
  if (existsSync(join("videos", outId, "video.json"))) return outId;
  const dirs = readdirSync("videos").filter((d) => outId.startsWith(`${d}-`) && existsSync(join("videos", d, "video.json")));
  return dirs.sort((a, b) => b.length - a.length)[0] ?? null;
};

/** The series a video belongs to. An unreadable video.json fails for this video; another such video is skipped with a warning. */
const unreadable = new Set<string>();
const seriesOf = (outId: string): string | null => {
  const src = sourceOf(outId);
  if (!src) return null;
  const file = join("videos", src, "video.json");
  try {
    return (JSON.parse(readFileSync(file, "utf8")) as { series?: string }).series ?? null;
  } catch (e) {
    if (outId === videoId) throw new Error(`${file} can't be read: ${(e as Error).message}`);
    if (!unreadable.has(outId)) console.warn(`warning: skipping ${outId}, ${file} can't be read: ${(e as Error).message}`);
    unreadable.add(outId);
    return null;
  }
};

const versionOf = (file: string) => Number(/-v(\d+)\.\w+$/.exec(file)?.[1] ?? 0);

/** Final renders of an out/ folder, newest version first. */
const renders = (outId: string) =>
  readdirSync(join(outRoot, outId))
    .filter((f) => new RegExp(`^${outId}-v\\d+\\.mp4$`).test(f))
    .sort((a, b) => versionOf(b) - versionOf(a));

let work: string | null = null;
const tmp = () => (work ??= mkdtempSync(join(tmpdir(), "compare-")));

/** Six frames of an MP4 as a 3x2 sheet, for videos rendered before contact sheets were kept. */
const sheetFromMp4 = (mp4: string, name: string): string => {
  const seconds = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4]).toString());
  const out = join(tmp(), `${name}.jpg`);
  const fps = (6 / seconds).toFixed(5);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", mp4, "-vf", `fps=${fps},scale=960:-2,tile=3x2:padding=6:color=white`, "-frames:v", "1", out]);
  return out;
};

/** The best picture of an out/ folder's latest look: its last kept contact sheet, its storyboard, or frames of its MP4. */
const latestSheet = (outId: string, { skipStoryboard = false } = {}): Sheet | null => {
  const dir = join(outRoot, outId);
  const contacts = existsSync(join(dir, "contacts"))
    ? readdirSync(join(dir, "contacts")).filter((f) => /-v\d+\.jpg$/.test(f) && !f.includes("-preview-")).sort((a, b) => versionOf(b) - versionOf(a))
    : [];
  const mp4s = renders(outId);
  if (contacts[0]) {
    const file = join(dir, "contacts", contacts[0]);
    return { label: `${outId} v${versionOf(contacts[0])}`, file, time: statSync(file).mtimeMs };
  }
  if (!skipStoryboard && existsSync(join(dir, "stills", "contact.jpg"))) {
    const file = join(dir, "stills", "contact.jpg");
    return { label: `${outId} storyboard`, file, time: statSync(file).mtimeMs };
  }
  if (mp4s[0]) {
    const mp4 = join(dir, mp4s[0]);
    return { label: `${outId} v${versionOf(mp4s[0])}`, file: sheetFromMp4(mp4, outId), time: statSync(mp4).mtimeMs };
  }
  return null;
};

const series = seriesOf(videoId);
const self = sourceOf(videoId) ?? videoId;
// Other videos only: this video's own variants (out/<id>-flat) are not something to differ from.
const others = readdirSync(outRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== videoId && !d.name.startsWith("kit-") && sourceOf(d.name) !== self)
  .map((d) => d.name)
  .filter((o) => {
    seriesOf(o);
    return !unreadable.has(o);
  });

let refs: Sheet[] = [];
let mode: "differ" | "continuity";
if (series) {
  mode = "continuity";
  const episodes = others.filter((o) => seriesOf(o) === series).map((o) => latestSheet(o)).filter((s): s is Sheet => !!s);
  refs = episodes.sort((a, b) => b.time - a.time).slice(0, 1).map((s) => ({ ...s, label: `${s.label} (previous episode, series ${series})` }));
} else {
  mode = "differ";
  const earlier = latestSheet(videoId, { skipStoryboard: true });
  if (earlier) refs.push({ ...earlier, label: `${earlier.label} (this video's earlier look)` });
  // One entry per series, so three episodes of one look don't fill every slot.
  const seen = new Set<string>();
  const recent = others
    .map((o) => ({ sheet: latestSheet(o), series: seriesOf(o) }))
    .filter((r): r is { sheet: Sheet; series: string | null } => !!r.sheet)
    .sort((a, b) => b.sheet.time - a.sheet.time)
    .filter((r) => !r.series || (!seen.has(r.series) && !!seen.add(r.series)))
    .slice(0, 3)
    .map((r) => r.sheet);
  refs.push(...recent);
}

const rows: Sheet[] = [{ label: `${videoId} (this storyboard)`, file: mine, time: Date.now() }, ...refs];
const fontFile = (() => {
  try {
    return execFileSync("fc-match", ["-f", "%{file}", "sans:bold"]).toString().trim() || null;
  } catch {
    return null;
  }
})();
const safe = (s: string) => s.replace(/[^A-Za-z0-9 ._()#-]/g, " ");
const width = 1500;
const filters = rows.map((r, i) => {
  const label = fontFile ? `,drawtext=fontfile='${fontFile}':text='${safe(r.label)}':x=16:y=18:fontsize=34:fontcolor=black` : "";
  return `[${i}:v]scale=${width}:-2,pad=iw:ih+70:0:70:white${label}[r${i}]`;
});
const output = join(outRoot, videoId, "stills", "compare.jpg");
execFileSync("ffmpeg", [
  "-v", "error", "-y",
  ...rows.flatMap((r) => ["-i", r.file]),
  "-filter_complex",
  `${filters.join(";")};${rows.map((_, i) => `[r${i}]`).join("")}${rows.length > 1 ? `vstack=inputs=${rows.length}` : "null"}[out]`,
  "-map", "[out]", "-frames:v", "1", "-q:v", "3", output,
]);
if (work) rmSync(work, { recursive: true, force: true });

console.log(`compare sheet ${output}`);
if (!fontFile) console.log("  no font found (fc-match), so the rows are unlabelled; they are in the order below");
rows.forEach((r, i) => console.log(`  row ${i + 1}: ${r.label}`));
if (rows.length === 1) {
  console.log(mode === "continuity" ? `  no earlier episode of series ${series} has been rendered yet` : "  nothing else has been rendered yet, so there is nothing to compare against");
}
console.log(
  mode === "differ"
    ? "Check: this video must not read as the same look as any row below it (title treatment, palette family, layout). Say how it differs."
    : `Check: this episode must read as the same family as the previous one in series ${series} (palette, fonts, title, captions, intro and outro).`,
);
