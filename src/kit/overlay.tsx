import { Html5Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { buildCues } from "../video/captions";
import type { TimedScene, Timeline } from "../video/timeline";
import { pop, ramp, visibleBetween } from "./anim";
import type { Vec3 } from "./camera";
import { useProject, useProjectIfStaged } from "./Stage";
import { useTheme } from "./theme";

/** One audio track per scene, placed where the timeline says narration starts. */
export const NarrationAudio: React.FC<{ videoId: string; timeline: Timeline }> = ({ videoId, timeline }) => (
  <>
    {timeline.scenes.map((s) => (
      <Sequence key={s.id} from={s.audioFrom} durationInFrames={Math.ceil(s.audioSeconds * timeline.fps) + 2} layout="none">
        <Html5Audio src={staticFile(`${videoId}/audio/${s.audioFile}`)} />
      </Sequence>
    ))}
  </>
);

/** Top-left scene heading: badge, kicker and one-line headline. */
export const Headline: React.FC<{ scene: TimedScene; badge: string; color: string }> = ({ scene, badge, color }) => {
  const frame = useCurrentFrame();
  const t = useTheme();
  const o = visibleBetween(frame, scene.from + 6, scene.from + scene.durationInFrames, 14);
  if (o <= 0) return null;
  const slide = (1 - ramp(frame, scene.from + 6, 18)) * 24;
  return (
    <div style={{ position: "absolute", left: 96, top: 72, display: "flex", gap: 28, alignItems: "center", opacity: o, transform: `translateX(${-slide}px)` }}>
      <div
        style={{
          width: 92, height: 92, borderRadius: 46, background: color, color: t.onAccent, flex: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          font: `700 38px ${t.fonts.display}`, boxShadow: `0 0 40px ${color}55`,
        }}
      >
        {badge}
      </div>
      <div>
        <div style={{ font: `800 21px ${t.fonts.body}`, letterSpacing: "0.14em", textTransform: "uppercase", color }}>{scene.kicker}</div>
        <div style={{ font: `700 46px/1.2 ${t.fonts.display}`, color: t.fg, maxWidth: 1500, textShadow: t.labelShadow }}>{scene.headline}</div>
      </div>
    </div>
  );
};

/** Burned-in subtitles from the same cues that build captions.srt. */
export const Captions: React.FC<{ timeline: Timeline }> = ({ timeline }) => {
  const frame = useCurrentFrame();
  const t = useTheme();
  const cue = buildCues(timeline).find((c) => frame >= c.startFrame && frame < c.endFrame);
  if (!cue) return null;
  const o = Math.min(ramp(frame, cue.startFrame, 4), 1 - ramp(frame, cue.endFrame - 4, 4));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 56, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ background: t.caption.bg, border: `1px solid ${t.caption.border}`, boxShadow: t.caption.shadow, borderRadius: 14, padding: "14px 28px", font: `400 36px/1.3 ${t.fonts.body}`, color: t.caption.fg, maxWidth: 1400, textAlign: "center" }}>
        {cue.text}
      </div>
    </div>
  );
};

/** Text pinned under/over a 3D point. */
export const Label: React.FC<{
  at: Vec3;
  title?: string;
  sub?: string;
  mono?: string;
  monoColor?: string;
  color?: string;
  opacity: number;
  size?: "lg" | "sm";
}> = ({ at, title, sub, mono, monoColor, color, opacity, size = "lg" }) => {
  const t = useTheme();
  const project = useProject();
  const { width } = useVideoConfig();
  const p = project(at);
  // Fade labels whose anchor drifts toward the frame edge so they never appear cut off.
  const edge = Math.min(1, Math.max(0, (Math.min(p.x, width - p.x) - 160) / 140));
  const o = opacity * edge;
  if (o <= 0 || !p.inFront) return null;
  return (
    <div style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%, 0)", textAlign: "center", opacity: o, whiteSpace: "nowrap" }}>
      {title && <div style={{ font: `700 ${size === "lg" ? 38 : 24}px ${t.fonts.display}`, color: color ?? t.fg, textShadow: t.labelShadow }}>{title}</div>}
      {sub && <div style={{ font: `400 ${size === "lg" ? 22 : 20}px ${t.fonts.mono}`, color: t.muted, marginTop: 4, textShadow: t.labelShadow }}>{sub}</div>}
      {mono && <div style={{ font: `400 22px ${t.fonts.mono}`, color: monoColor ?? t.muted, marginTop: 4, textShadow: t.labelShadow }}>{mono}</div>}
    </div>
  );
};

