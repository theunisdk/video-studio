// Caption treatments. All of them burn in the same cues that build the .srt.
import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { buildWordCues } from "../video/captions";
import type { CaptionTreatment } from "../video/design";
import type { Timeline } from "../video/timeline";
import { ramp } from "./anim";
import { alpha } from "./color";
import type { ResolvedDesign } from "./design";
import type { Theme } from "./theme";

// A tight ring of shadows in the background colour keeps plain text legible over any picture.
const ring = (color: string, px: number) =>
  [
    [px, 0], [-px, 0], [0, px], [0, -px],
    [px * 0.7, px * 0.7], [-px * 0.7, px * 0.7], [px * 0.7, -px * 0.7], [-px * 0.7, -px * 0.7],
  ]
    .map(([x, y]) => `${x}px ${y}px 0 ${color}`)
    .concat(`0 4px 22px ${alpha(color, 0.85)}`)
    .join(", ");

type Props = { timeline: Timeline; treatment: CaptionTreatment; d: ResolvedDesign | null; t: Theme };

/** Burned-in captions in one of the design's caption treatments. Highlight falls back to its plain form without word timings. */
export const DesignedCaptions: React.FC<Props> = ({ timeline, treatment, d, t }) => {
  const frame = useCurrentFrame();
  const cues = useMemo(() => buildWordCues(timeline), [timeline]);
  const cue = cues.find((c) => frame >= c.startFrame && frame < c.endFrame);
  if (!cue) return null;
  const o = Math.min(ramp(frame, cue.startFrame, 4), 1 - ramp(frame, cue.endFrame - 4, 4));
  const bg = d?.palette.bg ?? "#000000";
  const fg = d?.palette.fg ?? t.caption.fg;
  const accent = d?.palette.accent ?? t.fg;
  const body = t.fonts.body;
  const weight = d?.weights.bodyBold ?? 700;

  if (treatment === "strip") {
    return (
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, opacity: o, background: alpha(d?.palette.surface ?? bg, 0.94), borderTop: `${Math.max(2, d?.shape.stroke ?? 2)}px solid ${accent}`, padding: "26px 200px 34px", textAlign: "center", font: `${d?.weights.body ?? 400} 38px/1.3 ${body}`, color: fg }}>
        {cue.text}
      </div>
    );
  }

  if (treatment === "outline" || treatment === "highlight") {
    const shadow = ring(alpha(bg, 0.92), 3);
    // Highlight marks the word being spoken; without word timings it is the same text with no mark.
    let spoken = -1;
    if (treatment === "highlight" && cue.timed) cue.words.forEach((w, i) => w.startFrame !== null && w.startFrame <= frame && (spoken = i));
    return (
      <div style={{ position: "absolute", left: 160, right: 160, bottom: 64, display: "flex", justifyContent: "center", opacity: o }}>
        <div style={{ font: `${weight} 42px/1.32 ${body}`, color: fg, textAlign: "center", maxWidth: 1500, textShadow: shadow }}>
          {treatment === "outline"
            ? cue.text
            : cue.words.map((w, i) => (
                <span key={i}>
                  {i > 0 && " "}
                  <span
                    style={
                      i === spoken
                        ? { background: accent, color: d?.onAccent ?? t.onAccent, textShadow: "none", borderRadius: Math.min(10, d?.shape.radius ?? 8), padding: "0 0.16em", margin: "0 -0.16em" }
                        : undefined
                    }
                  >
                    {w.text}
                  </span>
                </span>
              ))}
        </div>
      </div>
    );
  }

  const radius = d ? Math.min(28, d.shape.radius) : 14;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 56, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ background: t.caption.bg, border: `1px solid ${t.caption.border}`, boxShadow: t.caption.shadow, borderRadius: radius, padding: "14px 28px", font: `${d?.weights.body ?? 400} 36px/1.3 ${body}`, color: t.caption.fg, maxWidth: 1400, textAlign: "center" }}>
        {cue.text}
      </div>
    </div>
  );
};
