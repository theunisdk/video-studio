// Scene-to-scene transitions. Every scene keeps its timeline frames: nothing is re-timed or shifted,
// so narration and every phraseFrame() still line up. A transition only overlaps the two scenes'
// pictures for `frames` frames centred on the scene edge, which falls in the silent tail and lead-in.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { TransitionSpec } from "../video/design";
import type { TimedScene, Timeline } from "../video/timeline";
import { Backdrop } from "./backdrop";
import { useDesign, useMotion } from "./design";
import { motionRamp } from "./motion";

const crossfade: TransitionSpec = { kind: "crossfade", frames: 16, direction: "left" };

const axis = (dir: TransitionSpec["direction"]) =>
  ({ left: ["X", -1], right: ["X", 1], up: ["Y", -1], down: ["Y", 1] } as const)[dir];

/**
 * Style for the scene leaving (`incoming` false) or arriving (`incoming` true) at progress p (0..1).
 * With `opaque` scenes the leaving one stays solid under the arriving one instead of fading, so nothing shows through.
 */
export const transitionStyle = (spec: TransitionSpec, p: number, incoming: boolean, opaque = false): React.CSSProperties => {
  const q = incoming ? p : 1 - p;
  const [ax, sign] = axis(spec.direction);
  switch (spec.kind) {
    case "cut":
      return {};
    case "wipe": {
      // The arriving scene grows from the side it comes in from; the leaving one shrinks to the other side.
      const from = { left: "right", right: "left", up: "bottom", down: "top" }[spec.direction];
      const to = { right: "left", left: "right", bottom: "top", top: "bottom" }[from]!;
      const inset: Record<string, number> = { top: 0, right: 0, bottom: 0, left: 0 };
      if (incoming) inset[to] = (1 - p) * 100;
      else inset[from] = p * 100;
      return { clipPath: `inset(${inset.top}% ${inset.right}% ${inset.bottom}% ${inset.left}%)` };
    }
    case "push": {
      const offset = incoming ? (1 - p) * 100 * -sign : p * 100 * sign;
      return { transform: `translate${ax}(${offset}%)` };
    }
    case "zoom":
      return incoming
        ? { opacity: p, transform: `scale(${0.92 + 0.08 * p})` }
        : { opacity: opaque ? 1 : 1 - p, transform: `scale(${1 + 0.12 * p})` };
    case "iris": {
      const r = p * 75;
      return incoming
        ? { clipPath: `circle(${r}% at 50% 50%)` }
        : { WebkitMaskImage: `radial-gradient(circle at 50% 50%, transparent ${r}%, black ${r + 0.5}%)`, maskImage: `radial-gradient(circle at 50% 50%, transparent ${r}%, black ${r + 0.5}%)` };
    }
    default:
      return { opacity: opaque && !incoming ? 1 : q };
  }
};

/** The transition into `scene`: its own override, else `fallback`. A "cut" has no overlap. */
const into = (scene: TimedScene, fallback: TransitionSpec): TransitionSpec => scene.transition ?? fallback;

/** Overlap at the edge into scenes[i], at most half of either neighbour so a short scene still gets in and out. */
const overlapAt = (scenes: TimedScene[], i: number, spec: TransitionSpec) =>
  spec.kind === "cut" ? 0 : Math.min(spec.frames, Math.floor(scenes[i - 1].durationInFrames / 2), Math.floor(scenes[i].durationInFrames / 2));

/**
 * Renders each scene only while it is on screen and runs the transition between neighbours.
 * `render` receives the scene and should draw it with absolute frames (as every kit part does).
 * The design's Backdrop sits under the whole track; `opaque` also paints it behind every scene,
 * for pushes and wipes between different pictures.
 */
export const SceneTrack: React.FC<{
  timeline: Timeline;
  render: (scene: TimedScene) => React.ReactNode;
  /** Default transition; the design's when left out, else a crossfade. */
  transition?: TransitionSpec;
  opaque?: boolean;
}> = ({ timeline, render, transition, opaque = false }) => {
  const frame = useCurrentFrame();
  const d = useDesign();
  const m = useMotion();
  const fallback = transition ?? d?.transition ?? crossfade;
  const { scenes } = timeline;
  return (
    <AbsoluteFill>
      <Backdrop />
      {scenes.map((scene, i) => {
        const inSpec = i > 0 ? into(scene, fallback) : null;
        const next = scenes[i + 1];
        const outSpec = next ? into(next, fallback) : null;
        const inFrames = inSpec ? overlapAt(scenes, i, inSpec) : 0;
        const outFrames = outSpec ? overlapAt(scenes, i + 1, outSpec) : 0;
        const startAt = scene.from - Math.floor(inFrames / 2);
        const endAt = scene.from + scene.durationInFrames + Math.ceil(outFrames / 2);
        if (frame < startAt || frame >= endAt) return null;
        let style: React.CSSProperties = {};
        if (inSpec && inFrames > 0 && frame < startAt + inFrames) {
          style = transitionStyle(inSpec, motionRamp(m, frame, startAt, inFrames), true, opaque);
        } else if (next && outSpec && outFrames > 0 && frame >= next.from - Math.floor(outFrames / 2)) {
          style = transitionStyle(outSpec, motionRamp(m, frame, next.from - Math.floor(outFrames / 2), outFrames), false, opaque);
        }
        return (
          <AbsoluteFill key={scene.id} style={style}>
            {opaque && <Backdrop />}
            {render(scene)}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
