// Soft, clay-style 3D illustration pieces: people, rooms, furniture, trees, paths.
// Everything is built from rounded primitives so it reads as illustration, not CAD.
import { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, DoubleSide, Vector3 } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { lerp } from "./anim";
import type { Vec3 } from "./camera";

const roundedCache = new Map<string, RoundedBoxGeometry>();
const rounded = (w: number, h: number, d: number, r: number) => {
  const key = `${w}|${h}|${d}|${r}`;
  let g = roundedCache.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2));
    roundedCache.set(key, g);
  }
  return g;
};

type MatProps = { color: string; emissive?: string; emissiveIntensity?: number; opacity?: number };
const Mat: React.FC<MatProps> = ({ color, emissive, emissiveIntensity = 0, opacity = 1 }) => (
  <meshStandardMaterial
    color={color}
    roughness={0.82}
    metalness={0}
    emissive={emissive ?? "#000000"}
    emissiveIntensity={emissiveIntensity}
    transparent={opacity < 1}
    opacity={opacity}
  />
);

/** A rounded box resting with its centre at `position`. */
export const RBox: React.FC<{ size: Vec3; radius?: number; position?: Vec3; rotation?: Vec3 } & MatProps> = ({
  size,
  radius = 0.06,
  position,
  rotation,
  ...mat
}) => (
  <mesh geometry={rounded(size[0], size[1], size[2], radius)} position={position} rotation={rotation} castShadow receiveShadow>
    <Mat {...mat} />
  </mesh>
);

const Sphere: React.FC<{ r: number; position?: Vec3; scale?: Vec3 } & MatProps> = ({ r, position, scale, ...mat }) => (
  <mesh position={position} scale={scale} castShadow receiveShadow>
    <sphereGeometry args={[r, 32, 24]} />
    <Mat {...mat} />
  </mesh>
);

const Capsule: React.FC<{ r: number; len: number; position?: Vec3; scale?: Vec3 } & MatProps> = ({ r, len, position, scale, ...mat }) => (
  <mesh position={position} scale={scale} castShadow receiveShadow>
    <capsuleGeometry args={[r, len, 8, 20]} />
    <Mat {...mat} />
  </mesh>
);

const Cyl: React.FC<{ rTop: number; rBottom?: number; h: number; position?: Vec3; rotation?: Vec3; scale?: Vec3 } & MatProps> = ({
  rTop,
  rBottom,
  h,
  position,
  rotation,
  scale,
  ...mat
}) => (
  <mesh position={position} rotation={rotation} scale={scale} castShadow receiveShadow>
    <cylinderGeometry args={[rTop, rBottom ?? rTop, h, 32]} />
    <Mat {...mat} />
  </mesh>
);

// ---------------------------------------------------------------- people

export type Pose = {
  hipL: number; hipR: number; kneeL: number; kneeR: number;
  shoulderLX: number; shoulderLZ: number; elbowL: number;
  shoulderRX: number; shoulderRZ: number; elbowR: number;
  headX: number; headY: number; torsoX: number;
};

export const standPose: Pose = {
  hipL: 0, hipR: 0, kneeL: 0, kneeR: 0,
  shoulderLX: 0.05, shoulderLZ: 0.12, elbowL: -0.15,
  shoulderRX: 0.05, shoulderRZ: -0.12, elbowR: -0.15,
  headX: 0, headY: 0, torsoX: 0,
};

export const sitPose: Pose = { ...standPose, hipL: -1.5, hipR: -1.5, kneeL: 1.5, kneeR: 1.5, shoulderLX: -0.3, shoulderRX: -0.3, elbowL: -0.6, elbowR: -0.6 };

/** Right hand raised holding a phone in front of the face. */
export const lookAtPhoneR = (p: Pose): Pose => ({ ...p, shoulderRX: -0.9, shoulderRZ: -0.05, elbowR: -1.6, headX: 0.25 });
/** Right arm stretched forward and down, pointing the phone at something low (a wound). */
export const photoDownR = (p: Pose): Pose => ({ ...p, shoulderRX: -1.15, shoulderRZ: 0.05, elbowR: -0.25, headX: 0.45, torsoX: 0.15 });
/** Phone held close to the mouth (voice note). */
export const voiceNoteR = (p: Pose): Pose => ({ ...p, shoulderRX: -0.55, shoulderRZ: -0.25, elbowR: -2.3, headX: 0.05 });

