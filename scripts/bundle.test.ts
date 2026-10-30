import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { removeBundle } from "./bundle";

let root: string;
beforeEach(() => (root = mkdtempSync(join(tmpdir(), "bundle-test-"))));
afterEach(() => {
  chmodSync(root, 0o755);
  rmSync(root, { recursive: true, force: true });
});

const run = (how: string) => {
  const child = spawnSync(process.execPath, ["--import", "tsx", resolve("scripts/fixtures/bundle-exit.ts"), how], {
    env: { ...process.env, TMPDIR: root },
    encoding: "utf8",
  });
  return { code: child.status, dir: child.stdout.trim(), stderr: child.stderr };
};

for (const [how, code] of [["done", 0], ["exit1", 1], ["sigint", 130]] as const) {
  test(`removes the bundle when the render ends with ${how}`, () => {
    const r = run(how);
    assert.equal(r.code, code, r.stderr);
    assert.ok(r.dir.startsWith(join(root, "remotion-webpack-bundle-")));
    assert.equal(existsSync(r.dir), false);
  });
}

test("removes the bundle after a throw and still reports the error", () => {
  const r = run("throw");
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /render exploded/);
  assert.equal(existsSync(r.dir), false);
});

test("leaves other sessions' bundles alone", () => {
  const other = join(root, "remotion-webpack-bundle-other");
  mkdirSync(other);
  const r = run("done");
  assert.equal(existsSync(r.dir), false);
  assert.equal(existsSync(other), true);
});

test("a bundle that cannot be removed warns but keeps the render's exit code", () => {
  const r = run("locked");
  assert.equal(r.code, 0);
  assert.match(r.stderr, /WARNING: could not remove the Remotion bundle/);
  assert.equal(existsSync(r.dir), true);
});

test("refuses to remove a dir that is not a bundle in the temp dir", (t) => {
  const keep = mkdtempSync(join(tmpdir(), "not-a-bundle-"));
  const nested = join(root, "remotion-webpack-bundle-nested");
  mkdirSync(nested);
  t.after(() => rmSync(keep, { recursive: true, force: true }));
  t.mock.method(console, "error", () => {});
  removeBundle(keep);
  removeBundle(nested);
  assert.equal(existsSync(keep), true);
  assert.equal(existsSync(nested), true);
});