export type ChatMessage = {
  from: "me" | "bot";
  at: number;
  /** text (default), photo tile, voice-note pill, or text with reply buttons */
  kind?: "text" | "photo" | "voice" | "buttons";
  text?: string;
  buttons?: string[];
  /** Frame at which the first button is tapped. */
  tappedAt?: number;
  /** Frame at which a reply-button bubble's buttons are checked off (e.g. review done). */
  doneAt?: number;
};

/** A phone drawn in HTML, sized and placed from a 3D anchor so it sits in the world. */
export const Phone: React.FC<{
  /** World anchor (sized by heightUnits) ... */
  at?: Vec3;
  heightUnits?: number;
  /** ... or a fixed screen position in px (centre) and height. */
  screen?: { x: number; y: number; height: number };
  color: string;
  appear: number;
  tabs?: string[];
  activeTab?: number;
  /** Chat name shown in the header when there are no tabs. */
  title?: string;
  messages: ChatMessage[];
  typingFrom?: number;
  typingUntil?: number;
  /** Width as a fraction of height. */
  aspect?: number;
}> = ({ at, heightUnits = 4, screen, color, appear, tabs = [], activeTab = 0, title, messages, typingFrom, typingUntil, aspect = 0.52 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const project = useProjectIfStaged();
  const t = useTheme();
  const colors = { bg: t.phone.screen, line: t.line, fg: t.phone.themText, muted: t.muted, panel: t.phone.them };
  const fonts = t.fonts;
  if (appear <= 0.001) return null;
  if (!screen && !at) throw new Error("Phone needs `at` or `screen`");
  if (at && !project) throw new Error("Phone `at` needs a <Stage>; use `screen` in 2D scenes");
  const anchored = at && project ? project(at) : null;
  const p = screen ?? { x: anchored!.x, y: anchored!.y };
  const h = screen ? screen.height : heightUnits * anchored!.pxPerUnit;
  const w = h * aspect;
  const k = h / 440;
  const typing = typingFrom !== undefined && typingUntil !== undefined && frame >= typingFrom && frame < typingUntil;
  return (
    <div
      style={{
        position: "absolute", left: p.x - w / 2, top: p.y - h / 2, width: w, height: h,
        borderRadius: 44 * k, border: `${t.phone.glow ? 3 * k : 9 * k}px solid ${t.phone.glow ? color : t.phone.body}`, background: t.phone.screen,
        boxShadow: t.phone.glow ? `0 0 ${40 * k}px ${color}66, inset 0 0 ${30 * k}px ${color}22` : `0 ${24 * k}px ${60 * k}px rgba(34,49,58,0.28)`,
        opacity: appear, transform: `translateY(${(1 - appear) * 60}px) scale(${0.9 + 0.1 * appear})`,
        overflow: "hidden", display: "flex", flexDirection: "column", padding: 18 * k, boxSizing: "border-box",
      }}
    >
      <div style={{ width: 70 * k, height: 8 * k, borderRadius: 4 * k, background: colors.line, alignSelf: "center", marginBottom: 18 * k }} />
      {title && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 * k, paddingBottom: 10 * k, borderBottom: `${1.5 * k}px solid ${colors.line}` }}>
          <div style={{ width: 30 * k, height: 30 * k, borderRadius: 99, background: color, color: t.onAccent, display: "flex", alignItems: "center", justifyContent: "center", font: `700 ${15 * k}px ${fonts.display}` }}>{title[0]}</div>
          <div style={{ font: `800 ${19 * k}px ${fonts.body}`, color: t.phone.header }}>{title}</div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8 * k, justifyContent: "center" }}>
        {tabs.map((t, i) => (
          <div key={t} style={{ font: `700 ${17 * k}px ${fonts.body}`, padding: `${6 * k}px ${12 * k}px`, borderRadius: 99, background: i === activeTab ? color : "transparent", color: i === activeTab ? colors.bg : colors.muted, border: `${1.5 * k}px solid ${i === activeTab ? color : colors.line}` }}>
            {t}
          </div>
        ))}
      </div>
      {/* Bottom-anchored and clipped at the top, like a chat that scrolls as messages arrive. */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 10 * k }}>
        {messages.map((m, i) => {
          const s = pop(frame, fps, m.at);
          if (s <= 0.001) return null;
          const mine = m.from === "me";
          const bubble: React.CSSProperties = {
            alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "84%", background: mine ? (t.phone.me ?? color) : colors.panel, color: mine ? (t.phone.meText ?? t.onAccent) : colors.fg,
            boxShadow: t.phone.glow ? "none" : `0 ${1 * k}px ${2 * k}px rgba(0,0,0,0.08)`,
            font: `700 ${21 * k}px/1.25 ${fonts.body}`, padding: `${10 * k}px ${14 * k}px`, borderRadius: 16 * k,
            opacity: Math.min(1, s), transform: `scale(${0.7 + 0.3 * Math.min(1, s)})`, transformOrigin: mine ? "right bottom" : "left bottom",
          };
          if (m.kind === "photo") {
            return (
              <div key={i} style={{ ...bubble, padding: 6 * k }}>
                <div style={{ width: 150 * k, height: 104 * k, borderRadius: 11 * k, background: t.phone.glow ? `linear-gradient(135deg, ${colors.bg}cc, ${colors.line})` : "linear-gradient(135deg, #f4d9c6, #e9b9a0 60%, #d99a85)", display: "flex", alignItems: "flex-end", padding: 8 * k, boxSizing: "border-box", font: `800 ${15 * k}px ${fonts.body}`, color: t.phone.glow ? colors.fg : "#4a2a20" }}>
                  {m.text ?? "Photo"}
                </div>
              </div>
            );
          }
          if (m.kind === "voice") {
            return (
              <div key={i} style={{ ...bubble, display: "flex", alignItems: "center", gap: 8 * k }}>
                <div style={{ width: 0, height: 0, borderTop: `${8 * k}px solid transparent`, borderBottom: `${8 * k}px solid transparent`, borderLeft: `${13 * k}px solid currentColor` }} />
                <div style={{ display: "flex", alignItems: "center", gap: 3 * k }}>
                  {Array.from({ length: 14 }, (_, b) => (
                    <div key={b} style={{ width: 3 * k, height: (6 + 14 * Math.abs(Math.sin(b * 1.7))) * k, borderRadius: 2 * k, background: "currentColor", opacity: 0.8 }} />
                  ))}
                </div>
                <span style={{ font: `700 ${15 * k}px ${fonts.mono}` }}>{m.text ?? "0:12"}</span>
              </div>
            );
          }
          const tapped = m.tappedAt !== undefined && frame >= m.tappedAt;
          const done = m.doneAt !== undefined && frame >= m.doneAt;
          return (
            <div key={i} style={{ alignSelf: bubble.alignSelf, maxWidth: "84%", display: "flex", flexDirection: "column", gap: 6 * k, opacity: bubble.opacity, transform: bubble.transform, transformOrigin: bubble.transformOrigin }}>
              <div style={{ ...bubble, opacity: 1, transform: "none", alignSelf: "stretch", maxWidth: "none" }}>{m.text}</div>
              {m.kind === "buttons" &&
                (m.buttons ?? []).map((b, bi) => (
                  <div key={b} style={{ font: `800 ${18 * k}px ${fonts.body}`, textAlign: "center", padding: `${8 * k}px`, borderRadius: 12 * k, border: `${1.5 * k}px solid ${color}`, background: (bi === 0 && tapped) || done ? color : t.phone.glow ? "transparent" : "#ffffff", color: (bi === 0 && tapped) || done ? t.onAccent : color }}>
                    {done ? `✓ ${b}` : b}
                  </div>
                ))}
            </div>
          );
        })}
        {typing && (
          <div style={{ alignSelf: "flex-start", background: colors.panel, borderRadius: 16 * k, padding: `${10 * k}px ${16 * k}px`, display: "flex", gap: 6 * k }}>
            {[0, 1, 2].map((d) => (
              <div key={d} style={{ width: 8 * k, height: 8 * k, borderRadius: 99, background: colors.muted, opacity: 0.4 + 0.6 * Math.max(0, Math.sin((frame - d * 4) * 0.3)) }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/** Small coloured pill, used for part lists on title and recap cards. */
export const Chip: React.FC<{ label: string; color: string; appear: number; index?: number }> = ({ label, color, appear, index }) => {
  const t = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 26px", borderRadius: 99, border: `2px solid ${color}`, background: t.phone.glow ? `${color}14` : "rgba(255,255,255,0.92)", boxShadow: t.caption.shadow, opacity: Math.min(1, appear), transform: `translateY(${(1 - Math.min(1, appear)) * 30}px)` }}>
      {index !== undefined && <span style={{ font: `700 22px ${t.fonts.display}`, color }}>{index}</span>}
      <span style={{ font: `700 28px ${t.fonts.body}`, color: t.fg }}>{label}</span>
    </div>
  );
};
