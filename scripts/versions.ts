// What a render saves of a video's sources, and what restore puts back.
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

const sourceFile = /\.(?:tsx?|json|md)$/;
const sourceDirs = ["components", "assets"];

/** Top-level code, JSON and Markdown, plus components/ and assets/: everything a look is made of. */
export const sourceEntries = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true })
    .filter((e) => (e.isFile() && sourceFile.test(e.name)) || (e.isDirectory() && sourceDirs.includes(e.name)))
    .map((e) => e.name);

/** Copies the source entries of `from` into `to`, which must not exist yet; all or nothing. */
export const copySources = (from: string, to: string) => {
  if (existsSync(to)) throw new Error(`${to} already exists`);
  const work = `${to}.tmp-${process.pid}`;
  try {
    mkdirSync(work, { recursive: true });
    for (const name of sourceEntries(from)) cpSync(join(from, name), join(work, name), { recursive: true });
    renameSync(work, to);
  } catch (e) {
    rmSync(work, { recursive: true, force: true });
    throw e;
  }
};

/**
 * Replaces the source entries of `dir` with those of `from`. A components/ or assets/ folder the snapshot
 * does not have is left as it is; other files and folders are untouched.
 */
export const replaceSources = (from: string, dir: string) => {
  const incoming = sourceEntries(from);
  const keep = (name: string) => sourceDirs.includes(name) && !incoming.includes(name);
  for (const name of sourceEntries(dir)) if (!keep(name)) rmSync(join(dir, name), { recursive: true, force: true });
  for (const name of incoming) cpSync(join(from, name), join(dir, name), { recursive: true });
};
