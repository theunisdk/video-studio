import { useMemo } from "react";
import { random, useCurrentFrame } from "remotion";
import {
  AdditiveBlending,
  BoxGeometry,
  CatmullRomCurve3,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  EdgesGeometry,
  QuadraticBezierCurve3,
  TubeGeometry,
  Vector3,
} from "three";
import type { Vec3 } from "./camera";

let glowTexture: CanvasTexture | null = null;
const getGlowTexture = () => {
  if (glowTexture) return glowTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.45)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTexture = new CanvasTexture(c);
  return glowTexture;
};

/** Soft additive halo; stands in for bloom, which needs a post-processing pass. */
export const Glow: React.FC<{ color: string; size: number; opacity?: number; position?: Vec3 }> = ({
  color,
  size,
  opacity = 0.6,
  position = [0, 0, 0],
}) => (
  <sprite position={position} scale={[size, size, 1]}>
    <spriteMaterial map={getGlowTexture()} color={color} opacity={opacity} transparent blending={AdditiveBlending} depthWrite={false} />
  </sprite>
);

export const Starfield: React.FC<{ count?: number; seed?: string; opacity?: number }> = ({ count = 1400, seed = "stars", opacity = 0.7 }) => {
  const frame = useCurrentFrame();
  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 30 + random(`${seed}-r-${i}`) * 50;
      const th = random(`${seed}-t-${i}`) * Math.PI * 2;
      const ph = Math.acos(2 * random(`${seed}-p-${i}`) - 1);
      pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    return g;
  }, [count, seed]);
  return (
    <points geometry={geometry} rotation={[0, frame * 0.0006, 0]}>
      <pointsMaterial color="#9fb0d8" size={0.12} sizeAttenuation transparent opacity={opacity} depthWrite={false} />
    </points>
  );
};

/** "Software": a faceted core with orbiting arcs. `activity` 0..1 speeds it up and brightens it. */
export const Core: React.FC<{ color: string; appear: number; activity?: number; position?: Vec3 }> = ({
  color,
  appear,
  activity = 0,
  position = [0, 0, 0],
}) => {
  const frame = useCurrentFrame();
  const spin = frame * (0.012 + activity * 0.03);
  if (appear <= 0.001) return null;
  return (
    <group position={position} scale={appear}>
      <mesh rotation={[spin * 0.7, spin, 0]}>
        <icosahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55 + activity * 0.4} flatShading />
      </mesh>
      <mesh rotation={[-spin * 0.5, spin * 0.8, 0.3]}>
        <icosahedronGeometry args={[0.78, 1]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.18} />
      </mesh>
      <mesh rotation={[1.1, spin * 1.6, 0.4]}>
        <torusGeometry args={[1.0, 0.03, 8, 96, Math.PI * 1.35]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh rotation={[0.3, -spin * 1.2, 1.9]}>
        <torusGeometry args={[1.18, 0.022, 8, 96, Math.PI * 0.9]} />
        <meshBasicMaterial color={color} transparent opacity={0.75} />
      </mesh>
      <Glow color={color} size={3.4} opacity={0.35 + activity * 0.35} />
    </group>
  );
};

