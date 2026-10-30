// Child process for bundle.test.ts: makes a fake bundle in TMPDIR, hands it to removeOnExit, then ends as argv[2] says.
import { chmodSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { removeOnExit } from "../bundle";

const dir = mkdtempSync(join(tmpdir(), "remotion-webpack-bundle-"));
removeOnExit(dir);
console.log(dir);

const how = process.argv[2];
if (how === "throw") throw new Error("render exploded");
if (how === "exit1") process.exit(1);
if (how === "sigint") process.kill(process.pid, "SIGINT"), setTimeout(() => {}, 5000);
if (how === "locked") chmodSync(tmpdir(), 0o555);
