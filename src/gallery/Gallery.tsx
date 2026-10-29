import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { TimedScene } from "../video/timeline";
import { Backdrop } from "../kit/backdrop";
import { mix } from "../kit/color";
import { Designed, surfaceStyle, useMotion, useRequiredDesign } from "../kit/design";
import { entrance, motionRamp, motionSpring } from "../kit/motion";
import { Captions } from "../kit/overlay";
import { titleClear, Titles, useContentArea, useTitleTreatment } from "../kit/titles";
import { SceneTrack } from "../kit/transitions";
import { Walkthrough, scheduleBeats, type CaptureManifest } from "../kit/walkthrough";
import { galleryCells } from "./cells";
import { galleryTimelines } from "./timelines";

const manifest: CaptureManifest = {
  viewport: { width: 1440, height: 900 },
  steps: [{ id: "repo", shot: "01-theunisdk-video-studio.png", target: { x: 330, y: 300, width: 520, height: 60 }, action: "click", label: "The README" }],
};

/** Three cards entering with the design's motion, inside the area the title and captions leave free. */
const Cards: React.FC<{ scene: TimedScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = useRequiredDesign();
  const m = useMotion();
  const treatment = useTitleTreatment(scene);
  const area = useContentArea(scene);
  const start = Math.max(scene.from + 10, titleClear(scene, fps, treatment));
  if (frame < scene.from || frame >= scene.from + scene.durationInFrames) return null;
  const w = (area.width - 2 * 36) / 3;
  return (
    <div style={{ position: "absolute", left: area.x, top: area.y, width: area.width, height: area.height, display: "flex", gap: 36, alignItems: "center" }}>
      {["Research", "Script", "Render"].map((label, i) => (
        <div key={label} style={{ ...surfaceStyle(d), width: w, height: Math.min(area.height, 380), padding: 36, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 18, ...entrance(m, frame, fps, start, i) }}>
          <div style={{ width: 56, height: 56, borderRadius: Math.min(28, d.shape.radius), background: d.accents[i % d.accents.length] }} />
          <div style={{ font: `${d.weights.display} 40px ${d.families.display}`, color: d.palette.fg }}>{label}</div>
          {[0.9, 0.7, 0.8].map((f, k) => (
            <div key={k} style={{ height: 14, width: `${f * 100}%`, borderRadius: 7, background: d.palette.line }} />
          ))}
        </div>
      ))}
    </div>
  );
};

/** A full-frame picture per scene, so a transition shows which scene is which. */
const Panel: React.FC<{ scene: TimedScene }> = ({ scene }) => {
  const d = useRequiredDesign();
  const tint = scene.index % 2 ? mix(d.palette.bg, d.palette.accent, 0.35) : d.palette.bg;
  return (
    <AbsoluteFill style={{ background: tint, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
      <div style={{ font: `${d.weights.display} 300px/1 ${d.families.display}`, color: scene.index % 2 ? d.palette.surface : d.palette.accent }}>{scene.index % 2 ? "B" : "A"}</div>
      <div style={{ font: `${d.weights.display} 48px ${d.families.display}`, color: d.palette.fg }}>{scene.headline}</div>
    </AbsoluteFill>
  );
};

/** One preset: its ramp and spring curves, and five cards entering staggered at the current frame. */
const MotionDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = useRequiredDesign();
  const m = useMotion();
  const span = 45;
  const plot = (f: (x: number) => number) =>
    Array.from({ length: span + 1 }, (_, x) => `${40 + (x / span) * 640},${360 - f(x) * 260}`).join(" ");
  return (
    <AbsoluteFill style={{ padding: 120, flexDirection: "row", gap: 80, alignItems: "center" }}>
      <div style={{ ...surfaceStyle(d), width: 720, height: 460, position: "relative" }}>
        <svg width={720} height={420} style={{ position: "absolute", top: 20 }}>
          <line x1={40} x2={680} y1={100} y2={100} stroke={d.palette.line} strokeDasharray="6 8" />
          <line x1={40} x2={680} y1={360} y2={360} stroke={d.palette.line} />
          <polyline points={plot((x) => motionRamp(m, x, 0))} fill="none" stroke={d.palette.accent} strokeWidth={5} />
          <polyline points={plot((x) => motionSpring(m, x, fps, 0))} fill="none" stroke={d.accents[1] ?? d.palette.fg} strokeWidth={3} strokeDasharray="10 8" />
        </svg>
        <div style={{ position: "absolute", left: 40, bottom: 24, font: `600 24px ${d.families.mono}`, color: d.palette.muted }}>
          ramp {m.duration}f · spring (dashed) · stagger {m.stagger}f · entrance {m.entrance}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{ ...surfaceStyle(d, 0.5), width: 640, height: 92, display: "flex", alignItems: "center", padding: "0 28px", boxSizing: "border-box", font: `${d.weights.display} 34px ${d.families.display}`, color: d.palette.fg, ...entrance(m, frame, fps, 6, i) }}>
            Item {i + 1}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Tag: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ position: "absolute", right: 24, top: 20, background: "#111111", color: "#ffe14d", font: "600 24px monospace", padding: "8px 16px", borderRadius: 6 }}>{label}</div>
);

/** Studio preview and still source for `pnpm gallery`: pick a cell id from src/gallery/cells.ts. */
export const Gallery: React.FC<{ cell: string }> = ({ cell }) => {
  const c = galleryCells.find((x) => x.id === cell) ?? galleryCells[0];
  const timeline = galleryTimelines[c.narration];
  const scenes = timeline.scenes.slice(0, 2);
  return (
    <Designed videoId={c.narration === "timed" ? "getting-started" : "openclaw"} design={c.design}>
      <AbsoluteFill>
        {c.kind === "transition" ? (
          <SceneTrack timeline={{ ...timeline, scenes }} opaque render={(s) => <Panel scene={s} />} />
        ) : (
          <Backdrop />
        )}
        {c.kind === "scene" && scenes.map((s) => <Cards key={s.id} scene={s} />)}
        {c.kind === "motion" && <MotionDemo />}
        {c.kind === "browser" && (
          <Walkthrough manifest={manifest} shotsDir="getting-started/research" beats={scheduleBeats(scenes[0].from, scenes[0].durationInFrames, [{ step: 0, zoom: 1.25 }])} x={370} y={110} width={1180} accent={c.design.palette.accent} title="github.com" frame={c.browser} radius={c.design.shape.radius} />
        )}
        {c.kind === "scene" && <Titles scenes={scenes} />}
        {c.kind !== "motion" && <Captions timeline={timeline} />}
        <Tag label={c.label} />
      </AbsoluteFill>
    </Designed>
  );
};