/** "Computer": a wireframe server box with status lights and a cloud above it. */
export const ServerBox: React.FC<{ color: string; ledColor: string; appear: number; size?: number; position?: Vec3 }> = ({
  color,
  ledColor,
  appear,
  size = 2.8,
  position = [0, 0, 0],
}) => {
  const frame = useCurrentFrame();
  const edges = useMemo(() => new EdgesGeometry(new BoxGeometry(size, size, size)), [size]);
  const cloud = useMemo(() => {
    const n = 700;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = random(`cloud-a-${i}`) * Math.PI * 2;
      const r = Math.sqrt(random(`cloud-r-${i}`));
      pos.set([Math.cos(a) * r * 1.3, (random(`cloud-y-${i}`) - 0.5) * 0.35, Math.sin(a) * r * 0.6], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    return g;
  }, []);
  if (appear <= 0.001) return null;
  const h = size / 2;
  return (
    <group position={position}>
      <group scale={[1, Math.max(0.001, appear), 1]}>
        <lineSegments geometry={edges}>
          <lineBasicMaterial color={color} transparent opacity={appear} />
        </lineSegments>
        <mesh>
          <boxGeometry args={[size, size, size]} />
          <meshBasicMaterial color={color} transparent opacity={0.05 * appear} side={DoubleSide} depthWrite={false} />
        </mesh>
      </group>
      {Array.from({ length: 5 }, (_, i) => {
        const on = (Math.floor(frame / 9) + i * 3) % 5 !== 0;
        return (
          <mesh key={i} position={[-h + 0.3 + i * 0.24, h - 0.28, h]}>
            <sphereGeometry args={[0.055, 12, 12]} />
            <meshBasicMaterial color={ledColor} transparent opacity={appear * (on ? 1 : 0.25)} />
          </mesh>
        );
      })}
      <mesh position={[0, h + 0.5, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 1.0, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.6 * appear} />
      </mesh>
      <points geometry={cloud} position={[0, h + 1.1, 0]} rotation={[0, frame * 0.004, 0]}>
        <pointsMaterial color={color} size={0.04} sizeAttenuation transparent opacity={0.8 * appear} depthWrite={false} blending={AdditiveBlending} />
      </points>
    </group>
  );
};

/** "Intelligence": a particle sphere that condenses as `form` goes 0 -> 1. */
export const Orb: React.FC<{ color: string; form: number; activity?: number; position?: Vec3; radius?: number }> = ({
  color,
  form,
  activity = 0,
  position = [0, 0, 0],
  radius = 1.15,
}) => {
  const frame = useCurrentFrame();
  const count = 2600;
  const { from, to } = useMemo(() => {
    const f = new Float32Array(count * 3);
    const t = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const th = random(`orb-t-${i}`) * Math.PI * 2;
      const ph = Math.acos(2 * random(`orb-p-${i}`) - 1);
      const dir = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
      const shell = radius * (0.55 + 0.45 * Math.cbrt(random(`orb-r-${i}`)));
      const far = 4 + random(`orb-f-${i}`) * 6;
      t.set(dir.map((d) => d * shell), i * 3);
      f.set(dir.map((d) => d * far), i * 3);
    }
    return { from: f, to: t };
  }, [radius]);
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3));
    return g;
  }, []);
  const attr = geometry.getAttribute("position") as BufferAttribute;
  const arr = attr.array as Float32Array;
  for (let i = 0; i < arr.length; i++) arr[i] = from[i] + (to[i] - from[i]) * form;
  attr.needsUpdate = true;

  if (form <= 0.001) return null;
  const pulse = 1 + activity * 0.12 * Math.sin(frame * 0.35);
  return (
    <group position={position}>
      <points geometry={geometry} rotation={[0.2, frame * 0.01, 0]} scale={pulse}>
        <pointsMaterial color={color} size={0.045} sizeAttenuation transparent opacity={0.9 * form} depthWrite={false} blending={AdditiveBlending} />
      </points>
      <mesh scale={form}>
        <sphereGeometry args={[0.24, 24, 24]} />
        <meshBasicMaterial color={new Color(color).lerp(new Color("#ffffff"), 0.6)} />
      </mesh>
      <Glow color={color} size={2.6 + activity * 1.2} opacity={0.7 * form} />
      <mesh rotation={[1.35, 0, frame * 0.01]} scale={form}>
        <torusGeometry args={[radius * 1.45, 0.012, 6, 128]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>
      <mesh rotation={[1.2, 0.5, -frame * 0.008]} scale={form}>
        <torusGeometry args={[radius * 1.7, 0.01, 6, 128]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} />
      </mesh>
    </group>
  );
};

export type Packet = { t: number; color: string };

