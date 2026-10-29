// A video's design tokens in React: <Designed> loads its fonts and provides the theme, and kit parts
// read the tokens with useDesign(). Without a <Designed> (or with no design), everything keeps its defaults.
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import type { Design, FontToken } from "../video/design";
import { alpha, isDark, mix, readableOn } from "./color";
import { motion, type MotionPreset } from "./motion";
import { fonts as legacyFonts, ThemeContext, type Theme } from "./theme";
import { legacyKit, type KitColors } from "./tokens";

export type ResolvedDesign = Design & {
  videoId: string;
  /** CSS font-family values for each role. */
  families: { display: string; body: string; mono: string };
  /** Heaviest and lightest weight available for display and body. */
  weights: { display: number; body: number; bodyBold: number };
  dark: boolean;
  onAccent: string;
  /** Accent colours in order: palette.accent first, then palette.accents. */
  accents: string[];
  motionPreset: MotionPreset;
  theme: Theme;
};

const familyCss = (token: FontToken | undefined, generic: string, fallback: string): string =>
  token ? `"${token.family}", ${generic}` : fallback;

const tokenWeights = (token: FontToken): number[] => ("files" in token ? token.files.map((f) => f.weight) : token.weights);

/** Box shadow for surfaces at the design's shadow setting. */
export const shadowFor = (d: Pick<ResolvedDesign, "shape" | "palette" | "dark">, lift = 1): string => {
  const ink = d.dark ? "#000000" : d.palette.fg;
  switch (d.shape.shadow) {
    case "none":
      return "none";
    case "hard":
      return `${8 * lift}px ${8 * lift}px 0 ${d.palette.fg}`;
    case "glow":
      return `0 0 ${40 * lift}px ${alpha(d.palette.accent, 0.35)}`;
    default:
      return `0 ${24 * lift}px ${70 * lift}px ${alpha(ink, d.dark ? 0.45 : 0.14)}, 0 0 0 1px ${alpha(ink, 0.06)}`;
  }
};

const deriveKit = (d: Design, dark: boolean, onAccent: string): KitColors => {
  const p = d.palette;
  const chromeLight = dark ? mix(p.fg, "#ffffff", 0.6) : p.surface;
  const chromeDark = dark ? mix(p.bg, "#000000", 0.25) : mix(p.fg, p.bg, 0.08);
  const browser = (base: string, darkChrome: boolean) => ({
    frame: base,
    bar: mix(base, darkChrome ? "#ffffff" : "#000000", darkChrome ? 0.06 : 0.05),
    barLine: mix(base, darkChrome ? "#ffffff" : "#000000", darkChrome ? 0.12 : 0.1),
    url: mix(base, darkChrome ? "#ffffff" : "#000000", darkChrome ? 0.1 : 0),
    urlText: darkChrome ? mix(base, "#ffffff", 0.55) : p.muted,
    dots: legacyKit.browser.dots,
    shadow: d.shape.shadow === "none" ? `0 0 0 ${Math.max(1, d.shape.stroke)}px ${p.line}` : shadowFor({ shape: d.shape, palette: p, dark }, 1.1),
    spotlight: dark ? "0,0,0" : "20,28,36",
    calloutText: onAccent,
    cursorFill: "#ffffff",
    cursorStroke: "#1f2a30",
  });
  return {
    star: d.kit?.star ?? mix(p.fg, p.accent, 0.35),
    highlight: d.kit?.highlight ?? legacyKit.highlight,
    tracker: { idle: p.surface, onActive: onAccent },
    browser: browser(chromeLight, false),
    browserDark: browser(chromeDark, true),
    furniture: { ...legacyKit.furniture, ...d.kit?.furniture },
  };
};

/** Tokens plus everything derived from them (families, theme, motion preset). */
export const resolveDesign = (design: Design, videoId: string): ResolvedDesign => {
  const p = design.palette;
  const dark = isDark(p.bg);
  const onAccent = p.onAccent ?? readableOn(p.accent, ["#ffffff", isDark(p.fg) ? p.fg : "#111111"]);
  const families = {
    display: familyCss(design.fonts.display, "sans-serif", legacyFonts.display),
    body: familyCss(design.fonts.body, "sans-serif", legacyFonts.body),
    mono: familyCss(design.fonts.mono, "monospace", legacyFonts.mono),
  };
  const bodyWeights = tokenWeights(design.fonts.body);
  const weights = {
    display: Math.max(...tokenWeights(design.fonts.display)),
    body: Math.min(...bodyWeights),
    bodyBold: Math.max(...bodyWeights),
  };
  const shadow = shadowFor({ shape: design.shape, palette: p, dark }, 0.4);
  const theme: Theme = {
    fonts: families,
    fg: p.fg,
    muted: p.muted,
    line: p.line,
    panel: p.surface,
    onAccent,
    caption: { bg: alpha(p.surface, dark ? 0.86 : 0.94), fg: p.fg, border: p.line, shadow },
    labelShadow: dark ? "0 2px 18px rgba(0,0,0,.8)" : `0 1px 0 ${alpha(p.bg, 0.9)}, 0 0 14px ${alpha(p.bg, 0.95)}`,
    phone: dark
      ? { body: mix(p.bg, "#000000", 0.2), screen: mix(p.bg, "#000000", 0.2), header: p.fg, them: p.surface, themText: p.fg, glow: true }
      : { body: mix(p.fg, "#000000", 0.3), screen: mix(p.bg, p.surface, 0.5), header: p.fg, them: p.surface, themText: p.fg, glow: false },
    kit: deriveKit(design, dark, onAccent),
  };
  return {
    ...design,
    videoId,
    families,
    weights,
    dark,
    onAccent,
    accents: [p.accent, ...p.accents],
    motionPreset: motion[design.motion],
    theme,
  };
};

