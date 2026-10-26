import { Config } from "@remotion/cli/config";

// No GPU under WSL/headless servers: render WebGL with SwiftShader through ANGLE.
Config.setChromiumOpenGlRenderer("swangle");
// Each video keeps its audio and screenshots next to its source; staticFile() paths start at videos/.
Config.setPublicDir("./videos");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
