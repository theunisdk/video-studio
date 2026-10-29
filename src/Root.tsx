import { Composition } from "remotion";
import { galleryCells } from "./gallery/cells";
import { Gallery } from "./gallery/Gallery";
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
        defaultProps={{ videoId: v.videoId, timeline: v.timeline, ...(v.design ? { design: v.design } : {}) }}
      />
    ))}
    <Composition id="kit-gallery" component={Gallery} durationInFrames={600} fps={30} width={1920} height={1080} defaultProps={{ cell: galleryCells[0].id }} />
  </>
);
