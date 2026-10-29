// Screenshot walkthroughs: real captures in a browser frame, with a camera that eases onto each step's target,
// a cursor that travels to it, a click ring, a soft spotlight and a callout. Only real screenshots show app UI.
import { Img, staticFile, useCurrentFrame } from "remotion";
import { lerp, ramp } from "./anim";
import { useTheme } from "./theme";
import { useKit, type BrowserColors } from "./tokens";

export type Box = { x: number; y: number; width: number; height: number };

export type CaptureStep = {
  id: string;
  shot: string;
  target: Box | null;
  action: string;
  label: string;
};

export type CaptureManifest = {
  viewport: { width: number; height: number };
  steps: CaptureStep[];
};

/** One step on screen: which capture step, when, and how close the camera goes. */
export type Beat = { step: number; from: number; duration: number; zoom?: number; callout?: string | null; quiet?: boolean };

type Camera = { cx: number; cy: number; zoom: number };

const cameraFor = (step: CaptureStep | undefined, zoom: number, vw: number, vh: number): Camera => {
  if (!step?.target || zoom <= 1) return { cx: vw / 2, cy: vh / 2, zoom: Math.max(1, zoom) };
  const t = step.target;
  const halfW = vw / (2 * zoom);
  const halfH = vh / (2 * zoom);
  return {
    cx: Math.min(vw - halfW, Math.max(halfW, t.x + t.width / 2)),
    cy: Math.min(vh - halfH, Math.max(halfH, t.y + t.height / 2)),
    zoom,
  };
};

const Cursor: React.FC<{ c: BrowserColors }> = ({ c }) => (
  <svg width="34" height="40" viewBox="0 0 34 40" style={{ display: "block", filter: "drop-shadow(0 3px 6px rgba(0,0,0,.35))" }}>
    <path d="M3 2 L3 31 L10.5 24.5 L15.5 36 L21 33.5 L16 22.5 L26 22 Z" fill={c.cursorFill} stroke={c.cursorStroke} strokeWidth="2.4" strokeLinejoin="round" />
  </svg>
);

/**
 * Plays `beats` over the captured screenshots inside a browser frame at (x, y) with the given width.
 * `shotsDir` is the staticFile folder holding the PNGs named in the manifest.
 * `frame` picks the chrome: a light browser (default), a dark browser, or "none" for the bare screenshot.
 */
