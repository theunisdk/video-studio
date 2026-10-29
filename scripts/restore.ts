// Usage: pnpm restore <videoId> <version>      e.g. pnpm restore demo v2
// Puts the sources saved by an earlier render (videos/<id>/versions/<id>-v<N>/) back in place,
// so that look can be rendered again; the render then gets the next version number.
// Current sources that no saved version holds are kept first in versions/unsaved-<time>/.
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const [videoId, versionArg, ...extra] = process.argv.slice(2);
if (!videoId || !versionArg || extra.length) throw new Error("Usage: pnpm restore <videoId> <version>  (e.g. v2)");
const n = /^(?:.*-)?v?(\d+)$/.exec(versionArg)?.[1];
if (!n) throw new Error(`"${versionArg}" is not a version like v2`);

const dir = join("videos", videoId);
const versions = join(dir, "versions");
const wanted = readdirSync(versions, { withFileTypes: true })
  .filter((d) => d.isDirectory() && new RegExp(`^${videoId}(?:-[a-z0-9-]+)?-v${n}$`).test(d.name) && !d.name.includes("-preview-"))
  .map((d) => d.name);
if (wanted.length !== 1) throw new Error(wanted.length ? `More than one saved v${n}: ${wanted.join(", ")}` : `No saved sources for v${n} in ${versions}`);
const from = join(versions, wanted[0]);

const files = ["Video.tsx", "index.ts", "index.tsx", "video.json", "voice.json", "design.md", "NOTES.md"];
const listComponents = (root: string) => (existsSync(join(root, "components")) ? readdirSync(join(root, "components")).map((f) => `components/${f}`) : []);
const same = (a: string, b: string) => {
  const fa = [...files, ...listComponents(a)].filter((f) => existsSync(join(a, f)));
  const fb = [...files, ...listComponents(b)].filter((f) => existsSync(join(b, f)));
  return fa.length === fb.length && fa.every((f) => existsSync(join(b, f)) && readFileSync(join(a, f)).equals(readFileSync(join(b, f))));
};

const saved = readdirSync(versions).map((v) => join(versions, v));
if (!saved.some((v) => same(dir, v))) {
  const keep = join(versions, `unsaved-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  mkdirSync(keep, { recursive: true });
  for (const f of files) if (existsSync(join(dir, f))) copyFileSync(join(dir, f), join(keep, f));
  if (existsSync(join(dir, "components"))) cpSync(join(dir, "components"), join(keep, "components"), { recursive: true });
  console.log(`current sources kept in ${keep}`);
}

for (const f of files) {
  if (existsSync(join(from, f))) copyFileSync(join(from, f), join(dir, f));
  else if (f !== "index.ts" && f !== "index.tsx") rmSync(join(dir, f), { force: true });
}
if (existsSync(join(from, "components"))) {
  rmSync(join(dir, "components"), { recursive: true, force: true });
  cpSync(join(from, "components"), join(dir, "components"), { recursive: true });
}
console.log(`restored ${from} into ${dir}. Next: pnpm voice ${videoId} (only if narration changed), pnpm render ${videoId}`);
