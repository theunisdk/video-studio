import { createContext, useContext } from "react";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Unbounded";
import { loadFont as loadBody } from "@remotion/google-fonts/AtkinsonHyperlegible";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadNunito } from "@remotion/google-fonts/NunitoSans";

const display = loadDisplay("normal", { weights: ["500", "700"], subsets: ["latin"] });
const body = loadBody("normal", { weights: ["400", "700"], subsets: ["latin"] });
const mono = loadMono("normal", { weights: ["400", "600"], subsets: ["latin"] });
const fraunces = loadFraunces("normal", { weights: ["600", "700"], subsets: ["latin"] });
const nunito = loadNunito("normal", { weights: ["400", "700", "800"], subsets: ["latin"] });

export const fonts = {
  display: display.fontFamily,
  body: body.fontFamily,
  mono: mono.fontFamily,
};

export const colors = {
  bg: "#070b16",
  panel: "#131c31",
  line: "#29365a",
  fg: "#eef1f8",
  muted: "#8f9bbb",
  claw: "#ff7d5c",
  host: "#a596ff",
  ai: "#ffcc4d",
  chat: "#41d4c9",
  ok: "#62e3a3",
};

export type Theme = {
  fonts: { display: string; body: string; mono: string };
  fg: string;
  muted: string;
  line: string;
  panel: string;
  /** Text colour on top of an accent fill (badges, active chips). */
  onAccent: string;
  caption: { bg: string; fg: string; border: string; shadow: string };
  labelShadow: string;
  phone: {
    body: string;
    screen: string;
    header: string;
    them: string;
    themText: string;
    /** Outgoing bubble; falls back to the phone's accent colour. */
    me?: string;
    meText?: string;
    glow: boolean;
  };
};

export const darkTheme: Theme = {
  fonts,
  fg: colors.fg,
  muted: colors.muted,
  line: colors.line,
  panel: colors.panel,
  onAccent: colors.bg,
  caption: { bg: "rgba(7,11,22,0.78)", fg: colors.fg, border: colors.line, shadow: "none" },
  labelShadow: "0 2px 18px rgba(0,0,0,.8)",
  phone: { body: "#0a1120", screen: "#0a1120", header: colors.fg, them: colors.panel, themText: colors.fg, glow: true },
};

export const lightTheme: Theme = {
  fonts: { display: fraunces.fontFamily, body: nunito.fontFamily, mono: nunito.fontFamily },
  fg: "#22313a",
  muted: "#6b7a80",
  line: "#e3ddd4",
  panel: "#ffffff",
  onAccent: "#ffffff",
  caption: { bg: "rgba(255,255,255,0.94)", fg: "#22313a", border: "rgba(34,49,58,0.08)", shadow: "0 8px 30px rgba(34,49,58,0.12)" },
  labelShadow: "0 1px 0 rgba(255,255,255,.9), 0 0 14px rgba(255,255,255,.95)",
  phone: { body: "#1f2a30", screen: "#f2ece4", header: "#22313a", them: "#ffffff", themText: "#22313a", me: "#d7f5cf", meText: "#1d3a26", glow: false },
};

export const ThemeContext = createContext<Theme>(darkTheme);
export const useTheme = () => useContext(ThemeContext);
