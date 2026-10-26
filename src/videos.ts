import type { VideoEntry } from "./video/registry";

// Every videos/<id>/index.ts is picked up at bundle time; folders without one are ignored.
const context = require.context("../videos", true, /^\.\/[^/]+\/index\.tsx?$/);

const load = (key: string): VideoEntry[] => {
  try {
    const entries = (context(key) as { default: unknown }).default;
    if (!Array.isArray(entries)) throw new Error("index.ts must export default an array of defineVideo(...)");
    return entries as VideoEntry[];
  } catch (e) {
    // One video with a stale voice.json must not hide the others; render.ts reports it by name.
    console.error(`Skipping ${key}: ${(e as Error).message}`);
    return [];
  }
};

export const videos: VideoEntry[] = context.keys().flatMap(load);
