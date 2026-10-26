import { PerspectiveCamera, Vector3 } from "three";
import { lerp, ramp } from "./anim";

export type Vec3 = [number, number, number];
export type CameraState = { position: Vec3; target: Vec3; fov: number };
export type CameraMove = CameraState & { at: number; duration: number };

const mix = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** Holds each shot, then eases into the next one at its `at` frame. */
export const cameraAt = (frame: number, moves: CameraMove[]): CameraState => {
  let state: CameraState = moves[0];
  for (const move of moves.slice(1)) {
    const t = ramp(frame, move.at, move.duration);
    if (t <= 0) break;
    state = {
      position: mix(state.position, move.position, t),
      target: mix(state.target, move.target, t),
      fov: lerp(state.fov, move.fov, t),
    };
  }
  return state;
};

export const toThreeCamera = (state: CameraState, width: number, height: number): PerspectiveCamera => {
  const cam = new PerspectiveCamera(state.fov, width / height, 0.1, 400);
  cam.position.set(...state.position);
  cam.lookAt(new Vector3(...state.target));
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
};

export type Projection = { x: number; y: number; pxPerUnit: number; inFront: boolean };

/** World point -> pixel position, plus how many pixels one world unit spans at that depth. */
export const projectPoint = (cam: PerspectiveCamera, width: number, height: number, p: Vec3): Projection => {
  const v = new Vector3(...p).project(cam);
  const up = new Vector3(p[0], p[1] + 1, p[2]).project(cam);
  const x = ((v.x + 1) / 2) * width;
  const y = ((1 - v.y) / 2) * height;
  const upY = ((1 - up.y) / 2) * height;
  return { x, y, pxPerUnit: Math.abs(y - upY), inFront: v.z < 1 };
};