export const DesignContext = createContext<ResolvedDesign | null>(null);

/** The current video's resolved design, or null outside a <Designed> (legacy look). */
export const useDesign = () => useContext(DesignContext);

/** The design's motion preset; "calm" when there is no design. */
export const useMotion = (): MotionPreset => useDesign()?.motionPreset ?? motion.calm;

// One load per font across every <Designed> in the bundle (the gallery mounts many).
const fontLoads = new Map<string, Promise<void>>();

const loadGoogle = (family: string, weights: number[]): Promise<void> => {
  const ws = [...new Set(weights)].sort((a, b) => a - b);
  const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@${ws.join(";")}&display=block`;
  const key = `google:${href}`;
  if (!fontLoads.has(key)) {
    fontLoads.set(
      key,
      new Promise<void>((resolve, reject) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Google Fonts has no "${family}" with weights ${ws.join(", ")}`));
        document.head.appendChild(link);
      }).then(async () => {
        const faces = await Promise.all(ws.map((w) => document.fonts.load(`${w} 40px "${family}"`)));
        if (faces.some((f) => f.length === 0)) throw new Error(`Font "${family}" loaded no faces`);
      }),
    );
  }
  return fontLoads.get(key)!;
};

const loadLocal = (videoId: string, token: Extract<FontToken, { files: unknown }>): Promise<void> =>
  Promise.all(
    token.files.map((f) => {
      const url = staticFile(`${videoId}/${f.src}`);
      const key = `local:${token.family}:${url}:${f.weight}:${f.style}`;
      if (!fontLoads.has(key)) {
        const face = new FontFace(token.family, `url("${url}")`, { weight: String(f.weight), style: f.style });
        fontLoads.set(
          key,
          face.load().then(
            (loaded) => void document.fonts.add(loaded),
            (e: Error) => {
              throw new Error(`Font file ${videoId}/${f.src} failed to load: ${e.message}`);
            },
          ),
        );
      }
      return fontLoads.get(key)!;
    }),
  ).then(() => undefined);

const loadFonts = (design: Design, videoId: string): Promise<void> =>
  Promise.all(
    [design.fonts.display, design.fonts.body, design.fonts.mono]
      .filter((t): t is FontToken => !!t)
      .map((t) => ("files" in t ? loadLocal(videoId, t) : loadGoogle(t.family, t.weights))),
  ).then(() => undefined);

/**
 * Applies a video's design: loads its fonts, then provides the design and a matching theme to everything inside.
 * With no `design`, it renders its children unchanged.
 */
export const Designed: React.FC<{ videoId: string; design?: Design; children: React.ReactNode }> = ({ videoId, design, children }) => {
  const resolved = useMemo(() => (design ? resolveDesign(design, videoId) : null), [design, videoId]);
  const [handle] = useState(() => (design ? delayRender(`Loading fonts for ${videoId}`) : null));
  useEffect(() => {
    if (!design || handle === null) return;
    loadFonts(design, videoId).then(
      () => continueRender(handle),
      (e: Error) => cancelRender(e),
    );
  }, [design, videoId, handle]);
  if (!resolved) return <>{children}</>;
  return (
    <DesignContext.Provider value={resolved}>
      <ThemeContext.Provider value={resolved.theme}>{children}</ThemeContext.Provider>
    </DesignContext.Provider>
  );
};

/** Card or panel style from the design's surface, shape and shadow tokens. */
export const surfaceStyle = (d: ResolvedDesign, lift = 1): React.CSSProperties => ({
  background: d.palette.surface,
  borderRadius: d.shape.radius,
  border: d.shape.stroke > 0 ? `${d.shape.stroke}px solid ${d.palette.line}` : "none",
  boxShadow: shadowFor(d, lift),
});
