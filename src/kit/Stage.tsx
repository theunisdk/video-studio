import { createContext, useContext, useMemo } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { NeutralToneMapping, PCFSoftShadowMap } from "three";
import { colors, darkTheme, ThemeContext, type Theme } from "./theme";
import { projectPoint, toThreeCamera, type CameraState, type Projection, type Vec3 } from "./camera";

const ProjectorContext = createContext<((p: Vec3) => Projection) | null>(null);

export const useProject = () => {
  const project = useContext(ProjectorContext);
  if (!project) throw new Error("useProject must be used inside <Stage>");
  return project;
};

/** Like useProject, but null outside a <Stage> (for 2D scenes that reuse 3D-capable overlays). */
export const useProjectIfStaged = () => useContext(ProjectorContext);

// Mutated during render: ThreeCanvas advances R3F after each frame commit.
const CameraRig: React.FC<{ state: CameraState }> = ({ state }) => {
  const camera = useThree((s) => s.camera);
  camera.position.set(...state.position);
  camera.lookAt(...state.target);
  if ("fov" in camera) {
    camera.fov = state.fov;
    camera.updateProjectionMatrix();
  }
  return null;
};

/**
 * A WebGL world with an HTML overlay layer that can anchor to 3D points.
 * `look="lit"` switches from the flat neon style to soft shadows and filmic-neutral tone mapping.
 */
export const Stage: React.FC<{
  camera: CameraState;
  world: React.ReactNode;
  overlay?: React.ReactNode;
  /** Any CSS background; the WebGL canvas is transparent over it. */
  background?: string;
  look?: "flat" | "lit";
  theme?: Theme;
}> = ({ camera, world, overlay, background = colors.bg, look = "flat", theme = darkTheme }) => {
  const { width, height } = useVideoConfig();
  const project = useMemo(() => {
    const cam = toThreeCamera(camera, width, height);
    return (p: Vec3) => projectPoint(cam, width, height, p);
  }, [camera, width, height]);

  return (
    <AbsoluteFill style={{ background }}>
      <ThreeCanvas
        width={width}
        height={height}
        flat={look === "flat"}
        shadows={look === "lit" ? { type: PCFSoftShadowMap } : false}
        gl={{ antialias: true, alpha: true, ...(look === "lit" ? { toneMapping: NeutralToneMapping } : {}) }}
      >
        <CameraRig state={camera} />
        {world}
      </ThreeCanvas>
      <ThemeContext.Provider value={theme}>
        <ProjectorContext.Provider value={project}>
          <AbsoluteFill>{overlay}</AbsoluteFill>
        </ProjectorContext.Provider>
      </ThemeContext.Provider>
    </AbsoluteFill>
  );
};
