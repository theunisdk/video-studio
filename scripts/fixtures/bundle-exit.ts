// Child process for bundle.test.ts: gets a bundle in TMPDIR (a fake one handed to removeOnExit, or a real
// bundleForRender), then ends as argv[2] says.
import { chmodSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bundleForRender, removeOnExit } from "../bundle";

const how = process.argv[2];
const dir = how === "real" ? await bundleForRender() : mkdtempSync(join(tmpdir(), "remotion-webpack-bundle-"));
if (how !== "real") removeOnExit(dir);
console.log(dir);

if (how === "throw" || how === "real") throw new Error("render exploded");
if (how === "exit1") process.exit(1);
if (how === "sigint") process.kill(process.pid, "SIGINT"), setTimeout(() => {}, 5000);
if (how === "sigterm") process.kill(process.pid, "SIGTERM"), setTimeout(() => {}, 5000);
// Stands in for Remotion's browser: it takes SIGTERM, and the render then fails on its own.
if (how === "sigterm-handled") {
  process.once("SIGTERM", () => setTimeout(() => process.exit(1), 10));
  process.kill(process.pid, "SIGTERM"), setTimeout(() => {}, 5000);
}
if (how === "locked") chmodSync(tmpdir(), 0o555);
