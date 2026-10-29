import gsSpec from "../../videos/getting-started/video.json";
import gsVoice from "../../videos/getting-started/voice.json";
import ocSpec from "../../videos/openclaw/video.json";
import ocVoice from "../../videos/openclaw/voice.json";
import { videoSchema, voiceManifestSchema } from "../video/schema";
import { buildTimeline } from "../video/timeline";

/** getting-started's narration has word timings; openclaw's has none. */
export const galleryTimelines = {
  timed: buildTimeline(videoSchema.parse(gsSpec), voiceManifestSchema.parse(gsVoice)),
  untimed: buildTimeline(videoSchema.parse(ocSpec), voiceManifestSchema.parse(ocVoice)),
};