export const walkPose = (phase: number): Pose => {
  const s = Math.sin(phase);
  return {
    ...standPose,
    hipL: -0.45 * s, hipR: 0.45 * s,
    kneeL: Math.max(0, 0.6 * Math.sin(phase + 1.2)), kneeR: Math.max(0, -0.6 * Math.sin(phase + 1.2)),
    shoulderLX: 0.4 * s, shoulderRX: -0.4 * s,
  };
};

export const mixPose = (a: Pose, b: Pose, t: number): Pose =>
  Object.fromEntries(Object.keys(a).map((k) => [k, lerp(a[k as keyof Pose], b[k as keyof Pose], t)])) as Pose;

/** Hip height above the floor when standing. */
export const STAND_HIP = 0.86;

export type Look = {
  skin: string;
  hair: string;
  hairStyle: "bun" | "short" | "long";
  top: string;
  bottom: string;
  shoes: string;
  sleeves?: "short" | "long";
  stethoscope?: boolean;
  bandage?: "left" | "right";
};

const Leg: React.FC<{ x: number; hip: number; knee: number; look: Look; bandage: boolean }> = ({ x, hip, knee, look, bandage }) => (
  <group position={[x, 0, 0]} rotation={[hip, 0, 0]}>
    <Capsule r={0.085} len={0.28} position={[0, -0.2, 0]} color={look.bottom} />
    <group position={[0, -0.42, 0]} rotation={[knee, 0, 0]}>
      <Capsule r={0.072} len={0.26} position={[0, -0.19, 0]} color={look.bottom} />
      {bandage && <Cyl rTop={0.088} h={0.16} position={[0, -0.2, 0]} color="#fbfbf8" />}
      <RBox size={[0.12, 0.08, 0.24]} radius={0.035} position={[0, -0.4, 0.05]} color={look.shoes} />
    </group>
  </group>
);

const Arm: React.FC<{ side: 1 | -1; sx: number; sz: number; elbow: number; look: Look; phone: boolean; phoneGlow: number }> = ({
  side,
  sx,
  sz,
  elbow,
  look,
  phone,
  phoneGlow,
}) => (
  <group position={[0.235 * side, 0.63, 0]} rotation={[sx, 0, sz]}>
    <Capsule r={0.058} len={0.2} position={[0, -0.14, 0]} color={look.top} />
    <group position={[0, -0.29, 0]} rotation={[elbow, 0, 0]}>
      <Capsule r={0.05} len={0.18} position={[0, -0.13, 0]} color={look.sleeves === "long" ? look.top : look.skin} />
      <Sphere r={0.058} position={[0, -0.27, 0]} color={look.skin} />
      {phone && (
        <group position={[0, -0.3, 0.05]} rotation={[-0.2, 0, 0]}>
          <RBox size={[0.09, 0.17, 0.016]} radius={0.007} color="#1f2a30" />
          <mesh position={[0, 0, 0.0095]}>
            <planeGeometry args={[0.078, 0.15]} />
            <meshStandardMaterial color="#cfeee3" emissive="#8fe0c6" emissiveIntensity={0.35 + phoneGlow} />
          </mesh>
        </group>
      )}
    </group>
  </group>
);

