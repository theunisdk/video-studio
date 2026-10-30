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

export const removeOnExit = (dir: string) => {
  if (!owned.size) {
    process.once("exit", () => owned.forEach(removeBundle));
    // Without a listener a signal ends the process without an exit event.
    for (const [signal, code] of [["SIGINT", 130], ["SIGTERM", 143], ["SIGHUP", 129]] as const) {
      process.once(signal, () => process.exit(code));
    }
  }
  owned.add(dir);
};

// onDirectoryCreated fires before webpack runs, so a bundle that fails to compile is removed too.
export const bundleForRender = () =>
  bundle({ entryPoint: resolve("src/index.ts"), publicDir: resolve("videos"), onDirectoryCreated: removeOnExit });