/** A curved link that draws in with `progress`; flowing dots and packets ride along it. */
export const Connector: React.FC<{
  from: Vec3;
  to: Vec3;
  color: string;
  progress: number;
  lift?: number;
  packets?: Packet[];
  flow?: boolean;
}> = ({ from, to, color, progress, lift = 0.9, packets = [], flow = true }) => {
  const frame = useCurrentFrame();
  const curve = useMemo(() => {
    const a = new Vector3(...from);
    const b = new Vector3(...to);
    const mid = a.clone().add(b).multiplyScalar(0.5).add(new Vector3(0, lift, 0));
    return new QuadraticBezierCurve3(a, mid, b);
  }, [from, to, lift]);
  const tube = useMemo(() => new TubeGeometry(curve, 96, 0.016, 6, false), [curve]);
  tube.setDrawRange(0, Math.floor((tube.index?.count ?? 0) * progress));
  if (progress <= 0.001) return null;
  const dots = flow ? 7 : 0;
  return (
    <group>
      <mesh geometry={tube}>
        <meshBasicMaterial color={color} transparent opacity={0.55} />
      </mesh>
      {Array.from({ length: dots }, (_, i) => {
        const t = (frame * 0.006 + i / dots) % 1;
        if (t > progress) return null;
        return (
          <mesh key={i} position={curve.getPoint(t)}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshBasicMaterial color={color} transparent opacity={Math.sin(Math.PI * t) * 0.9} />
          </mesh>
        );
      })}
      {packets
        .filter((p) => p.t > 0 && p.t < 1)
        .map((p, i) => {
          const pos = curve.getPoint(p.t).toArray() as Vec3;
          return (
            <group key={i} position={pos}>
              <mesh>
                <sphereGeometry args={[0.11, 16, 16]} />
                <meshBasicMaterial color={new Color(p.color).lerp(new Color("#ffffff"), 0.5)} />
              </mesh>
              <Glow color={p.color} size={1.1} opacity={0.9} />
            </group>
          );
        })}
    </group>
  );
};

/** World point on a connector's curve, for anchoring an HTML label. */
export const connectorPoint = (from: Vec3, to: Vec3, t: number, lift = 0.9): Vec3 => {
  const a = new Vector3(...from);
  const b = new Vector3(...to);
  const mid = a.clone().add(b).multiplyScalar(0.5).add(new Vector3(0, lift, 0));
  return new QuadraticBezierCurve3(a, mid, b).getPoint(t).toArray() as Vec3;
};

/** A smooth path through `points` that draws in with `progress`; milestones light up as it reaches them. */
export const Trail: React.FC<{
  points: Vec3[];
  color: string;
  progress: number;
  milestones?: { t: number; lit: number; color?: string }[];
  dimFrom?: number;
}> = ({ points, color, progress, milestones = [], dimFrom = 1 }) => {
  const curve = useMemo(() => new CatmullRomCurve3(points.map((p) => new Vector3(...p))), [points]);
  const tube = useMemo(() => new TubeGeometry(curve, 240, 0.035, 8, false), [curve]);
  const faint = useMemo(() => new TubeGeometry(curve, 240, 0.012, 6, false), [curve]);
  const count = tube.index?.count ?? 0;
  tube.setDrawRange(0, Math.floor(count * Math.min(progress, dimFrom)));
  if (progress <= 0.001) return null;
  return (
    <group>
      <mesh geometry={faint}>
        <meshBasicMaterial color={color} transparent opacity={0.16 * Math.min(1, progress * 3)} depthWrite={false} />
      </mesh>
      <mesh geometry={tube}>
        <meshBasicMaterial color={color} transparent opacity={0.85} />
      </mesh>
      {milestones.map((m, i) => {
        if (m.t > progress + 0.001) return null;
        const pos = curve.getPoint(m.t).toArray() as Vec3;
        const c = m.color ?? color;
        return (
          <group key={i} position={pos}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.22, 0.025, 8, 48]} />
              <meshBasicMaterial color={c} transparent opacity={0.35 + 0.65 * m.lit} />
            </mesh>
            <mesh scale={0.4 + 0.6 * m.lit}>
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshBasicMaterial color={new Color(c).lerp(new Color("#ffffff"), 0.4 * m.lit)} transparent opacity={0.4 + 0.6 * m.lit} />
            </mesh>
            <Glow color={c} size={0.6 + 1.2 * m.lit} opacity={0.6 * m.lit} />
          </group>
        );
      })}
    </group>
  );
};