/** A friendly, faceless-ish clay figure. Origin is the hip centre; place it at STAND_HIP or seat height. */
export const Person: React.FC<{
  look: Look;
  pose: Pose;
  position?: Vec3;
  rotationY?: number;
  phone?: boolean;
  phoneGlow?: number;
  seed?: number;
  opacity?: number;
  scale?: number;
}> = ({ look, pose, position, rotationY = 0, phone = false, phoneGlow = 0, seed = 0, scale = 1 }) => {
  const frame = useCurrentFrame();
  const breathe = 1 + 0.012 * Math.sin(frame * 0.09 + seed);
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <RBox size={[0.36, 0.17, 0.22]} radius={0.07} position={[0, 0.02, 0]} color={look.bottom} />
      <Leg x={-0.1} hip={pose.hipL} knee={pose.kneeL} look={look} bandage={look.bandage === "left"} />
      <Leg x={0.1} hip={pose.hipR} knee={pose.kneeR} look={look} bandage={look.bandage === "right"} />
      <group rotation={[pose.torsoX, 0, 0]}>
        <group scale={[1, breathe, 1]}>
          <Capsule r={0.18} len={0.3} position={[0, 0.38, 0]} scale={[1.12, 1, 0.78]} color={look.top} />
        </group>
        {look.stethoscope && (
          <group position={[0, 0.66, 0.02]} rotation={[1.25, 0, 0]}>
            <mesh castShadow>
              <torusGeometry args={[0.12, 0.012, 8, 32, Math.PI * 1.3]} />
              <Mat color="#3b4a52" />
            </mesh>
            <Sphere r={0.03} position={[0.08, -0.08, 0.06]} color="#9aa7ad" />
          </group>
        )}
        <Arm side={-1} sx={pose.shoulderLX} sz={pose.shoulderLZ} elbow={pose.elbowL} look={look} phone={false} phoneGlow={0} />
        <Arm side={1} sx={pose.shoulderRX} sz={pose.shoulderRZ} elbow={pose.elbowR} look={look} phone={phone} phoneGlow={phoneGlow} />
        <Cyl rTop={0.055} h={0.12} position={[0, 0.74, 0]} color={look.skin} />
        <group position={[0, 0.9, 0]} rotation={[pose.headX, pose.headY, 0]}>
          <Sphere r={0.15} color={look.skin} />
          <Sphere r={0.017} position={[-0.052, 0.01, 0.135]} color="#2b2522" />
          <Sphere r={0.017} position={[0.052, 0.01, 0.135]} color="#2b2522" />
          <mesh rotation={[-0.45, 0, 0]} castShadow>
            <sphereGeometry args={[0.162, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
            <Mat color={look.hair} />
          </mesh>
          {look.hairStyle === "bun" && <Sphere r={0.075} position={[0, 0.09, -0.15]} color={look.hair} />}
          {look.hairStyle === "long" && <RBox size={[0.3, 0.32, 0.1]} radius={0.05} position={[0, -0.1, -0.1]} color={look.hair} />}
        </group>
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- rooms & furniture

/** A cutaway room: floor plus back and left walls, open to the camera. Origin is floor centre. */
export const Room: React.FC<{
  size: [number, number];
  wallHeight?: number;
  floor: string;
  wall: string;
  trim?: string;
  windowX?: number;
  windowGlow?: number;
  position?: Vec3;
  children?: React.ReactNode;
}> = ({ size: [w, d], wallHeight = 2.5, floor, wall, trim = "#ffffff", windowX = 0.6, windowGlow = 0, position, children }) => (
  <group position={position}>
    <RBox size={[w, 0.16, d]} radius={0.06} position={[0, -0.08, 0]} color={floor} />
    <RBox size={[w, wallHeight, 0.14]} radius={0.05} position={[0, wallHeight / 2, -d / 2 + 0.07]} color={wall} />
    <RBox size={[0.14, wallHeight, d]} radius={0.05} position={[-w / 2 + 0.07, wallHeight / 2, 0]} color={wall} />
    <RBox size={[w, 0.12, 0.05]} radius={0.02} position={[0, 0.06, -d / 2 + 0.16]} color={trim} />
    {/* window with frame */}
    <group position={[windowX, wallHeight * 0.58, -d / 2 + 0.15]}>
      <RBox size={[1.25, 0.95, 0.05]} radius={0.03} color={trim} />
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[1.1, 0.8]} />
        <meshStandardMaterial color="#cfe6f2" emissive="#fff3d6" emissiveIntensity={0.25 + windowGlow} />
      </mesh>
      <RBox size={[0.04, 0.8, 0.03]} radius={0.01} position={[0, 0, 0.04]} color={trim} />
    </group>
    {children}
  </group>
);

export const ExamBed: React.FC<{ position?: Vec3; rotationY?: number; color?: string }> = ({ position, rotationY = 0, color = "#9fd8cf" }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <RBox size={[1.8, 0.42, 0.7]} radius={0.08} position={[0, 0.21, 0]} color="#f4f5f2" />
    <RBox size={[1.85, 0.13, 0.74]} radius={0.06} position={[0, 0.48, 0]} color={color} />
    <RBox size={[0.45, 0.12, 0.6]} radius={0.06} position={[-0.68, 0.6, 0]} rotation={[0, 0, 0.12]} color="#ffffff" />
    <mesh position={[0.15, 0.546, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[1.3, 0.5]} />
      <meshStandardMaterial color="#ffffff" />
    </mesh>
  </group>
);

export const Cabinet: React.FC<{ position?: Vec3; color?: string }> = ({ position, color = "#ffffff" }) => (
  <group position={position}>
    <RBox size={[0.9, 1.0, 0.45]} radius={0.05} position={[0, 0.5, 0]} color={color} />
    {[0.3, 0.62].map((y) => (
      <RBox key={y} size={[0.22, 0.04, 0.03]} radius={0.015} position={[0, y, 0.235]} color="#c9d2d6" />
    ))}
    <RBox size={[0.18, 0.22, 0.18]} radius={0.04} position={[-0.22, 1.11, 0]} color="#e9f3f6" />
    <Cyl rTop={0.06} h={0.22} position={[0.2, 1.11, 0]} color="#7cc4b4" />
  </group>
);

/** Green-cross clinic sign, flat against a wall. */
export const CrossSign: React.FC<{ position?: Vec3; color?: string }> = ({ position, color = "#3fb68b" }) => (
  <group position={position}>
    <RBox size={[0.6, 0.6, 0.06]} radius={0.1} color="#ffffff" />
    <RBox size={[0.14, 0.4, 0.04]} radius={0.02} position={[0, 0, 0.04]} color={color} />
    <RBox size={[0.4, 0.14, 0.04]} radius={0.02} position={[0, 0, 0.04]} color={color} />
  </group>
);

export const Plant: React.FC<{ position?: Vec3; scale?: number; leaf?: string; pot?: string }> = ({ position, scale = 1, leaf = "#6fae7a", pot = "#d98b6c" }) => {
  const frame = useCurrentFrame();
  const sway = Math.sin(frame * 0.04) * 0.03;
  return (
    <group position={position} scale={scale}>
      <Cyl rTop={0.2} rBottom={0.15} h={0.32} position={[0, 0.16, 0]} color={pot} />
      <group rotation={[0, 0, sway]}>
        <Sphere r={0.22} position={[0, 0.5, 0]} scale={[1, 1.2, 1]} color={leaf} />
        <Sphere r={0.17} position={[0.15, 0.68, 0.05]} color={new Color(leaf).offsetHSL(0, 0, 0.05).getStyle()} />
        <Sphere r={0.15} position={[-0.14, 0.72, -0.03]} color={new Color(leaf).offsetHSL(0, 0, -0.04).getStyle()} />
      </group>
    </group>
  );
};

export const Desk: React.FC<{ position?: Vec3; rotationY?: number; color?: string }> = ({ position, rotationY = 0, color = "#e8d5bd" }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <RBox size={[1.3, 0.07, 0.65]} radius={0.03} position={[0, 0.74, 0]} color={color} />
    {[-0.58, 0.58].map((x) => (
      <RBox key={x} size={[0.06, 0.72, 0.56]} radius={0.02} position={[x, 0.36, 0]} color="#f4f1ec" />
    ))}
    <Cyl rTop={0.055} rBottom={0.05} h={0.12} position={[0.4, 0.84, 0.1]} color="#f2b866" />
  </group>
);

export const Chair: React.FC<{ position?: Vec3; rotationY?: number; color?: string }> = ({ position, rotationY = 0, color = "#7cc4b4" }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <RBox size={[0.5, 0.08, 0.5]} radius={0.04} position={[0, 0.46, 0]} color={color} />
    <RBox size={[0.5, 0.5, 0.07]} radius={0.04} position={[0, 0.72, -0.22]} color={color} />
    <Cyl rTop={0.035} h={0.42} position={[0, 0.21, 0]} color="#9aa7ad" />
    <Cyl rTop={0.22} h={0.03} position={[0, 0.015, 0]} color="#9aa7ad" />
  </group>
);

export const Sofa: React.FC<{ position?: Vec3; rotationY?: number; color?: string }> = ({ position, rotationY = 0, color = "#e0957a" }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <RBox size={[2.1, 0.36, 0.9]} radius={0.1} position={[0, 0.24, 0]} color={color} />
    <RBox size={[2.1, 0.62, 0.24]} radius={0.1} position={[0, 0.62, -0.34]} color={color} />
    {[-1, 1].map((s) => (
      <RBox key={s} size={[0.24, 0.52, 0.9]} radius={0.1} position={[s * 0.98, 0.42, 0]} color={color} />
    ))}
    {[-0.44, 0.44].map((x) => (
      <RBox key={x} size={[0.86, 0.14, 0.7]} radius={0.07} position={[x, 0.48, 0.06]} color={new Color(color).offsetHSL(0, 0, 0.06).getStyle()} />
    ))}
    <RBox size={[0.4, 0.36, 0.14]} radius={0.07} position={[-0.6, 0.72, -0.16]} rotation={[0, 0.2, 0.1]} color="#f6e7d6" />
    {[-0.9, 0.9].map((x) => (
      <Cyl key={x} rTop={0.04} h={0.08} position={[x, 0.04, 0.32]} color="#8a6a4f" />
    ))}
  </group>
);

export const Ottoman: React.FC<{ position?: Vec3; color?: string }> = ({ position, color = "#9fb4d8" }) => (
  <group position={position}>
    <Cyl rTop={0.32} h={0.36} position={[0, 0.18, 0]} color={color} />
    <Cyl rTop={0.3} h={0.04} position={[0, 0.38, 0]} color={new Color(color).offsetHSL(0, 0, 0.06).getStyle()} />
  </group>
);

export const FloorLamp: React.FC<{ position?: Vec3; on?: number }> = ({ position, on = 1 }) => (
  <group position={position}>
    <Cyl rTop={0.18} h={0.04} position={[0, 0.02, 0]} color="#3b4a52" />
    <Cyl rTop={0.022} h={1.5} position={[0, 0.77, 0]} color="#3b4a52" />
    <mesh position={[0, 1.6, 0]} castShadow>
      <cylinderGeometry args={[0.18, 0.3, 0.32, 32, 1, true]} />
      <meshStandardMaterial color="#fff3dc" emissive="#ffd59a" emissiveIntensity={0.6 * on} side={DoubleSide} />
    </mesh>
    <pointLight position={[0, 1.45, 0.1]} color="#ffcf8a" intensity={2.5 * on} distance={4} decay={2} />
  </group>
);

export const Rug: React.FC<{ position?: Vec3; size?: [number, number]; color?: string }> = ({ position, size = [2.4, 1.6], color = "#c9d9c3" }) => (
  <mesh position={position} scale={[size[0] / 2, 1, size[1] / 2]} receiveShadow>
    <cylinderGeometry args={[1, 1, 0.02, 48]} />
    <Mat color={color} />
  </mesh>
);

export const Frame: React.FC<{ position?: Vec3; size?: [number, number]; art?: string }> = ({ position, size = [0.6, 0.45], art = "#f2b866" }) => (
  <group position={position}>
    <RBox size={[size[0], size[1], 0.04]} radius={0.02} color="#ffffff" />
    <mesh position={[0, 0, 0.025]}>
      <planeGeometry args={[size[0] * 0.78, size[1] * 0.72]} />
      <meshStandardMaterial color={art} />
    </mesh>
  </group>
);

export const SideTable: React.FC<{ position?: Vec3; color?: string }> = ({ position, color = "#e8d5bd" }) => (
  <group position={position}>
    <Cyl rTop={0.26} h={0.05} position={[0, 0.52, 0]} color={color} />
    <Cyl rTop={0.03} h={0.5} position={[0, 0.25, 0]} color="#8a6a4f" />
    <Cyl rTop={0.16} h={0.03} position={[0, 0.015, 0]} color="#8a6a4f" />
  </group>
);

// ---------------------------------------------------------------- outdoors

export const Tree: React.FC<{ position?: Vec3; scale?: number; leaf?: string; seed?: number }> = ({ position, scale = 1, leaf = "#8cc38e", seed = 0 }) => {
  const frame = useCurrentFrame();
  const sway = Math.sin(frame * 0.035 + seed) * 0.025;
  return (
    <group position={position} scale={scale} rotation={[0, 0, sway]}>
      <Cyl rTop={0.08} rBottom={0.12} h={0.9} position={[0, 0.45, 0]} color="#a07a5c" />
      <Sphere r={0.62} position={[0, 1.35, 0]} color={leaf} />
      <Sphere r={0.45} position={[0.35, 1.7, 0.1]} color={new Color(leaf).offsetHSL(0, 0, 0.05).getStyle()} />
      <Sphere r={0.4} position={[-0.3, 1.75, -0.05]} color={new Color(leaf).offsetHSL(0, 0.02, -0.03).getStyle()} />
    </group>
  );
};

export const Bush: React.FC<{ position?: Vec3; scale?: number; color?: string }> = ({ position, scale = 1, color = "#9acb94" }) => (
  <group position={position} scale={scale}>
    <Sphere r={0.32} position={[0, 0.22, 0]} scale={[1.3, 0.8, 1]} color={color} />
    <Sphere r={0.24} position={[0.3, 0.2, 0.05]} scale={[1, 0.8, 1]} color={new Color(color).offsetHSL(0, 0, 0.04).getStyle()} />
  </group>
);

export const Ground: React.FC<{ color?: string; radius?: number }> = ({ color = "#dde8d3", radius = 40 }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.17, 0]} receiveShadow>
    <circleGeometry args={[radius, 64]} />
    <Mat color={color} />
  </mesh>
);

/** A flat ribbon on the ground following `points`; draws in with `progress`. */
export const GroundPath: React.FC<{ points: Vec3[]; width?: number; color: string; progress?: number; y?: number; emissive?: number }> = ({
  points,
  width = 0.7,
  color,
  progress = 1,
  y = -0.15,
  emissive = 0,
}) => {
  const geometry = useMemo(() => {
    const curve = new CatmullRomCurve3(points.map((p) => new Vector3(...p)));
    const n = 200;
    const pos = new Float32Array((n + 1) * 2 * 3);
    const idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      const p = curve.getPoint(i / n);
      const tan = curve.getTangent(i / n);
      const side = new Vector3(-tan.z, 0, tan.x).normalize().multiplyScalar(width / 2);
      pos.set([p.x + side.x, y, p.z + side.z, p.x - side.x, y, p.z - side.z], i * 6);
      if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [points, width, y]);
  geometry.setDrawRange(0, Math.floor((geometry.index?.count ?? 0) * Math.max(0, Math.min(1, progress)) / 6) * 6);
  if (progress <= 0.001) return null;
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color={color} roughness={0.9} emissive={color} emissiveIntensity={emissive} side={DoubleSide} polygonOffset polygonOffsetFactor={-1} />
    </mesh>
  );
};

/** World point at `t` along a path drawn by GroundPath/Trail. */
export const pathPoint = (points: Vec3[], t: number): Vec3 =>
  new CatmullRomCurve3(points.map((p) => new Vector3(...p))).getPoint(Math.min(1, Math.max(0, t))).toArray() as Vec3;

/** A map-pin style marker standing on the ground. */
export const Pin: React.FC<{ position: Vec3; color: string; appear: number; lit?: number }> = ({ position, color, appear, lit = 1 }) => {
  if (appear <= 0.001) return null;
  return (
    <group position={position} scale={appear}>
      <Sphere r={0.16} position={[0, 0.55, 0]} color={color} emissive={color} emissiveIntensity={0.25 * lit} />
      <mesh position={[0, 0.32, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <coneGeometry args={[0.1, 0.32, 24]} />
        <Mat color={color} />
      </mesh>
      <Sphere r={0.06} position={[0, 0.55, 0.13]} color="#ffffff" />
    </group>
  );
};

/** Soft daylight: sky/ground fill plus one warm key light with soft shadows. */
export const DaylightRig: React.FC<{ center?: Vec3; warmth?: number }> = ({ center = [0, 0, 0], warmth = 0 }) => (
  <>
    <hemisphereLight args={["#ffffff", "#d8cbb6", 1.6]} />
    <ambientLight intensity={0.25} />
    <directionalLight
      position={[center[0] + 6, 11, center[2] + 7]}
      color={new Color("#fff6e8").lerp(new Color("#ffd9a8"), warmth).getStyle()}
      intensity={2.4}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-16}
      shadow-camera-right={16}
      shadow-camera-top={12}
      shadow-camera-bottom={-12}
      shadow-camera-near={1}
      shadow-camera-far={40}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
      shadow-radius={6}
    />
  </>
);
