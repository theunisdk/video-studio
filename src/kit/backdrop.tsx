// The design's background treatment, as a full-frame layer behind everything else.
import { AbsoluteFill, Img, staticFile } from "remotion";
import { alpha, mix } from "./color";
import { useDesign } from "./design";

// Static SVG fractal noise: deterministic, so every frame grains the same way.
const grainUrl = (seed: number) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.4 -0.2'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
  )}")`;

/** Paints design.background (solid, gradient, grid, dots, grain or texture, plus optional grain). Renders nothing without a design. */
export const Backdrop: React.FC<{ seed?: number }> = ({ seed = 3 }) => {
  const d = useDesign();
  if (!d) return null;
  const { bg, line, fg } = d.palette;
  const b = d.background;
  const ink = d.dark ? mix(line, fg, 0.15) : line;
  let layer: React.CSSProperties = { background: bg };
  if (b.kind === "gradient") {
    const stops = b.colors ?? [mix(bg, d.dark ? "#ffffff" : "#000000", 0.02), mix(bg, d.palette.accent, d.dark ? 0.12 : 0.07)];
    layer = { background: `linear-gradient(${b.angle}deg, ${stops.join(", ")})` };
  } else if (b.kind === "grid") {
    const major = b.size * 4;
    const [strong, faint] = d.dark ? [0.55, 0.25] : [0.95, 0.5];
    layer = {
      backgroundColor: bg,
      backgroundImage: [
        `linear-gradient(${alpha(ink, strong)} 1px, transparent 1px)`,
        `linear-gradient(90deg, ${alpha(ink, strong)} 1px, transparent 1px)`,
        `linear-gradient(${alpha(ink, faint)} 1px, transparent 1px)`,
        `linear-gradient(90deg, ${alpha(ink, faint)} 1px, transparent 1px)`,
      ].join(", "),
      backgroundSize: `${major}px ${major}px, ${major}px ${major}px, ${b.size}px ${b.size}px, ${b.size}px ${b.size}px`,
      backgroundPosition: "-1px -1px",
    };
  } else if (b.kind === "dots") {
    layer = {
      backgroundColor: bg,
      backgroundImage: `radial-gradient(${alpha(ink, 0.9)} 1.6px, transparent 1.8px)`,
      backgroundSize: `${b.size}px ${b.size}px`,
      backgroundPosition: `${b.size / 2}px ${b.size / 2}px`,
    };
  }
  const grain = b.kind === "grain" && b.grain === 0 ? 0.12 : b.grain;
  return (
    <AbsoluteFill style={layer}>
      {b.kind === "texture" && b.src && (
        <Img src={staticFile(`${d.videoId}/${b.src}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      {grain > 0 && (
        <AbsoluteFill style={{ backgroundImage: grainUrl(seed), opacity: grain * (d.dark ? 1.4 : 1), mixBlendMode: d.dark ? "screen" : "multiply" }} />
      )}
    </AbsoluteFill>
  );
};

/** The design's logo at its placement, clear of the title and caption zones. Renders nothing without one. */
export const Logo: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => {
  const d = useDesign();
  if (!d?.logo) return null;
  const { placement, height, src } = d.logo;
  const [v, h] = placement.split("-") as ["top" | "bottom", "left" | "right"];
  const inset = { x: 64, top: 48, bottom: 40 };
  return (
    <Img
      src={staticFile(`${d.videoId}/${src}`)}
      style={{
        position: "absolute",
        height,
        width: "auto",
        opacity,
        [h]: inset.x,
        [v]: v === "top" ? inset.top : inset.bottom,
      }}
    />
  );
};
