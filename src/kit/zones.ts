// Safe zones: how much of the 1920x1080 frame each title and caption treatment keeps for itself.
// Scene content goes in contentArea(...), which is what is left.
import type { CaptionTreatment, TitleTreatment } from "../video/design";

export type Zone = { top: number; right: number; bottom: number; left: number };

const none: Zone = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Space each title treatment holds for the whole scene. "hero" and "kinetic" take the full frame
 * only until titleClear(); after that they hold nothing.
 */
export const titleZones: Record<TitleTreatment, Zone> = {
  banner: { ...none, top: 200 },
  hero: none,
  lowerThird: { ...none, bottom: 330 },
  rail: { ...none, left: 480 },
  kinetic: none,
  none,
};

/** Space each caption treatment holds at the bottom of the frame. */
export const captionZones: Record<CaptionTreatment, Zone> = {
  pill: { ...none, bottom: 170 },
  strip: { ...none, bottom: 150 },
  outline: { ...none, bottom: 160 },
  highlight: { ...none, bottom: 170 },
};

/** The band a logo holds: its height plus the inset that <Logo> places it at, on its side of the frame. */
export const logoZone = (logo?: { placement: string; height: number }): Zone =>
  !logo ? none : logo.placement.startsWith("top") ? { ...none, top: logo.height + 48 } : { ...none, bottom: logo.height + 40 };

/** The rectangle left for scene content, with `margin` px of air inside it. */
export const contentArea = (
  title: TitleTreatment,
  caption: CaptionTreatment,
  { width = 1920, height = 1080, margin = 40, logo }: { width?: number; height?: number; margin?: number; logo?: { placement: string; height: number } } = {},
) => {
  const t = titleZones[title];
  const c = captionZones[caption];
  const l = logoZone(logo);
  const top = Math.max(t.top, c.top, l.top) + margin;
  const bottom = Math.max(t.bottom, c.bottom, l.bottom) + margin;
  const left = Math.max(t.left, c.left) + margin;
  const right = Math.max(t.right, c.right) + margin;
  return { x: left, y: top, width: width - left - right, height: height - top - bottom };
};
