// Motion presets: one easing, spring, stagger and entrance style per feel.
// `ramp` and `pop` in anim.ts stay as they are; these are the design-driven versions.
import type React from "react";
import { Easing, interpolate, spring, type SpringConfig } from "remotion";
import type { MotionPresetName } from "../video/design";

export type Entrance = "rise" | "slide" | "scale" | "wipe";

export type MotionPreset = {
  name: MotionPresetName;
  easing: (t: number) => number;
  /** Frames for an eased ramp (entrances, title moves, transitions' easing curve). */
  duration: number;
  spring: Partial<SpringConfig>;
  /** Frames between items that enter one after another. */
  stagger: number;
  entrance: Entrance;
  /** How far, in px, an entrance travels. */
  distance: number;
};

export const motion: Record<MotionPresetName, MotionPreset> = {
  calm: { name: "calm", easing: Easing.inOut(Easing.cubic), duration: 22, spring: { damping: 200, mass: 1 }, stagger: 7, entrance: "rise", distance: 26 },
  snappy: { name: "snappy", easing: Easing.out(Easing.exp), duration: 11, spring: { damping: 22, stiffness: 320, mass: 0.6 }, stagger: 3, entrance: "slide", distance: 70 },
  bouncy: { name: "bouncy", easing: Easing.out(Easing.back(1.8)), duration: 18, spring: { damping: 9, mass: 0.7 }, stagger: 5, entrance: "scale", distance: 40 },
  mechanical: { name: "mechanical", easing: Easing.inOut(Easing.poly(5)), duration: 14, spring: { damping: 200, stiffness: 500, overshootClamping: true }, stagger: 4, entrance: "wipe", distance: 0 },
};

/** 0 -> 1 over the preset's duration (or `duration` frames) from `start`, with the preset's easing. */
export const motionRamp = (m: MotionPreset, frame: number, start: number, duration = m.duration): number =>
  interpolate(frame, [start, start + Math.max(1, duration)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: m.easing,
  });

/** The preset's spring from `start`; can overshoot 1 for bouncy. */
export const motionSpring = (m: MotionPreset, frame: number, fps: number, start: number): number =>
  frame < start ? 0 : spring({ frame: frame - start, fps, config: m.spring });

/**
 * Style for an element entering at `start`; `index` staggers a list by the preset's stagger.
 * Spread it onto an absolutely or relatively placed element.
 */
export const entrance = (m: MotionPreset, frame: number, fps: number, start: number, index = 0): React.CSSProperties => {
  const at = start + index * m.stagger;
  if (m.entrance === "scale") {
    const s = motionSpring(m, frame, fps, at);
    return { opacity: Math.min(1, s * 1.6), transform: `scale(${0.6 + 0.4 * s})` };
  }
  const p = motionRamp(m, frame, at);
  if (m.entrance === "wipe") return { opacity: p > 0 ? 1 : 0, clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` };
  if (m.entrance === "slide") return { opacity: Math.min(1, p * 2), transform: `translateX(${(1 - p) * -m.distance}px)` };
  return { opacity: p, transform: `translateY(${(1 - p) * m.distance}px)` };
};

/** Style for an element leaving at `start` (the reverse of its entrance, shorter). */
export const exit = (m: MotionPreset, frame: number, start: number): React.CSSProperties => {
  const p = motionRamp(m, frame, start, Math.max(6, Math.round(m.duration * 0.6)));
  if (m.entrance === "wipe") return { clipPath: `inset(0 0 0 ${p * 100}%)` };
  if (m.entrance === "scale") return { opacity: 1 - p, transform: `scale(${1 - 0.1 * p})` };
  if (m.entrance === "slide") return { opacity: 1 - p, transform: `translateX(${p * m.distance}px)` };
  return { opacity: 1 - p, transform: `translateY(${-p * m.distance * 0.6}px)` };
};
