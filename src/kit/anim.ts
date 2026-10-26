import { Easing, interpolate, spring } from "remotion";

const ease = Easing.inOut(Easing.cubic);

/** 0 -> 1 over `duration` frames starting at `start`, eased and clamped. */
export const ramp = (frame: number, start: number, duration: number): number =>
  interpolate(frame, [start, start + Math.max(1, duration)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

/** Springy 0 -> ~1 entrance starting at `start`. */
export const pop = (frame: number, fps: number, start: number): number =>
  frame < start ? 0 : spring({ frame: frame - start, fps, config: { damping: 15, mass: 0.8 } });

/** Visible from `start` until `end`, with fades of `fade` frames on both sides. */
export const visibleBetween = (frame: number, start: number, end: number, fade = 12): number =>
  Math.min(ramp(frame, start, fade), 1 - ramp(frame, end - fade, fade));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
