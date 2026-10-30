import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
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

const fixture = resolve("scripts/fixtures/bundle-exit.ts");
const run = (how: string, cli = false) => {
  const [cmd, ...args] = cli ? [resolve("node_modules/.bin/tsx"), fixture, how] : [process.execPath, "--import", "tsx", fixture, how];
  const child = spawnSync(cmd, args, { env: { ...process.env, TMPDIR: root }, encoding: "utf8" });
  return { end: child.signal ?? child.status, dir: child.stdout.trim(), stderr: child.stderr };
};

const ends = [["done", 0], ["exit1", 1], ["sigint", "SIGINT"], ["sigterm", "SIGTERM"], ["sigterm-handled", 1], ["deferring", "SIGTERM"]] as const;
for (const [how, end] of ends) {
  test(`removes the bundle when the render ends with ${how}`, () => {
    const r = run(how);
    assert.equal(r.end, end, r.stderr);
    assert.ok(r.dir.startsWith(join(root, "remotion-webpack-bundle-")));
    assert.equal(existsSync(r.dir), false);
  });
}

test("removes the bundle and exits 143 on SIGTERM under the tsx CLI", () => {
  const r = run("sigterm", true);
  assert.equal(r.end, 143, r.stderr);
  assert.ok(r.dir.startsWith(join(root, "remotion-webpack-bundle-")));
  assert.equal(existsSync(r.dir), false);
});

test("removes the bundle after a throw and still reports the error", () => {
  const r = run("throw");
  assert.notEqual(r.end, 0);
  assert.match(r.stderr, /render exploded/);
  assert.equal(existsSync(r.dir), false);
});

test("removes a real bundle when the render throws after bundling", () => {
  const r = run("real");
  assert.notEqual(r.end, 0);
  assert.match(r.stderr, /render exploded/);
  assert.ok(r.dir.split("\n").at(-1)!.startsWith(join(root, "remotion-webpack-bundle-")), r.dir);
  assert.deepEqual(readdirSync(root).filter((f) => f.startsWith("remotion-webpack-bundle-")), []);
});

test("leaves other sessions' bundles alone", () => {
  const other = join(root, "remotion-webpack-bundle-other");
  mkdirSync(other);
  const r = run("done");
  assert.equal(existsSync(r.dir), false);
  assert.equal(existsSync(other), true);
});

// Root can unlink from a read-only dir, so the removal would not fail.
test("a bundle that cannot be removed warns but keeps the render's exit code", { skip: process.getuid?.() === 0 }, () => {
  const r = run("locked");
  assert.equal(r.end, 0);
  assert.match(r.stderr, /WARNING: could not remove the Remotion bundle/);
  assert.equal(existsSync(r.dir), true);
});

test("refuses to remove a dir that is not a bundle in the temp dir", (t) => {
  const keep = mkdtempSync(join(tmpdir(), "not-a-bundle-"));
  const nested = join(root, "remotion-webpack-bundle-nested");
  mkdirSync(nested);
  t.after(() => rmSync(keep, { recursive: true, force: true }));
  const warn = t.mock.method(console, "error", () => {});
  removeBundle(keep);
  removeBundle(nested);
  assert.equal(existsSync(keep), true);
  assert.equal(existsSync(nested), true);
  assert.deepEqual(warn.mock.calls.map((c) => /^WARNING: left .* in place/.test(String(c.arguments[0]))), [true, true]);
});
