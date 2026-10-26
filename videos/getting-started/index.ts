import { defineVideo } from "../../src/video/registry";
import { GettingStartedVideo } from "./Video";
import spec from "./video.json";
import voice from "./voice.json";

export default [
  defineVideo(spec, voice, GettingStartedVideo),
];
