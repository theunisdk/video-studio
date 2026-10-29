// Usage: pnpm gallery [<section> ...]
// Renders a still of every kit gallery cell (src/gallery/cells.ts) and tiles each section into
// out/kit-gallery/<section>.jpg: every title, caption, transition, motion, background and frame variant.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { galleryCells } from "../src/gallery/cells";
import { checkFonts } from "./design-check";

const sections = process.argv.slice(2);
const cells = galleryCells.filter((c) => !sections.length || sections.includes(c.section));
if (!cells.length) throw new Error(`No gallery cells in ${sections.join(", ")}`);
for (const c of cells) {
  const errors = await checkFonts(c.design);
  if (errors.length) throw new Error(`gallery cell ${c.id}: ${errors.join("; ")}`);
}

const outDir = resolve("out", "kit-gallery");
const cellDir = join(outDir, "cells");
rmSync(cellDir, { recursive: true, force: true });
mkdirSync(cellDir, { recursive: true });

const chromiumOptions = { gl: "swangle" as const };
const serveUrl = await bundle({ entryPoint: resolve("src/index.ts"), publicDir: resolve("videos") });
for (const c of cells) {
  const inputProps = { cell: c.id };
  const composition = await selectComposition({ serveUrl, id: "kit-gallery", inputProps, chromiumOptions });
  const output = join(cellDir, `${c.section}--${c.id}.jpg`);
  await renderStill({ serveUrl, composition, frame: c.frame, output, imageFormat: "jpeg", jpegQuality: 85, inputProps, chromiumOptions, scale: 0.5 });
  console.log(`still ${output}`);
}
for (const section of [...new Set(cells.map((c) => c.section))]) {
  const n = cells.filter((c) => c.section === section).length;
  const sheet = join(outDir, `${section}.jpg`);
  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-framerate", "1", "-pattern_type", "glob", "-i", join(cellDir, `${section}--*.jpg`),
    "-vf", `tile=3x${Math.ceil(n / 3)}:padding=6:color=white`, "-frames:v", "1", sheet,
  ]);
  console.log(`sheet ${sheet}`);
}
