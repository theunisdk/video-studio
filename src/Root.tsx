import { Composition } from "remotion";
import { videos } from "./videos";

export const Root: React.FC = () => (
  <>
    {videos.map((v) => (
      <Composition
        key={v.id}
        id={v.id}
        component={v.Component}
        durationInFrames={v.timeline.durationInFrames}
        fps={v.timeline.fps}
        width={v.width}
        height={v.height}
        defaultProps={{ videoId: v.videoId, timeline: v.timeline }}
      />
    ))}
  </>
);
