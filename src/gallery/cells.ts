// The kit gallery: one cell per title, caption, transition, motion, background and browser-frame variant,
// plus a few whole looks. `pnpm gallery` renders a still of each cell into out/kit-gallery/.
// Cells reuse the getting-started narration (word timings) and openclaw's (none) so captions are real.
import type { z } from "zod";
import { designSchema, motionPresets, titleTreatments, transitionKinds, type Design } from "../video/design";
import { galleryTimelines } from "./timelines";

type DesignInput = z.input<typeof designSchema>;

const baseInput = {
  look: "gallery",
  palette: { bg: "#f4f1ea", surface: "#ffffff", fg: "#1d2230", muted: "#69708a", line: "#ddd8cc", accent: "#3d5afe", accents: ["#ff6b4a", "#16a37f", "#f2b705"] },
  fonts: { display: { family: "Space Grotesk", weights: [500, 700] }, body: { family: "Inter", weights: [400, 700] }, mono: { family: "JetBrains Mono", weights: [400, 600] } },
  motion: "snappy",
  title: "none",
  caption: "pill",
} satisfies DesignInput;

const make = (patch: Partial<DesignInput> = {}): Design => designSchema.parse({ ...baseInput, ...patch });

export type GalleryCell = {
  id: string;
  section: "titles" | "captions" | "transitions" | "motion" | "backgrounds" | "frames" | "looks";
  label: string;
  /** Frame to take the still at. */
  frame: number;
  narration: "timed" | "untimed";
  design: Design;
  kind: "scene" | "transition" | "motion" | "browser";
  browser?: "light" | "dark" | "none";
};

const looks: [string, string, Partial<DesignInput>][] = [
  ["editorial", "editorial / magazine", {
    palette: { bg: "#f6f1e7", surface: "#fffdf8", fg: "#1b1a17", muted: "#6d665a", line: "#d9cfbd", accent: "#b3261e", accents: ["#1f4e79"] },
    fonts: { display: { family: "Fraunces", weights: [600, 800] }, body: { family: "Source Serif 4", weights: [400, 700] } },
    shape: { radius: 0, stroke: 1, shadow: "none" }, title: "rail", caption: "outline", motion: "calm",
  }],
  ["blueprint", "blueprint / technical", {
    palette: { bg: "#0f2a4a", surface: "#13355d", fg: "#e8f1ff", muted: "#8fb0d9", line: "#3f6a9c", accent: "#ffd166", accents: ["#7bdff2"] },
    fonts: { display: { family: "IBM Plex Mono", weights: [500, 700] }, body: { family: "IBM Plex Sans", weights: [400, 700] }, mono: { family: "IBM Plex Mono", weights: [400] } },
    shape: { radius: 2, stroke: 2, shadow: "none" }, background: { kind: "grid", size: 48 }, title: "lowerThird", caption: "strip", motion: "mechanical",
    type: { titleCase: "upper", titleTracking: 0.06, titleScale: 0.9 },
  }],
  ["terminal", "terminal / data", {
    palette: { bg: "#0b0f0c", surface: "#121a14", fg: "#d7ffe0", muted: "#6f9a7a", line: "#244030", accent: "#3dff8b" },
    fonts: { display: { family: "JetBrains Mono", weights: [700] }, body: { family: "JetBrains Mono", weights: [400, 700] } },
    shape: { radius: 4, stroke: 1, shadow: "glow" }, background: { kind: "dots", size: 28, grain: 0.06 }, title: "kinetic", caption: "highlight", motion: "snappy",
  }],
  ["poster", "bold poster / retro", {
    palette: { bg: "#ffcf3f", surface: "#fff4d1", fg: "#1a1208", muted: "#5c4a1e", line: "#1a1208", accent: "#c42a14", accents: ["#1f6feb"] },
    fonts: { display: { family: "Archivo Black", weights: [400] }, body: { family: "Archivo", weights: [500, 800] } },
    shape: { radius: 0, stroke: 4, shadow: "hard" }, background: { kind: "grain", grain: 0.14 }, title: "hero", caption: "highlight", motion: "bouncy",
    type: { titleCase: "upper", titleTracking: 0.01, titleScale: 1.1 },
  }],
  ["swiss", "minimal Swiss", {
    palette: { bg: "#ffffff", surface: "#f2f2f2", fg: "#111111", muted: "#777777", line: "#111111", accent: "#e30613" },
    fonts: { display: { family: "Inter Tight", weights: [600, 800] }, body: { family: "Inter", weights: [400, 600] } },
    shape: { radius: 0, stroke: 0, shadow: "none" }, title: "lowerThird", caption: "outline", motion: "mechanical",
  }],
  ["sketch", "hand-drawn / sketch", {
    palette: { bg: "#fbf8f1", surface: "#ffffff", fg: "#2b2a28", muted: "#77736b", line: "#2b2a28", accent: "#cc4a35", accents: ["#4a90c2"] },
    fonts: { display: { family: "Caveat", weights: [700] }, body: { family: "Kalam", weights: [400, 700] } },
    shape: { radius: 18, stroke: 2, shadow: "hard" }, background: { kind: "grain", grain: 0.1 }, title: "banner", caption: "pill", motion: "bouncy",
    type: { titleScale: 1.25 },
  }],
];

export const galleryCells: GalleryCell[] = [
  ...titleTreatments.map((t): GalleryCell => ({
    id: `title-${t}`, section: "titles", label: `title: ${t}`, frame: 56, narration: "timed", kind: "scene", design: make({ title: t }),
  })),
  ...(["pill", "strip", "outline", "highlight"] as const).map((c): GalleryCell => ({
    id: `caption-${c}`, section: "captions", label: `caption: ${c}`, frame: 132, narration: "timed", kind: "scene", design: make({ caption: c }),
  })),
  { id: "caption-highlight-fallback", section: "captions", label: "caption: highlight, no word timings (plain form)", frame: 132, narration: "untimed", kind: "scene", design: make({ caption: "highlight" }) },
  ...transitionKinds.map((k): GalleryCell => ({
    id: `transition-${k}`, section: "transitions", label: `transition: ${k}${k === "cut" ? " (first frame after)" : ", mid-way"}`, frame: galleryTimelines.timed.scenes[1].from, narration: "timed", kind: "transition",
    design: make({ motion: "calm", transition: { kind: k, frames: 24, direction: "left" } }),
  })),
  ...motionPresets.map((m): GalleryCell => ({
    id: `motion-${m}`, section: "motion", label: `motion: ${m}`, frame: 22, narration: "timed", kind: "motion", design: make({ motion: m }),
  })),
  ...(["solid", "gradient", "grid", "dots", "grain"] as const).map((b): GalleryCell => ({
    id: `background-${b}`, section: "backgrounds", label: `background: ${b}`, frame: 132, narration: "timed", kind: "scene",
    design: make({ background: { kind: b } }),
  })),
  { id: "background-dark-grid", section: "backgrounds", label: "background: grid on a dark palette", frame: 132, narration: "timed", kind: "scene", design: make(looks[1][2]) },
  ...(["light", "dark", "none"] as const).map((f): GalleryCell => ({
    id: `frame-${f}`, section: "frames", label: `walkthrough frame: ${f}`, frame: 150, narration: "timed", kind: "browser", browser: f, design: make({ shape: { radius: 16, stroke: 1, shadow: "soft" } }),
  })),
  ...looks.map(([id, label, patch]): GalleryCell => ({
    id: `look-${id}`, section: "looks", label: `look: ${label}`, frame: id === "poster" || id === "terminal" ? 60 : 132, narration: "timed", kind: "scene", design: make({ look: id, ...patch }),
  })),
];
