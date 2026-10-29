// What a render saves of a video's sources, and what restore puts back.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const sourceFile = /\.(?:tsx?|json|md)$/;
const sourceDirs = ["components", "assets"];

/** Top-level code, JSON and Markdown, plus components/ and assets/: everything a look is made of. */
export const sourceEntries = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true })
    .filter((e) => (e.isFile() && sourceFile.test(e.name)) || (e.isDirectory() && sourceDirs.includes(e.name)))
    .map((e) => e.name);

/** Copies the source entries of `from` into `to`, which must not exist yet. */
export const copySources = (from: string, to: string) => {
  if (existsSync(to)) throw new Error(`${to} already exists`);
  mkdirSync(to, { recursive: true });
  for (const name of sourceEntries(from)) cpSync(join(from, name), join(to, name), { recursive: true });
};

/** Replaces the source entries of `dir` with those of `from`; other files and folders are left alone. */
export const replaceSources = (from: string, dir: string) => {
  for (const name of sourceEntries(dir)) rmSync(join(dir, name), { recursive: true, force: true });
  for (const name of sourceEntries(from)) cpSync(join(from, name), join(dir, name), { recursive: true });
};
