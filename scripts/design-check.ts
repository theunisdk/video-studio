// Checks a video's design block against the files and fonts it names, before anything is bundled.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getAvailableFonts } from "@remotion/google-fonts/index";
import { designFiles, type Design, type FontToken } from "../src/video/design";
import { hasWordTimings } from "../src/video/timeline";
import type { VideoEntry } from "../src/video/registry";

export type DesignCheck = { errors: string[]; warnings: string[]; notes: string[] };

const googleWeights = async (family: string): Promise<number[] | null> => {
  const entry = getAvailableFonts().find((f) => f.fontFamily.toLowerCase() === family.toLowerCase());
  if (!entry) return null;
  const mod = (await entry.load()) as { getInfo: () => { fonts: Record<string, Record<string, unknown>> } };
  return Object.keys(mod.getInfo().fonts.normal ?? {}).map(Number);
};

/** Problems with a design's Google font families and weights. */
export const checkFonts = async (d: Design): Promise<string[]> => {
  const errors: string[] = [];
  const fonts = Object.entries(d.fonts).filter((e): e is [string, FontToken] => !!e[1]);
  for (const [role, token] of fonts) {
    if ("files" in token) continue;
    const available = await googleWeights(token.family);
    if (!available) {
      errors.push(`fonts.${role}: "${token.family}" is not a Google Fonts family (use its exact name, or local files)`);
      continue;
    }
    const missing = token.weights.filter((w) => !available.includes(w));
    if (missing.length) errors.push(`fonts.${role}: "${token.family}" has no weight ${missing.join(", ")} (it has ${available.join(", ")})`);
  }
  return errors;
};

export const checkDesign = async (video: VideoEntry): Promise<DesignCheck> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];
  const d = video.design;
  if (!d) return { errors, warnings, notes };
  const dir = join("videos", video.videoId);
  const code = readdirSync(dir, { recursive: true, encoding: "utf8" }).filter((f) => /\.tsx?$/.test(f) && !/^(versions|node_modules)[/\\]/.test(f));
  if (!code.some((f) => readFileSync(join(dir, f), "utf8").includes("<Designed"))) {
    warnings.push(`video.json has a design block, but no file in ${dir} mounts <Designed>, so the design has no effect`);
  }
  for (const file of designFiles(d)) {
    if (!existsSync(join(dir, file))) errors.push(`design names ${file}, but ${join(dir, file)} does not exist`);
  }
  errors.push(...(await checkFonts(d)));
  if (d.caption === "highlight") {
    const untimed = video.timeline.scenes.filter((s) => !hasWordTimings(s)).map((s) => s.id);
    if (untimed.length) notes.push(`caption "highlight" has no word timings for ${untimed.join(", ")}: those captions use its plain form`);
  }
  return { errors, warnings, notes };
};
