// Flat 2D pieces for message-flow explainers: role avatars, connectors, a step tracker.
import { useCurrentFrame } from "remotion";
import { ramp } from "./anim";
import { useTheme } from "./theme";

export type Point = { x: number; y: number };

export type AvatarLook = {
  skin: string;
  hair: string;
  hairStyle: "bun" | "short" | "long";
  top: string;
  /** Small white cross on the chest, for clinical staff. */
  badge?: boolean;
};

/** A faceless bust in a circle, like a profile picture. */
export const Avatar: React.FC<{ look: AvatarLook; size: number; ring: string; active?: number }> = ({ look, size, ring, active = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", opacity: 0.45 + 0.55 * active }}>
    <defs>
      <clipPath id={`avatar-${look.top}-${look.hairStyle}`}>
        <circle cx="50" cy="50" r="47" />
      </clipPath>
    </defs>
    <circle cx="50" cy="50" r="49" fill={`${ring}22`} stroke={ring} strokeWidth={2 + 2 * active} />
    <g clipPath={`url(#avatar-${look.top}-${look.hairStyle})`}>
      {look.hairStyle === "long" && <rect x="29" y="30" width="42" height="40" rx="18" fill={look.hair} />}
      <path d="M14 104 C14 78 30 66 50 66 C70 66 86 78 86 104 Z" fill={look.top} />
      <path d="M41 66 L50 78 L59 66 Z" fill={look.skin} />
      <rect x="44" y="55" width="12" height="14" rx="5" fill={look.skin} />
      <circle cx="50" cy="42" r="16" fill={look.skin} />
      <path d="M33.5 42 C33.5 29 41 24 50 24 C59 24 66.5 29 66.5 42 C62 35 56 33 50 33 C44 33 38 35 33.5 42 Z" fill={look.hair} />
      {look.hairStyle === "bun" && <circle cx="50" cy="22" r="8" fill={look.hair} />}
      {look.badge && (
        <g transform="translate(62 82)">
          <rect x="-6" y="-6" width="12" height="12" rx="3" fill="#ffffff" />
          <rect x="-1.4" y="-4.2" width="2.8" height="8.4" fill={look.top} />
          <rect x="-4.2" y="-1.4" width="8.4" height="2.8" fill={look.top} />
        </g>
      )}
    </g>
  </svg>
);

/** Avatar plus name and a small place line ("at the clinic"). */
export const RoleTag: React.FC<{ look: AvatarLook; name: string; place: string; color: string; x: number; y: number; appear: number; active?: number; align?: "left" | "right"; scale?: number }> = ({
  look,
  name,
  place,
  color,
  x,
  y,
  appear,
  active = 1,
  align = "left",
  scale = 1,
}) => {
  const t = useTheme();
  if (appear <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) translateY(${(1 - Math.min(1, appear)) * 20}px) scale(${scale})`,
        opacity: Math.min(1, appear), display: "flex", flexDirection: align === "left" ? "row" : "row-reverse", alignItems: "center", gap: 16,
      }}
    >
      <Avatar look={look} size={88} ring={color} active={active} />
      <div style={{ textAlign: align, opacity: 0.5 + 0.5 * active }}>
        <div style={{ font: `700 32px ${t.fonts.display}`, color: t.fg }}>{name}</div>
        <div style={{ font: `700 21px ${t.fonts.body}`, color }}>{place}</div>
      </div>
    </div>
  );
};

const quad = (a: Point, b: Point, bend: number) => {
  const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - bend };
  return {
    d: `M ${a.x} ${a.y} Q ${c.x} ${c.y} ${b.x} ${b.y}`,
    at: (u: number): Point => ({
      x: (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * c.x + u * u * b.x,
      y: (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * c.y + u * u * b.y,
    }),
  };
};

export type Packet = { t: number; color: string; label?: string };

/** Curved line between two screen points; packets ride along it (t 0..1 from `from` to `to`). */
export const FlowLine: React.FC<{ from: Point; to: Point; color: string; appear: number; bend?: number; dashed?: boolean; packets?: Packet[] }> = ({
  from,
  to,
  color,
  appear,
  bend = 60,
  dashed,
  packets = [],
}) => {
  const frame = useCurrentFrame();
  if (appear <= 0.001) return null;
  const q = quad(from, to, bend);
  return (
    <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width="100%" height="100%">
      <path d={q.d} fill="none" stroke={color} strokeOpacity={0.35 * appear} strokeWidth={4} strokeLinecap="round" strokeDasharray={dashed ? "2 14" : "10 12"} strokeDashoffset={dashed ? 0 : -frame * 0.8} />
      {packets
        .filter((p) => p.t > 0 && p.t < 1)
        .map((p, i) => {
          const pt = q.at(p.t);
          return (
            <g key={i} transform={`translate(${pt.x} ${pt.y})`}>
              <circle r={26} fill={p.color} opacity={0.18} />
              <rect x={-22} y={-15} width={44} height={30} rx={11} fill={p.color} />
              <path d="M -8 15 L -2 15 L -10 23 Z" fill={p.color} />
              {[-9, 0, 9].map((dx) => (
                <circle key={dx} cx={dx} cy={0} r={3.2} fill="#ffffff" />
              ))}
            </g>
          );
        })}
    </svg>
  );
};

/** Horizontal step tracker; `progress` is the fractional index of the current step. */
export const StepTracker: React.FC<{ steps: string[]; current: number; x: number; y: number; color: string; appear: number }> = ({ steps, current, x, y, color, appear }) => {
  const t = useTheme();
  if (appear <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "flex-start", opacity: Math.min(1, appear) }}>
      {steps.map((label, i) => {
        const done = current > i + 0.5;
        const active = Math.abs(current - i) < 0.5;
        return (
          <div key={label} style={{ display: "flex", alignItems: "flex-start" }}>
            {i > 0 && <div style={{ width: 46, height: 3, marginTop: 15, background: current >= i ? color : t.line, borderRadius: 2 }} />}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 74 }}>
              <div
                style={{
                  width: 32, height: 32, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
                  background: done || active ? color : "#ffffff", border: `2px solid ${done || active ? color : t.line}`,
                  color: done || active ? "#ffffff" : t.muted, font: `800 16px ${t.fonts.body}`,
                  boxShadow: active ? `0 0 0 6px ${color}33` : "none",
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <div style={{ font: `800 15px ${t.fonts.body}`, color: active ? t.fg : t.muted, marginTop: 6, whiteSpace: "nowrap" }}>{label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Fade + lift helper for screen elements. */
export const lift = (frame: number, start: number, duration = 14) => {
  const p = ramp(frame, start, duration);
  return { opacity: p, transform: `translateY(${(1 - p) * 24}px)` };
};
