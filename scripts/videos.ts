import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { VideoEntry } from "../src/video/registry";

export type LoadedVideos = {
  videos: VideoEntry[];
  /** Folders that could not be loaded, with the reason, so one half-made video never blocks the others. */
  broken: { dir: string; reason: string }[];
};

/** Node-side twin of src/videos.ts: every composition from videos/<id>/index.ts(x). */
export const loadVideos = async (): Promise<LoadedVideos> => {
  const videos: VideoEntry[] = [];
  const broken: LoadedVideos["broken"] = [];
  for (const dir of readdirSync("videos", { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const index = ["index.ts", "index.tsx"].map((f) => join("videos", dir.name, f)).find((f) => existsSync(f));
    if (!index) {
      if (existsSync(join("videos", dir.name, "video.json"))) broken.push({ dir: dir.name, reason: "has video.json but no index.ts" });
      continue;
    }
    try {
      const mod = (await import(pathToFileURL(resolve(index)).href)) as { default: unknown };
      if (!Array.isArray(mod.default)) throw new Error("index.ts must export default an array of defineVideo(...)");
      const clash = (mod.default as VideoEntry[]).find((v) => videos.some((w) => w.id === v.id));
      if (clash) throw new Error(`composition id "${clash.id}" is already used by another video`);
      videos.push(...(mod.default as VideoEntry[]));
    } catch (e) {
      broken.push({ dir: dir.name, reason: (e as Error).message });
    }
  }
  return { videos, broken };
};
