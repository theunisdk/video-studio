// Colours that kit parts use beyond the theme's text and line colours.
// `legacyKit` holds the values the kit always used, so a video without a design looks as it did.
import { useTheme } from "./theme";

export type BrowserColors = {
  frame: string;
  bar: string;
  barLine: string;
  url: string;
  urlText?: string;
  dots: [string, string, string];
  shadow: string;
  /** Dimming around a spotlit target. */
  spotlight: string;
  calloutText: string;
  cursorFill: string;
  cursorStroke: string;
};

export type Furniture = {
  white: string;
  linen: string;
  trim: string;
  windowGlass: string;
  daylight: string;
  bandage: string;
  eyes: string;
  phoneBody: string;
  phoneScreen: string;
  phoneGlow: string;
  metal: string;
  metalDark: string;
  examBed: string;
  cabinet: string;
  handle: string;
  supplies: string;
  supplyAccent: string;
  sign: string;
  leaf: string;
  pot: string;
  wood: string;
  woodDark: string;
  deskLeg: string;
  mug: string;
  chair: string;
  sofa: string;
  cushion: string;
  ottoman: string;
  lampShade: string;
  lampGlow: string;
  lampLight: string;
  rug: string;
  art: string;
  treeLeaf: string;
  trunk: string;
  bush: string;
  ground: string;
  sky: string;
  bounce: string;
  sun: string;
  sunWarm: string;
};

export type KitColors = {
  /** Starfield points. */
  star: string;
  /** What bright cores and packets blend toward. */
  highlight: string;
  tracker: { idle: string; onActive: string };
  browser: BrowserColors;
  browserDark: BrowserColors;
  furniture: Furniture;
};

const dots: [string, string, string] = ["#ff5f57", "#febc2e", "#28c840"];

export const legacyKit: KitColors = {
  star: "#9fb0d8",
  highlight: "#ffffff",
  tracker: { idle: "#ffffff", onActive: "#ffffff" },
  browser: {
    frame: "#ffffff",
    bar: "#eef0f2",
    barLine: "#e1e4e8",
    url: "#ffffff",
    dots,
    shadow: "0 30px 80px rgba(34,49,58,0.22), 0 0 0 1px rgba(34,49,58,0.08)",
    spotlight: "20,28,36",
    calloutText: "#ffffff",
    cursorFill: "#ffffff",
    cursorStroke: "#1f2a30",
  },
  browserDark: {
    frame: "#141927",
    bar: "#1b2133",
    barLine: "#2a3045",
    url: "#232a3e",
    urlText: "#8a93ad",
    dots,
    shadow: "0 30px 80px rgba(8,10,18,0.45), 0 0 0 1px rgba(255,255,255,0.06)",
    spotlight: "6,8,14",
    calloutText: "#ffffff",
    cursorFill: "#ffffff",
    cursorStroke: "#1f2a30",
  },
  furniture: {
    white: "#ffffff",
    linen: "#f4f5f2",
    trim: "#ffffff",
    windowGlass: "#cfe6f2",
    daylight: "#fff3d6",
    bandage: "#fbfbf8",
    eyes: "#2b2522",
    phoneBody: "#1f2a30",
    phoneScreen: "#cfeee3",
    phoneGlow: "#8fe0c6",
    metal: "#9aa7ad",
    metalDark: "#3b4a52",
    examBed: "#9fd8cf",
    cabinet: "#ffffff",
    handle: "#c9d2d6",
    supplies: "#e9f3f6",
    supplyAccent: "#7cc4b4",
    sign: "#3fb68b",
    leaf: "#6fae7a",
    pot: "#d98b6c",
    wood: "#e8d5bd",
    woodDark: "#8a6a4f",
    deskLeg: "#f4f1ec",
    mug: "#f2b866",
    chair: "#7cc4b4",
    sofa: "#e0957a",
    cushion: "#f6e7d6",
    ottoman: "#9fb4d8",
    lampShade: "#fff3dc",
    lampGlow: "#ffd59a",
    lampLight: "#ffcf8a",
    rug: "#c9d9c3",
    art: "#f2b866",
    treeLeaf: "#8cc38e",
    trunk: "#a07a5c",
    bush: "#9acb94",
    ground: "#dde8d3",
    sky: "#ffffff",
    bounce: "#d8cbb6",
    sun: "#fff6e8",
    sunWarm: "#ffd9a8",
  },
};

/** The current theme's kit colours (the legacy ones unless a design supplies its own). */
export const useKit = (): KitColors => useTheme().kit ?? legacyKit;
