// Usage: pnpm restore <videoId> <version>      e.g. pnpm restore demo v2, or pnpm restore demo demo-flat-v2
// Puts the sources saved by an earlier render (videos/<id>/versions/<id>-v<N>/) back in place,
// so that look can be rendered again; the render then gets the next version number.
// Current sources that no saved version holds are kept first in versions/unsaved-<time>/.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { copySources, replaceSources, sourceEntries } from "./versions";

const [videoId, versionArg, ...extra] = process.argv.slice(2);
if (!videoId || !versionArg || extra.length) throw new Error("Usage: pnpm restore <videoId> <version>  (e.g. v2)");

const dir = join("videos", videoId);
const versions = join(dir, "versions");
if (!existsSync(versions)) throw new Error(`${versions} does not exist: no render of ${videoId} has saved its sources yet`);
const saved = readdirSync(versions, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

// An exact folder name wins (needed for variants, e.g. demo-flat-v2); otherwise "v2" or "2" picks <id>-v2.
const n = /^v?(\d+)$/.exec(versionArg)?.[1];
const wanted = saved.includes(versionArg) ? [versionArg] : n ? saved.filter((v) => v === `${videoId}-v${n}`) : [];
if (wanted.length !== 1) throw new Error(`No saved sources for "${versionArg}" in ${versions}. Saved: ${saved.join(", ") || "none"}`);
const from = join(versions, wanted[0]);

/** Every file under `root`'s source entries, relative to `root`. */
const files = (root: string): string[] =>
  sourceEntries(root).flatMap((name) => {
    const walk = (rel: string): string[] =>
      statSync(join(root, rel)).isDirectory() ? readdirSync(join(root, rel)).flatMap((c) => walk(join(rel, c))) : [rel];
    return walk(name);
  });
const same = (a: string, b: string) => {
  const fa = files(a).sort();
  const fb = files(b).sort();
  return fa.length === fb.length && fa.every((f, i) => f === fb[i] && readFileSync(join(a, f)).equals(readFileSync(join(b, f))));
};

if (!saved.some((v) => same(dir, join(versions, v)))) {
  const keep = join(versions, `unsaved-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  copySources(dir, keep);
  console.log(`current sources kept in ${keep}`);
}

replaceSources(from, dir);
console.log(`restored ${from} into ${dir}. Next: pnpm voice ${videoId} (only if narration changed), pnpm render ${videoId}`);
