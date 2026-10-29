// The demo series' intro and outro: every episode opens on the academy card and closes on the "next" card.
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { TimedScene } from "../../../src/video/timeline";
import { useDesign, useMotion } from "../../../src/kit/design";
import { entrance, exit } from "../../../src/kit/motion";

const ACADEMY = "Lanternfield Academy";

/** Holds the first `seconds` of `scene`, then wipes away; scene content should start after introEnd(). */
export const introEnd = (scene: TimedScene, fps: number, seconds = 2.4) => scene.from + Math.round(seconds * fps);

export const IntroCard: React.FC<{ scene: TimedScene; episode: number; title: string }> = ({ scene, episode, title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = useDesign()!;
  const m = useMotion();
  const end = introEnd(scene, fps);
  if (frame >= end) return null;
  return (
    <AbsoluteFill style={{ background: d.palette.fg, alignItems: "center", justifyContent: "center", gap: 28, ...exit(m, frame, end - 12) }}>
      {d.logo && <Img src={staticFile(`${d.videoId}/${d.logo.src}`)} style={{ height: 150, ...entrance(m, frame, fps, scene.from) }} />}
      <div style={{ font: `${d.weights.bodyBold} 26px ${d.families.body}`, letterSpacing: "0.2em", textTransform: "uppercase", color: d.accents[2] ?? d.palette.accent, ...entrance(m, frame, fps, scene.from, 1) }}>
        {ACADEMY} · Episode {episode}
      </div>
      <div style={{ font: `${d.weights.display} 92px/1.05 ${d.families.display}`, color: d.palette.bg, maxWidth: 1400, textAlign: "center", ...entrance(m, frame, fps, scene.from, 2) }}>
        {title}
      </div>
    </AbsoluteFill>
  );
};

/** Covers the last `seconds` of the video with the series sign-off. */
export const OutroCard: React.FC<{ scene: TimedScene; next?: string; seconds?: number }> = ({ scene, next, seconds = 2 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = useDesign()!;
  const m = useMotion();
  const start = scene.from + scene.durationInFrames - Math.round(seconds * fps);
  if (frame < start) return null;
  return (
    <AbsoluteFill style={{ background: d.palette.fg, alignItems: "center", justifyContent: "center", gap: 24, ...entrance(m, frame, fps, start) }}>
      {d.logo && <Img src={staticFile(`${d.videoId}/${d.logo.src}`)} style={{ height: 110 }} />}
      <div style={{ font: `${d.weights.display} 64px ${d.families.display}`, color: d.palette.bg }}>{ACADEMY}</div>
      {next && <div style={{ font: `${d.weights.body} 32px ${d.families.body}`, color: d.palette.line }}>Next: {next}</div>}
    </AbsoluteFill>
  );
};
