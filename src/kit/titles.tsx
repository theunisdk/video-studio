// Scene title treatments. `Headline` in overlay.tsx is the "banner"; the others are here.
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { TitleTreatment } from "../video/design";
import type { TimedScene } from "../video/timeline";
import { visibleBetween } from "./anim";
import { alpha } from "./color";
import { useDesign, useMotion } from "./design";
import { entrance, exit } from "./motion";
import { Headline } from "./overlay";
import { useTheme } from "./theme";
import { contentArea } from "./zones";

/**
 * Frame from which a "hero" or "kinetic" title has left the centre of the frame, so scene content can enter.
 * For the other treatments it is the scene start.
 */
export const titleClear = (scene: TimedScene, fps: number, treatment: TitleTreatment): number =>
  treatment === "hero" || treatment === "kinetic"
    ? scene.from + Math.min(Math.round(2.6 * fps), Math.round(scene.durationInFrames * 0.45))
    : scene.from;

/** The treatment a scene's title uses: its own override, else the design's, else the banner. */
export const useTitleTreatment = (scene: TimedScene): TitleTreatment => {
  const d = useDesign();
  return scene.title ?? d?.title ?? "banner";
};

/** The area this scene's content may use: clear of its title, the captions and the logo. */
export const useContentArea = (scene: TimedScene, margin = 40) => {
  const d = useDesign();
  const { width, height } = useVideoConfig();
  return contentArea(useTitleTreatment(scene), d?.caption ?? "pill", { width, height, margin, logo: d?.logo });
};

/**
 * A scene's kicker and headline in the design's title treatment (or `treatment`).
 * `badge` is the banner's round badge and the rail's large number; it defaults to the scene number.
 */
export const Title: React.FC<{ scene: TimedScene; treatment?: TitleTreatment; badge?: string; color?: string }> = ({ scene, treatment, badge, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = useDesign();
  const t = useTheme();
  const m = useMotion();
  const sceneTreatment = useTitleTreatment(scene);
  const kind = treatment ?? sceneTreatment;
  const accent = color ?? d?.palette.accent ?? t.fg;
  const label = badge ?? String(scene.index + 1);
  const scale = d?.type.titleScale ?? 1;
  const titleType: React.CSSProperties = {
    fontFamily: t.fonts.display,
    fontWeight: d?.weights.display ?? 700,
    textTransform: d?.type.titleCase === "upper" ? "uppercase" : "none",
    letterSpacing: `${d?.type.titleTracking ?? 0}em`,
    color: t.fg,
  };
  const kickerType: React.CSSProperties = {
    font: `${d?.weights.bodyBold ?? 800} ${Math.round(21 * scale)}px ${t.fonts.body}`,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: accent,
  };
  const end = scene.from + scene.durationInFrames;
  const start = scene.from + 6;

  if (kind === "none" || frame < scene.from - 1 || frame >= end) return null;
  if (kind === "banner") return <Headline scene={scene} badge={label} color={accent} />;

  if (kind === "hero" || kind === "kinetic") {
    const clear = titleClear(scene, fps, kind);
    const leave = clear - Math.max(6, Math.round(m.duration * 0.6));
    if (frame >= clear) return null;
    const out = exit(m, frame, leave);
    if (kind === "hero") {
      return (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26, padding: "0 200px", textAlign: "center", ...out }}>
          {scene.kicker && <div style={{ ...kickerType, ...entrance(m, frame, fps, start) }}>{scene.kicker}</div>}
          {scene.headline && <div style={{ ...titleType, fontSize: Math.round(88 * scale), lineHeight: 1.08, maxWidth: 1500, ...entrance(m, frame, fps, start, 1) }}>{scene.headline}</div>}
          <div style={{ width: 120, height: Math.max(3, d?.shape.stroke ?? 3) * 2, background: accent, borderRadius: 4, ...entrance(m, frame, fps, start, 2) }} />
        </div>
      );
    }
    const words = (scene.headline || scene.kicker).split(/\s+/).filter(Boolean);
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexWrap: "wrap", alignContent: "center", justifyContent: "center", gap: "0 0.32em", padding: "0 140px", ...titleType, fontSize: Math.round((words.length > 6 ? 108 : 148) * scale), lineHeight: 1.02, ...out }}>
        {words.map((w, i) => (
          <span key={i} style={{ display: "inline-block", color: i === words.length - 1 ? accent : t.fg, ...entrance(m, frame, fps, start, i) }}>
            {w}
          </span>
        ))}
      </div>
    );
  }

  const o = visibleBetween(frame, scene.from + 4, end, 12);
  if (kind === "lowerThird") {
    return (
      <div style={{ position: "absolute", left: 96, bottom: 200, display: "flex", alignItems: "stretch", opacity: o, maxWidth: 1300, ...entrance(m, frame, fps, start) }}>
        <div style={{ width: 10, background: accent, borderRadius: Math.min(5, d?.shape.radius ?? 5), flex: "none" }} />
        <div style={{ background: alpha(d?.palette.surface ?? t.panel, 0.94), padding: "18px 30px 20px", borderRadius: `0 ${d?.shape.radius ?? 12}px ${d?.shape.radius ?? 12}px 0`, boxShadow: t.caption.shadow }}>
          {scene.kicker && <div style={{ ...kickerType, fontSize: Math.round(19 * scale) }}>{scene.kicker}</div>}
          {scene.headline && <div style={{ ...titleType, fontSize: Math.round(42 * scale), lineHeight: 1.18, marginTop: scene.kicker ? 6 : 0 }}>{scene.headline}</div>}
        </div>
      </div>
    );
  }

  // rail: a full-height panel on the left. The panel stays solid across scenes; only its text changes.
  return (
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 440, background: d?.palette.surface ?? t.panel, borderRight: `${Math.max(1, d?.shape.stroke ?? 1)}px solid ${t.line}`, padding: "96px 56px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ opacity: o, display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ ...titleType, color: accent, fontSize: Math.round(112 * scale), lineHeight: 1, ...entrance(m, frame, fps, start) }}>{/^\d$/.test(label) ? `0${label}` : label}</div>
        {scene.kicker && <div style={{ ...kickerType, ...entrance(m, frame, fps, start, 1) }}>{scene.kicker}</div>}
        {scene.headline && <div style={{ ...titleType, fontSize: Math.round(44 * scale), lineHeight: 1.18, ...entrance(m, frame, fps, start, 2) }}>{scene.headline}</div>}
      </div>
    </div>
  );
};

/** One Title per scene, for videos whose every scene uses the design's treatment. */
export const Titles: React.FC<{ scenes: TimedScene[]; color?: string }> = ({ scenes, color }) => (
  <>
    {scenes.map((s) => (
      <Title key={s.id} scene={s} color={color} />
    ))}
  </>
);