export const Walkthrough: React.FC<{
  manifest: CaptureManifest;
  shotsDir: string;
  beats: Beat[];
  x: number;
  y: number;
  width: number;
  accent: string;
  title?: string;
  appear?: number;
  frame?: "light" | "dark" | "none";
  /** Corner radius of the frame; 18 by default. */
  radius?: number;
}> = ({ manifest, shotsDir, beats, x, y, width, accent, title = "", appear = 1, frame: chrome = "light", radius = 18 }) => {
  const frame = useCurrentFrame();
  const t = useTheme();
  const kit = useKit();
  const c = chrome === "dark" ? kit.browserDark : kit.browser;
  const { width: vw, height: vh } = manifest.viewport;
  const bar = chrome === "none" ? 0 : 44;
  const height = (width * vh) / vw;
  const s = width / vw;

  // Current beat and the one before it (for crossfades, camera and cursor travel).
  let i = beats.findIndex((b, k) => frame >= b.from && (k === beats.length - 1 || frame < beats[k + 1].from));
  if (i < 0) i = frame < (beats[0]?.from ?? 0) ? 0 : beats.length - 1;
  const beat = beats[i];
  const prev = i > 0 ? beats[i - 1] : undefined;
  const step = manifest.steps[beat.step];
  const prevStep = prev ? manifest.steps[prev.step] : undefined;
  const local = frame - beat.from;
  const move = ramp(frame, beat.from, Math.min(24, beat.duration * 0.35));

  const camFrom = cameraFor(prevStep, prev?.zoom ?? 1, vw, vh);
  const camTo = cameraFor(step, beat.zoom ?? 1, vw, vh);
  const cam: Camera = prev
    ? { cx: lerp(camFrom.cx, camTo.cx, move), cy: lerp(camFrom.cy, camTo.cy, move), zoom: lerp(camFrom.zoom, camTo.zoom, move) }
    : camTo;
  const left = cam.cx - vw / (2 * cam.zoom);
  const top = cam.cy - vh / (2 * cam.zoom);
  const toScreen = (px: number, py: number) => ({ x: (px - left) * cam.zoom * s, y: (py - top) * cam.zoom * s });

  const fade = prev && prev.step !== beat.step ? ramp(frame, beat.from, 10) : 1;

  // Cursor travels from the previous target to this one, then clicks.
  const centre = (b: Box | null | undefined) => (b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 + Math.min(8, b.height / 4) } : { x: vw / 2, y: vh / 2 });
  const from = centre(prevStep?.target);
  const to = centre(step?.target);
  const travel = ramp(frame, beat.from + 4, Math.min(26, beat.duration * 0.4));
  const cursorPt = toScreen(lerp(from.x, to.x, travel), lerp(from.y, to.y, travel));
  const clicks = step?.action === "click" || step?.action === "check" || step?.action === "type";
  const clickAt = beat.from + Math.min(34, Math.round(beat.duration * 0.5));
  const ring = clicks ? Math.max(0, Math.min(1, (frame - clickAt) / 14)) : 0;
  const showCursor = step?.target && step.action !== "observe" && !beat.quiet;

  const spot = step?.target && !beat.quiet ? ramp(frame, beat.from + Math.min(26, beat.duration * 0.4), 10) : 0;
  const tb = step?.target ? { ...toScreen(step.target.x, step.target.y), w: step.target.width * cam.zoom * s, h: step.target.height * cam.zoom * s } : null;
  const callout = beat.callout === null ? null : beat.callout ?? step?.label;
  const calloutBelow = tb ? tb.y + tb.h + 70 < height : true;

  const img = (shot: string, opacity: number) => (
    <Img
      src={staticFile(`${shotsDir}/${shot}`)}
      style={{
        position: "absolute", left: -left * cam.zoom * s, top: -top * cam.zoom * s,
        width: vw * cam.zoom * s, height: vh * cam.zoom * s, opacity,
      }}
    />
  );

  return (
    <div
      style={{
        position: "absolute", left: x, top: y, width, height: height + bar, borderRadius: radius, overflow: "hidden",
        background: c.frame, boxShadow: c.shadow,
        opacity: appear, transform: `translateY(${(1 - appear) * 30}px)`,
      }}
    >
      {bar > 0 && (
        <div style={{ height: bar, background: c.bar, display: "flex", alignItems: "center", gap: 9, padding: "0 18px", borderBottom: `1px solid ${c.barLine}` }}>
          {c.dots.map((d) => (
            <div key={d} style={{ width: 13, height: 13, borderRadius: 7, background: d }} />
          ))}
          <div style={{ marginLeft: 18, flex: 1, maxWidth: 420, height: 26, borderRadius: 8, background: c.url, display: "flex", alignItems: "center", padding: "0 12px", font: `700 15px ${t.fonts.body}`, color: c.urlText ?? t.muted }}>
            {title}
          </div>
        </div>
      )}
      <div style={{ position: "relative", width, height, overflow: "hidden", background: c.frame }}>
        {prevStep && fade < 1 && img(prevStep.shot, 1)}
        {step && img(step.shot, fade)}
        {tb && spot > 0 && (
          <div
            style={{
              position: "absolute", left: tb.x - 8, top: tb.y - 8, width: tb.w + 16, height: tb.h + 16, borderRadius: 12,
              border: `3px solid ${accent}`, boxShadow: `0 0 0 4000px rgba(${c.spotlight},${0.22 * spot})`, opacity: spot,
            }}
          />
        )}
        {tb && callout && spot > 0 && (
          <div
            style={{
              position: "absolute", left: Math.min(width - 20, Math.max(20, tb.x + tb.w / 2)), top: calloutBelow ? tb.y + tb.h + 18 : tb.y - 18,
              transform: `translate(-50%, ${calloutBelow ? "0" : "-100%"}) translateX(${tb.x + tb.w / 2 < 220 ? "40%" : tb.x + tb.w / 2 > width - 220 ? "-40%" : "0"})`,
              background: accent, color: c.calloutText, font: `800 24px ${t.fonts.body}`, padding: "10px 18px", borderRadius: 12,
              whiteSpace: "nowrap", opacity: spot, boxShadow: `0 10px 26px rgba(${c.spotlight},0.25)`,
            }}
          >
            {callout}
          </div>
        )}
        {showCursor && local >= 0 && (
          <>
            {ring > 0 && ring < 1 && (
              <div
                style={{
                  position: "absolute", left: cursorPt.x, top: cursorPt.y, width: 70, height: 70, marginLeft: -35, marginTop: -35, borderRadius: 35,
                  border: `4px solid ${accent}`, transform: `scale(${0.3 + ring})`, opacity: 1 - ring,
                }}
              />
            )}
            <div style={{ position: "absolute", left: cursorPt.x - 4, top: cursorPt.y - 3, transform: `scale(${frame >= clickAt && frame < clickAt + 5 ? 0.85 : 1})` }}><Cursor c={c} /></div>
          </>
        )}
      </div>
    </div>
  );
};

/** Spreads a scene's steps across its length, starting each at its phrase when one is given. */
export const scheduleBeats = (
  sceneFrom: number,
  sceneDuration: number,
  items: { step: number; zoom?: number; at?: number; callout?: string | null; quiet?: boolean }[],
  lead = 8,
): Beat[] => {
  const start = sceneFrom + lead;
  const end = sceneFrom + sceneDuration;
  const even = (end - start) / items.length;
  const starts = items.map((it, k) => Math.round(it.at ?? start + k * even));
  for (let k = 1; k < starts.length; k++) starts[k] = Math.max(starts[k], starts[k - 1] + 24);
  starts[0] = Math.min(starts[0], start);
  return items.map((it, k) => ({
    step: it.step,
    zoom: it.zoom,
    callout: it.callout,
    quiet: it.quiet,
    from: starts[k],
    duration: (k + 1 < items.length ? starts[k + 1] : end) - starts[k],
  }));
};
