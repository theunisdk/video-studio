// Usage: pnpm capture-site <videoId> <url> [<url> ...]
// Research for a video about a public website: for each page, a viewport screenshot, a full-page screenshot and
// the visible text, written to videos/<videoId>/research/. Read-only: forms cannot submit (see harness.ts).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { errors } from "playwright";
import { openBrowser } from "./harness";

const [videoId, ...args] = process.argv.slice(2);
if (!videoId || !args.length) throw new Error("Usage: pnpm capture-site <videoId> <url> [<url> ...]");
const urls = args.map((a) => new URL(/^https?:\/\//i.test(a) ? a : `https://${a}`));
const outDir = join("videos", videoId, "research");
mkdirSync(outDir, { recursive: true });

const h = await openBrowser({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const pages: { url: string; finalUrl: string; status: number; settled: boolean; title: string; description: string | null; files: string[] }[] = [];
const failed: string[] = [];
try {
  for (const [i, url] of urls.entries()) {
    try {
      const response = await h.page.goto(url.href, { waitUntil: "commit", timeout: 60_000 });
      if (!response) throw new Error("no document response");
      if (!response.ok()) throw new Error(`HTTP ${response.status()}`);
      // Pages that keep polling never go network-idle; what has loaded by then is still worth capturing.
      const settled = await h.page.waitForLoadState("networkidle", { timeout: 30_000 }).then(
        () => true,
        (e) => {
          if (e instanceof errors.TimeoutError) return false;
          throw e;
        },
      );
      await h.page.waitForTimeout(800);
      const slug = `${String(i + 1).padStart(2, "0")}-${url.pathname.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home"}`;
      await h.page.screenshot({ path: join(outDir, `${slug}.png`) });
      await h.page.screenshot({ path: join(outDir, `${slug}-full.png`), fullPage: true });
      const title = await h.page.title();
      const meta = h.page.locator('meta[name="description"]').first();
      const description = (await meta.count()) ? await meta.getAttribute("content") : null;
      const text = await h.page.locator("body").innerText();
      writeFileSync(join(outDir, `${slug}.txt`), `${title}\n${h.page.url()}\n\n${text}\n`);
      pages.push({ url: url.href, finalUrl: h.page.url(), status: response.status(), settled, title, description, files: [`${slug}.png`, `${slug}-full.png`, `${slug}.txt`] });
      console.log(`${slug}  ${title}${settled ? "" : "  (network still busy after 30s)"}`);
    } catch (e) {
      failed.push(`${url.href}: ${(e as Error).message.split("\n")[0]}`);
    }
  }
  writeFileSync(join(outDir, "sources.json"), JSON.stringify({ capturedAt: new Date().toISOString(), pages, failed }, null, 2) + "\n");
  if (h.violations.length) console.log(`blocked writes (expected on a read-only capture): ${h.violations.length}`);
  console.log(`wrote ${outDir}/`);
} finally {
  await h.close();
}
if (failed.length) {
  console.error(`Could not capture:\n${failed.join("\n")}`);
  process.exit(1);
}
