// Read-only browser for capturing real screenshots of an app or site. Every request that could change data is
// aborted and recorded as a violation, unless the capture recipe lets it through (allowWrite, allowWebSocket) or
// answers it with a canned response (fakeWrites, via route.fulfill). Nothing a recipe fakes ever reaches the server.
// GET, HEAD and OPTIONS are treated as reads and always pass: don't click links that change data on a GET.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, errors, type BrowserContext, type Locator, type Page, type Route } from "playwright";
import type { Box, CaptureStep } from "../../src/kit/walkthrough";

export type FakeWrite = {
  /** Which write this answers, e.g. "PATCH /members". Listed in capture.json under `simulated`. */
  name: string;
  match: (method: string, url: URL) => boolean;
  body: (request: { postDataJSON: () => unknown }) => unknown;
};

export type ReadRewrite = { name: string; match: (url: URL) => boolean; transform: (json: unknown) => unknown };

export type BrowserOptions = {
  baseURL?: string;
  viewport: { width: number; height: number };
  deviceScaleFactor?: number;
  locale?: string;
  timezoneId?: string;
  /** Requests dropped outright, e.g. analytics. */
  block?: (url: URL) => boolean;
  /** Writes allowed through to the server, e.g. a login POST. `loggedIn` stays false until markLoggedIn(). */
  allowWrite?: (method: string, url: URL, loggedIn: boolean) => boolean;
  /** WebSockets allowed to connect. Everything else is closed, since messages on a socket can change data. */
  allowWebSocket?: (url: URL) => boolean;
  /** JSON GET responses to rewrite before the page sees them. */
  rewriteReads?: ReadRewrite[];
  fakeWrites?: FakeWrite[];
  /** Runs before the first page opens, e.g. context.addInitScript(). */
  init?: (context: BrowserContext) => Promise<unknown>;
};

export type Harness = {
  context: BrowserContext;
  page: Page;
  /** Writes that were aborted, and rewrites or fakes that failed. Must be empty for a capture to count. */
  violations: string[];
  /** Fake writes that were answered, in order. */
  faked: string[];
  /** Read rewrites that were applied, in order. */
  rewritten: string[];
  markLoggedIn: () => void;
  close: () => Promise<void>;
};

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function openBrowser(opts: BrowserOptions): Promise<Harness> {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      baseURL: opts.baseURL,
      viewport: opts.viewport,
      deviceScaleFactor: opts.deviceScaleFactor ?? 2,
      serviceWorkers: "block",
      locale: opts.locale,
      timezoneId: opts.timezoneId,
    });
    const violations: string[] = [];
    const faked: string[] = [];
    const rewritten: string[] = [];
    let loggedIn = false;

    await context.route("**/*", async (route: Route) => {
      const req = route.request();
      const url = new URL(req.url());
      const method = req.method();
      if (opts.block?.(url)) return route.abort("blockedbyclient");

      if (READ_METHODS.has(method)) {
        const rewrite = method === "GET" ? opts.rewriteReads?.find((r) => r.match(url)) : undefined;
        if (!rewrite) return route.fallback();
        let response;
        try {
          response = await route.fetch();
          const json = rewrite.transform(await response.json());
          if (json === undefined) throw new Error("transform returned undefined");
          rewritten.push(`${rewrite.name}: ${url.pathname}`);
          return route.fulfill({ response, json });
        } catch (e) {
          violations.push(`rewrite "${rewrite.name}" failed on ${url.pathname}: ${(e as Error).message}`);
          return response ? route.fulfill({ response }) : route.abort("failed");
        }
      }

      if (opts.allowWrite?.(method, url, loggedIn)) return route.fallback();
      const fake = opts.fakeWrites?.find((f) => f.match(method, url));
      if (fake) {
        try {
          const body = JSON.stringify(fake.body(req));
          if (body === undefined) throw new Error("body returned undefined");
          faked.push(`${fake.name}: ${method} ${url.pathname}`);
          return route.fulfill({ status: 200, contentType: "application/json", body });
        } catch (e) {
          violations.push(`fake "${fake.name}" failed on ${method} ${url.pathname}: ${(e as Error).message}`);
          return route.abort("failed");
        }
      }
      violations.push(`${method} ${url.origin}${url.pathname}`);
      return route.abort("blockedbyclient");
    });

    await context.routeWebSocket(/.*/, (ws) => {
      const url = new URL(ws.url());
      if (opts.allowWebSocket?.(url)) return void ws.connectToServer();
      violations.push(`WebSocket ${url.origin}${url.pathname}`);
      ws.close().catch(() => {});
    });
    await opts.init?.(context);

    const page = await context.newPage();
    return {
      context,
      page,
      violations,
      faked,
      rewritten,
      markLoggedIn: () => {
        loggedIn = true;
      },
      close: async () => {
        await context.close();
        await browser.close();
      },
    };
  } catch (e) {
    await browser.close();
    throw e;
  }
}

/** Numbered screenshots plus the step list `Walkthrough` plays (target boxes in CSS px). */
export const recorder = (page: Page, outDir: string) => {
  mkdirSync(outDir, { recursive: true });
  const steps: CaptureStep[] = [];
  /** Steps captured while the network was still busy. */
  const unsettled: string[] = [];
  return {
    steps,
    unsettled,
    /** Waits for the page to settle, then saves NN-<id>.png and the target's box. */
    snap: async (id: string, action: "click" | "type" | "check" | "observe", label: string, target: Locator | null) => {
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch((e) => {
        if (!(e instanceof errors.TimeoutError)) throw e;
        unsettled.push(id);
        console.log(`${id}: network still busy after 10s, capturing anyway`);
      });
      await page.waitForTimeout(600);
      await target?.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {
        throw new Error(`${id}: target is not visible`);
      });
      await target?.scrollIntoViewIfNeeded();
      const box: Box | null = target ? await target.boundingBox() : null;
      if (target && !box) throw new Error(`${id}: target is not visible`);
      const view = page.viewportSize();
      if (box && view && (box.x < 0 || box.y < 0 || box.x + box.width > view.width || box.y + box.height > view.height)) {
        throw new Error(`${id}: target is not fully inside the viewport`);
      }
      const shot = `${String(steps.length + 1).padStart(2, "0")}-${id}.png`;
      await page.screenshot({ path: join(outDir, shot) });
      steps.push({ id, shot, target: box, action, label });
      console.log(`${shot}  ${label}`);
    },
    write: (meta: Record<string, unknown>) => {
      const viewport = page.viewportSize();
      writeFileSync(join(outDir, "capture.json"), JSON.stringify({ ...meta, viewport, unsettled, steps }, null, 2) + "\n");
    },
  };
};
