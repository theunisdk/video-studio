// Small colour helpers for deriving kit colours from a design palette.

type Rgb = [number, number, number];

const parse = (hex: string): { rgb: Rgb; a: number } => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return { rgb: [n(0), n(2), n(4)], a: h.length === 8 ? n(6) / 255 : 1 };
};

const toHex = ([r, g, b]: Rgb): string =>
  "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

/** `a` moved toward `b` by `t` (0..1), as #rrggbb. */
export const mix = (a: string, b: string, t: number): string => {
  const x = parse(a).rgb;
  const y = parse(b).rgb;
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
};

/** The colour at opacity `alpha`, as rgba(). */
export const alpha = (hex: string, a: number): string => {
  const [r, g, b] = parse(hex).rgb;
  return `rgba(${r},${g},${b},${a})`;
};

/** WCAG relative luminance, 0 (black) to 1 (white). */
export const luminance = (hex: string): number => {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = parse(hex).rgb;
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

/** WCAG contrast ratio between two colours, 1 to 21. */
export const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

export const isDark = (hex: string): boolean => luminance(hex) < 0.22;

/** Whichever of `options` reads best on `bg`. */
export const readableOn = (bg: string, options: string[] = ["#ffffff", "#111111"]): string =>
  options.reduce((best, c) => (contrast(c, bg) > contrast(best, bg) ? c : best), options[0]);
