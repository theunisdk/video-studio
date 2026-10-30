// Bundles src/index.ts once per run, and removes that bundle from the temp dir when the process exits.
// An exit hook rather than try/finally, because render.ts leaves through process.exit, which skips finally.
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { bundle } from "@remotion/bundler";

const BUNDLE_PREFIX = "remotion-webpack-bundle-";
const owned = new Set<string>();

export const removeBundle = (dir: string) => {
  if (dirname(dir) !== tmpdir() || !basename(dir).startsWith(BUNDLE_PREFIX)) {
    console.error(`WARNING: left ${dir} in place: not a Remotion bundle in ${tmpdir()}`);
    return;
  }
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch (e) {
    console.error(`WARNING: could not remove the Remotion bundle ${dir}: ${(e as Error).message}`);
  }
};

const SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP"] as const;
let hooked = false;

// A signal can end the process without an exit event, so remove the bundles now. Then step aside and
// re-raise only when no other listener is left to end the process (Remotion's browser, execa's signal-exit).
const onSignal = (signal: NodeJS.Signals) => {
  owned.forEach(removeBundle);
  owned.clear();
  SIGNALS.forEach((s) => process.off(s, onSignal));
  if (!process.listenerCount(signal)) process.kill(process.pid, signal);
};

export const removeOnExit = (dir: string) => {
  if (!hooked) {
    process.once("exit", () => owned.forEach(removeBundle));
    SIGNALS.forEach((s) => process.on(s, onSignal));
    hooked = true;
  }
  owned.add(dir);
};

// onDirectoryCreated fires before webpack runs, so a bundle that fails to compile is removed too.
export const bundleForRender = () =>
  bundle({ entryPoint: resolve("src/index.ts"), publicDir: resolve("videos"), onDirectoryCreated: removeOnExit });
