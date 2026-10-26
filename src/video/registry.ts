import { videoSchema, voiceManifestSchema } from "./schema";
import { buildTimeline, type Timeline } from "./timeline";

export type VideoProps = { videoId: string; timeline: Timeline };

export type VideoEntry = {
  /** Composition id and out/ folder name. */
  id: string;
  /** Video whose audio this composition plays (variants of one video share narration). */
  videoId: string;
  title: string;
  width: number;
  height: number;
  timeline: Timeline;
  Component: React.FC<VideoProps>;
};

/** One composition from a video's video.json, the voice.json written by `pnpm voice`, and its scene component. */
export const defineVideo = (specJson: unknown, voiceJson: unknown, Component: VideoEntry["Component"], variant?: string): VideoEntry => {
  const spec = videoSchema.parse(specJson);
  const voice = voiceManifestSchema.parse(voiceJson);
  return {
    id: variant ? `${spec.id}-${variant}` : spec.id,
    videoId: spec.id,
    title: spec.title,
    width: spec.width,
    height: spec.height,
    timeline: buildTimeline(spec, voice),
    Component,
  };
};