/** World point at `t` along the same path a <Trail> draws. */
export const trailPoint = (points: Vec3[], t: number): Vec3 =>
  new CatmullRomCurve3(points.map((p) => new Vector3(...p))).getPoint(Math.min(1, Math.max(0, t))).toArray() as Vec3;

/** Wireframe building: a clinic (flat roof, cross) or a home (pitched roof). Origin is ground centre. */
export const WireBuilding: React.FC<{
  kind: "clinic" | "home";
  color: string;
  appear: number;
  position?: Vec3;
  glow?: number;
}> = ({ kind, color, appear, position = [0, 0, 0], glow = 0 }) => {
  const w = kind === "clinic" ? 2.6 : 2.0;
  const h = kind === "clinic" ? 1.7 : 1.3;
  const d = kind === "clinic" ? 1.8 : 1.6;
  const body = useMemo(() => new EdgesGeometry(new BoxGeometry(w, h, d)), [w, h, d]);
  const roof = useMemo(() => {
    if (kind !== "home") return null;
    const r = h * 0.75;
    const v = [
      [-w / 2 - 0.1, 0, d / 2 + 0.1], [w / 2 + 0.1, 0, d / 2 + 0.1], [0, r, d / 2 + 0.1],
      [-w / 2 - 0.1, 0, -d / 2 - 0.1], [w / 2 + 0.1, 0, -d / 2 - 0.1], [0, r, -d / 2 - 0.1],
    ];
    const e = [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [2, 5], [0, 3], [1, 4]];
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(e.flatMap(([a, b]) => [...v[a], ...v[b]])), 3));
    return g;
  }, [kind, w, h, d]);
  if (appear <= 0.001) return null;
  return (
    <group position={position} scale={[1, Math.max(0.001, appear), 1]}>
      <group position={[0, h / 2, 0]}>
        <lineSegments geometry={body}>
          <lineBasicMaterial color={color} transparent opacity={appear} />
        </lineSegments>
        <mesh>
          <boxGeometry args={[w, h, d]} />
          <meshBasicMaterial color={color} transparent opacity={0.06 * appear + 0.08 * glow} side={DoubleSide} depthWrite={false} />
        </mesh>
        <mesh position={[0, -h / 2 + 0.45, d / 2 + 0.001]}>
          <planeGeometry args={[0.5, 0.9]} />
          <meshBasicMaterial color={color} transparent opacity={0.25 + 0.5 * glow} />
        </mesh>
      </group>
      {kind === "clinic" && (
        <group position={[0, h + 0.45, 0]}>
          <mesh>
            <boxGeometry args={[0.16, 0.55, 0.16]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.55, 0.16, 0.16]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <Glow color={color} size={1.4} opacity={0.35 + 0.4 * glow} />
        </group>
      )}
      {roof && (
        <lineSegments geometry={roof} position={[0, h, 0]}>
          <lineBasicMaterial color={color} transparent opacity={appear} />
        </lineSegments>
      )}
      {kind === "home" && (
        <mesh position={[w / 4, h * 0.62, d / 2 + 0.001]}>
          <planeGeometry args={[0.45, 0.4]} />
          <meshBasicMaterial color={color} transparent opacity={0.3 + 0.5 * glow} />
        </mesh>
      )}
    </group>
  );
};

/** A glowing case card that can travel along a path. */
export const CaseToken: React.FC<{ color: string; appear: number; position: Vec3; pulse?: number }> = ({ color, appear, position, pulse = 0 }) => {
  const frame = useCurrentFrame();
  if (appear <= 0.001) return null;
  const bob = Math.sin(frame * 0.06) * 0.06;
  return (
    <group position={[position[0], position[1] + 0.45 + bob, position[2]]} scale={appear * (1 + 0.15 * pulse)}>
      <mesh rotation={[0, Math.sin(frame * 0.02) * 0.35, 0]}>
        <boxGeometry args={[0.5, 0.64, 0.05]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7 + 0.5 * pulse} />
      </mesh>
      <Glow color={color} size={1.6 + pulse} opacity={0.55 + 0.3 * pulse} />
    </group>
  );
};
