// The site's brand for the design step: colours with the CSS role each came from and how much of the page uses it,
// font families with where each is used, and the logo, favicon and og:image saved as files. Read from the computed
// styles of a page that has already loaded, so nothing here changes what the page shows.
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getAvailableFonts } from "@remotion/google-fonts";
import type { Page } from "playwright";

type ColorRole = "background" | "surface" | "text" | "muted" | "link" | "button" | "accent" | "border";
type FontRole = "heading" | "body" | "mono" | "ui";
export type Brand = {
  url: string;
  capturedAt: string;
  colors: { hex: string; role: ColorRole; source: string; share: number }[];
  fonts: { family: string; role: FontRole; source: string; googleFont: boolean }[];
  logo: string | null;
  favicon: string | null;
  ogImage: string | null;
};

/** What the page reports. "icon" is an SVG fill or stroke, resolved to text or accent by its chroma. */
type Usage = { hex: string; role: ColorRole | "icon"; weight: number; source: string };
type FontUsage = { stack: string; role: FontRole; chars: number; source: string };
type Collected = {
  colors: Usage[];
  fonts: FontUsage[];
  logo: { svg: string } | { url: string } | null;
  favicons: { url: string; rel: string; sizes: string | null; type: string | null }[];
  ogImage: string | null;
};

const MAX_COLORS = 16;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

/** Brand files a previous capture may have left, so a re-run never mixes two captures. */
export function clearBrand(researchDir: string) {
  rmSync(join(researchDir, "brand.json"), { force: true });
  const dir = join(researchDir, "brand");
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return;
    throw e;
  }
  for (const name of names) if (/^(logo|favicon|og-image)\.[a-z]+$/.test(name)) rmSync(join(dir, name), { force: true });
}

export async function captureBrand(page: Page, researchDir: string): Promise<Brand> {
  const collected = await inPage(page, collect);
  const brandDir = join(researchDir, "brand");
  mkdirSync(brandDir, { recursive: true });

  // Downloads skip the browser's cookie jar, so they cannot change how the later pages of the capture load.
  const userAgent = await page.evaluate(() => navigator.userAgent);
  // SVGs are cleaned in a blank page of a separate context: the site's own scripts could tamper with DOMParser in its page.
  const browser = page.context().browser();
  if (!browser) throw new Error("no browser to sanitise SVGs in");
  const sandbox = await browser.newContext();
  const clean = async (svg: string) => inPage(sandbox.pages()[0] ?? (await sandbox.newPage()), sanitiseSvg, svg);
  const save = async (name: string, candidates: string[]): Promise<string | null> => {
    for (const url of candidates) {
      if (/^data:[^,]*,$/.test(url)) continue;
      let body = await download(url, userAgent).catch((e: Error) => {
        const cause = (e.cause as NodeJS.ErrnoException | undefined)?.message || (e.cause as NodeJS.ErrnoException | undefined)?.code;
        console.error(`brand: could not download ${name} from ${url}: ${e.message.split("\n")[0]}${cause ? ` (${cause})` : ""}`);
        return null;
      });
      const ext = body && sniff(body);
      if (body && !ext) console.error(`brand: ${name} at ${url} is not an image`);
      if (!body || !ext) continue;
      if (ext === "svg") {
        const svg = await clean(body.toString("utf8")).catch((e: Error) => {
          console.error(`brand: ${name} at ${url} is not a usable SVG: ${e.message.split("\n")[0]}`);
          return null;
        });
        if (!svg) continue;
        if (svg.stripped) console.error(`brand: ${name} at ${url} linked to other files, which were left out`);
        body = Buffer.from(svg.svg);
      }
      writeFileSync(join(brandDir, `${name}.${ext}`), body);
      return `research/brand/${name}.${ext}`;
    }
    return null;
  };

  let logo: string | null = null;
  let favicon: string | null = null;
  let ogImage: string | null = null;
  try {
    if (collected.logo && "svg" in collected.logo) {
      const svg = await clean(collected.logo.svg).catch((e: Error) => {
        console.error(`brand: the header's inline logo is not a usable SVG: ${e.message.split("\n")[0]}`);
        return null;
      });
      if (svg?.stripped) console.error("brand: the header's inline logo linked to other files, which were left out");
      if (svg) {
        writeFileSync(join(brandDir, "logo.svg"), svg.svg);
        logo = "research/brand/logo.svg";
      }
    } else if (collected.logo) logo = await save("logo", [collected.logo.url]);
    favicon = await save("favicon", rankFavicons(collected.favicons, page.url()));
    ogImage = collected.ogImage ? await save("og-image", [collected.ogImage]) : null;
  } finally {
    await sandbox.close();
  }

  const brand: Brand = {
    url: page.url(),
    capturedAt: new Date().toISOString(),
    colors: summariseColors(collected.colors),
    fonts: summariseFonts(collected.fonts),
    logo,
    favicon,
    ogImage,
  };
  writeFileSync(join(researchDir, "brand.json"), JSON.stringify(brand, null, 2) + "\n");
  return brand;
}

/** page.evaluate for a function from this module: tsx wraps named functions in a __name() helper the page lacks. */
async function inPage<A, R>(page: Page, fn: (arg: A) => R, arg?: A): Promise<R> {
  return (await page.evaluate(`(() => { const __name = (f) => f; return (${fn})(${JSON.stringify(arg) ?? ""}); })()`)) as R;
}

/**
 * Runs in a blank page. A site's SVG is untrusted: keep only SVG-namespace elements, without scripts, animation, event
 * handlers or references to other files, so opening the saved file runs and loads nothing.
 */
function sanitiseSvg(text: string): { svg: string; stripped: boolean } {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const INLINE_IMAGE = String.raw`data:image\/(?:png|jpe?g|gif|webp|svg\+xml)[;,]`;
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const svg = doc.documentElement;
  if (svg.namespaceURI !== SVG_NS || svg.localName !== "svg" || doc.getElementsByTagName("parsererror").length) throw new Error("not an SVG document");
  for (const el of [...svg.getElementsByTagName("*")]) {
    if (el.namespaceURI !== SVG_NS || /^(script|foreignObject|animate|set|animateMotion|animateTransform|discard)$/.test(el.localName)) el.remove();
  }
  const walker = doc.createTreeWalker(svg, NodeFilter.SHOW_PROCESSING_INSTRUCTION);
  const instructions: ProcessingInstruction[] = [];
  while (walker.nextNode()) instructions.push(walker.currentNode as ProcessingInstruction);
  for (const pi of instructions) pi.remove();

  let stripped = false;
  // CSS that can only point inside this file: every url() is a #fragment or an inline image, and nothing (escapes,
  // image-set, @-rules) that could spell a URL some other way.
  const local = (css: string) => {
    const urls = css.match(/url\(/gi)?.length ?? 0;
    const safe = [...css.matchAll(new RegExp(String.raw`url\(\s*["']?(?:#|${INLINE_IMAGE})[^"')]*["']?\s*\)`, "gi"))].length;
    return urls === safe && !/\\|image-set|@/i.test(css);
  };
  const scratch = document.createElement("div");
  for (const el of [svg, ...svg.getElementsByTagName("*")]) {
    if (el.localName === "style") {
      // The CSSOM drops @import and decodes escapes, so what is checked is what a viewer would apply.
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(el.textContent ?? "");
      const rules = [...sheet.cssRules].filter((r) => r instanceof CSSStyleRule && local(r.cssText));
      if (rules.length !== sheet.cssRules.length || /@import/i.test(el.textContent ?? "")) stripped = true;
      el.textContent = rules.map((r) => r.cssText).join("\n");
    }
    for (const a of [...el.attributes]) {
      let value = a.value;
      if (a.name === "style") {
        scratch.style.cssText = value;
        value = scratch.style.cssText;
      }
      const ref = /href$/i.test(a.name);
      const inlineImage = /^(image|feImage)$/.test(el.localName) && new RegExp(`^${INLINE_IMAGE}`, "i").test(value.trim());
      const external = ref ? !value.trim().startsWith("#") && !inlineImage : !local(value) && /url\(|image-set|\\/i.test(value);
      if (external && (ref ? /^(use|image|feImage)$/.test(el.localName) : true)) stripped = true;
      if (/^on/i.test(a.name) || external || /^javascript:/i.test(a.value.replace(/[\x00-\x20]/g, ""))) el.removeAttribute(a.name);
      else if (a.name === "style") el.setAttribute("style", value);
    }
  }
  const hidden = "defs, clipPath, mask, symbol, pattern, marker";
  const drawable = [...svg.getElementsByTagName("*")].some((el) => {
    if (el.closest(hidden)) return false;
    if (/^(path|rect|circle|ellipse|polygon|polyline|line|text)$/.test(el.localName)) return true;
    const href = el.getAttribute("href") ?? el.getAttribute("xlink:href");
    if (el.localName === "image") return !!href;
    return el.localName === "use" && !!href && !!svg.querySelector(`[id="${CSS.escape(href.slice(1))}"]`);
  });
  if (!drawable) throw new Error(stripped ? "it only draws files it links to" : "it draws nothing");
  return { svg: new XMLSerializer().serializeToString(svg), stripped };
}

async function download(url: string, userAgent: string): Promise<Buffer> {
  const data = /^data:([^,]*?)(;base64)?,(.*)$/s.exec(url);
  if (data) return data[2] ? Buffer.from(data[3], "base64") : Buffer.from(decodeURIComponent(data[3]));
  const response = await fetch(url, { headers: { "user-agent": userAgent }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > MAX_FILE_BYTES) throw new Error(`larger than ${MAX_FILE_BYTES} bytes`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** The real file type from its first bytes, since servers often send the wrong content type. */
function sniff(b: Buffer): string | null {
  const ascii = (from: number, to: number) => b.subarray(from, to).toString("latin1");
  if (b.length < 12) return null;
  if (b.readUInt32BE(0) === 0x89504e47) return "png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (ascii(0, 4) === "GIF8") return "gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(4, 8) === "ftyp" && /^avi[fs]$/.test(ascii(8, 12))) return "avif";
  if (b.readUInt32BE(0) === 0x00000100) return "ico";
  const head = b.subarray(0, 4096).toString("utf8");
  if (/<svg[\s>]/i.test(head) && !/<html[\s>]/i.test(head)) return "svg";
  return null;
}

/** Best first: an SVG, then the largest declared size (an apple-touch-icon is 180 px unless it says otherwise). */
function rankFavicons(favicons: Collected["favicons"], pageUrl: string): string[] {
  const size = (f: Collected["favicons"][number]) => {
    // Safari's pinned-tab icon is a one-colour silhouette, not the site's icon.
    if (/mask-icon/i.test(f.rel)) return -1;
    if (f.type === "image/svg+xml" || /\.svg(?:[?#]|$)/i.test(f.url) || /\bany\b/i.test(f.sizes ?? "")) return Infinity;
    const declared = Math.max(0, ...[...(f.sizes ?? "").matchAll(/(\d+)x\d+/gi)].map((m) => Number(m[1])));
    return declared || (/apple-touch-icon/i.test(f.rel) ? 180 : 0);
  };
  const ranked = favicons.filter((f) => size(f) >= 0).sort((a, b) => size(b) - size(a));
  return [...new Set([...ranked.map((f) => f.url), new URL("/favicon.ico", pageUrl).href])];
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const chroma = (hex: string) => (Math.max(...rgb(hex)) - Math.min(...rgb(hex))) / 255;
const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex).map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const distance = (a: string, b: string) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
const COLORFUL = 0.2;

function summariseColors(usages: Usage[]): Brand["colors"] {
  type Entry = { hex: string; weight: number; roles: Map<Usage["role"], number>; source: string; best: number };
  const byHex = new Map<string, Entry>();
  for (const u of usages) {
    if (!(u.weight > 0)) continue;
    const e = byHex.get(u.hex) ?? { hex: u.hex, weight: 0, roles: new Map(), source: u.source, best: 0 };
    e.weight += u.weight;
    e.roles.set(u.role, (e.roles.get(u.role) ?? 0) + u.weight);
    if (u.weight > e.best) [e.best, e.source] = [u.weight, u.source];
    byHex.set(u.hex, e);
  }
  // Near-identical shades (anti-aliasing, #fefefe next to #ffffff) count as the more-used one.
  const merged: Entry[] = [];
  for (const e of [...byHex.values()].sort((a, b) => b.weight - a.weight)) {
    const into = merged.find((m) => distance(m.hex, e.hex) < 10);
    if (!into) {
      merged.push(e);
      continue;
    }
    into.weight += e.weight;
    for (const [role, w] of e.roles) into.roles.set(role, (into.roles.get(role) ?? 0) + w);
  }
  merged.sort((a, b) => b.weight - a.weight);
  const total = merged.reduce((sum, e) => sum + e.weight, 0);
  if (!total) return [];

  const dominant = (e: Entry) => [...e.roles].sort((a, b) => b[1] - a[1])[0][0];
  const roleWeight = (role: Usage["role"]) => (e: Entry) => e.roles.get(role) ?? 0;
  const top = (role: Usage["role"]) => [...merged].sort((a, b) => roleWeight(role)(b) - roleWeight(role)(a))[0];
  const page = top("background").roles.get("background") ? top("background").hex : merged[0].hex;
  const mainText = top("text").roles.get("text") ? top("text").hex : null;

  const role = (e: Entry): ColorRole => {
    const r = dominant(e);
    if (r === "icon") return chroma(e.hex) >= COLORFUL ? "accent" : "text";
    if (r === "surface" && chroma(e.hex) >= COLORFUL) return "accent";
    if (r !== "text" || e.hex === mainText || !mainText) return r;
    if (chroma(e.hex) >= COLORFUL) return "accent";
    return contrast(e.hex, page) < contrast(mainText, page) / 1.5 ? "muted" : "text";
  };
  return merged
    .slice(0, MAX_COLORS)
    .map((e) => ({ hex: e.hex, role: role(e), source: e.source, share: Math.round((e.weight / total) * 10_000) / 10_000 }))
    .filter((c) => c.share > 0);
}

const SYSTEM_UI = new Set(["-apple-system", "blinkmacsystemfont", "system-ui", "ui-sans-serif"]);
const GENERIC = new Map([["ui-serif", "serif"], ["ui-monospace", "monospace"], ["ui-rounded", "sans-serif"]]);
let googleFamilies: Map<string, string> | undefined;

/** The family a CSS font stack asks for first, with framework-mangled names (next/font's `__Inter_d65c78`) undone. */
function primaryFamily(stack: string): string {
  const families = [...stack.matchAll(/\s*("[^"]*"|'[^']*'|[^,]+)\s*(?:,|$)/g)].map((m) => m[1].trim().replace(/^["']|["']$/g, ""));
  for (const raw of families) {
    const name = raw.replace(/^__(.+?)_[0-9a-f]{5,8}$/i, (_, n: string) => n.replace(/_/g, " ")).trim();
    if (!name || /\bfallback$/i.test(name)) continue;
    if (SYSTEM_UI.has(name.toLowerCase())) return "system-ui";
    return GENERIC.get(name.toLowerCase()) ?? name;
  }
  return families[0] ?? "";
}

/** The Google Fonts name for a family, also trying self-hosted spellings: "InterVariable", "Inter var", "IBMPlexSans", "GeistSans". */
function googleFamily(family: string): string | null {
  googleFamilies ??= new Map(getAvailableFonts().map((f) => [f.fontFamily.toLowerCase(), f.fontFamily]));
  const plain = family.replace(/\s*(?:variable|var|vf)$/i, "");
  const names = [family, plain];
  if (!/\s/.test(plain)) {
    const spaced = plain.replace(/([a-z])([A-Z])|([A-Z])([A-Z][a-z])/g, "$1$3 $2$4");
    names.push(spaced, spaced.replace(/\s+sans$/i, ""));
  }
  for (const name of names) {
    const hit = googleFamilies.get(name.trim().toLowerCase());
    if (hit) return hit;
  }
  return null;
}

const ROLE_ORDER: FontRole[] = ["body", "heading", "ui", "mono"];

function summariseFonts(usages: FontUsage[]): Brand["fonts"] {
  const groups = new Map<string, { family: string; googleFont: boolean; role: FontRole; chars: number; source: string; best: number }>();
  for (const u of usages) {
    const raw = primaryFamily(u.stack);
    if (!raw) continue;
    const google = googleFamily(raw);
    const family = google ?? raw;
    const role: FontRole = family === "monospace" || /\bmono\b|\bcode\b|consol|courier|menlo|monaco/i.test(family) ? "mono" : u.role;
    const key = `${role}\n${family}`;
    const g = groups.get(key) ?? { family, googleFont: !!google, role, chars: 0, source: u.source, best: 0 };
    g.chars += u.chars;
    if (u.chars > g.best) [g.best, g.source] = [u.chars, u.source];
    groups.set(key, g);
  }
  return ROLE_ORDER.flatMap((role) => {
    const inRole = [...groups.values()].filter((g) => g.role === role).sort((a, b) => b.chars - a.chars);
    const roleChars = inRole.reduce((sum, g) => sum + g.chars, 0);
    return inRole
      .filter((g) => g.chars >= roleChars * 0.15)
      .slice(0, 2)
      .map((g) => ({ family: g.family, role, source: g.source, googleFont: g.googleFont }));
  });
}

/** Runs in the page. Self-contained: Playwright serialises it, so it can use nothing from this module. */
function collect(): Collected {
  const doc = document.documentElement;
  const docW = Math.max(doc.scrollWidth, window.innerWidth);
  const docH = Math.max(doc.scrollHeight, window.innerHeight);
  const vw = window.innerWidth;
  const BUTTON = 'button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]';
  const UI = `${BUTTON}, input, select, textarea, label, nav, [role="navigation"], [role="tab"], [role="menuitem"]`;
  const CONSENT = /onetrust|cookie|consent|gdpr|usercentrics|didomi/i;
  const CONSENT_ROOT = /^(onetrust-consent-sdk|usercentrics-root|usercentrics-cmp-ui|CybotCookiebotDialog|didomi-host)$/;
  const COLOR_RE = /(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\)|#[0-9a-f]{3,8}\b/gi;
  const stops = (image: string) => image.replace(/url\((?:"[^"]*"|'[^']*'|[^)]*)\)/g, "").match(COLOR_RE) ?? [];

  const canvas = document.createElementNS("http://www.w3.org/1999/xhtml", "canvas") as HTMLCanvasElement;
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const cache = new Map<string, { hex: string; alpha: number } | null>();
  /** Any CSS colour the browser understands, as sRGB hex plus alpha. */
  const parse = (css: string) => {
    if (cache.has(css)) return cache.get(css)!;
    let out: { hex: string; alpha: number } | null = null;
    if (css && CSS.supports("color", css)) {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      out = { hex: `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`, alpha: a / 255 };
    }
    cache.set(css, out);
    return out;
  };

  const selector = (el: Element) => {
    const tag = el.tagName.toLowerCase();
    const own =
      el.id && /^[a-z][\w-]{0,40}$/i.test(el.id)
        ? `${tag}#${el.id}`
        : tag + [...el.classList].filter((c) => /^[a-z][\w-]{0,31}$/i.test(c)).slice(0, 2).map((c) => `.${c}`).join("");
    const landmark = el.parentElement?.closest("header, nav, main, footer, aside");
    return landmark ? `${landmark.tagName.toLowerCase()} ${own}` : own;
  };

  type Rect = { x: number; y: number; w: number; h: number };
  const clip = (r: DOMRect): Rect => {
    const x = Math.max(0, r.left + window.scrollX), y = Math.max(0, r.top + window.scrollY);
    const w = Math.max(0, Math.min(docW, r.right + window.scrollX) - x);
    const h = Math.max(0, Math.min(docH, r.bottom + window.scrollY) - y);
    return { x, y, w, h };
  };
  const overlap = (a: Rect, b: Rect) =>
    Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

  const colors: Usage[] = [];
  const fonts: FontUsage[] = [];
  const add = (css: string, role: Usage["role"], weight: number, el: Element) => {
    const c = parse(css);
    if (c && c.alpha >= 0.5 && weight > 0) colors.push({ hex: c.hex, role, weight, source: selector(el) });
  };

  // The canvas takes the root's background, or the body's when the root has none (CSS backgrounds spec).
  const opaque = (css: string) => (parse(css)?.alpha ?? 0) >= 0.5;
  const rootBg = getComputedStyle(doc).backgroundColor;
  const bodyBg = document.body ? getComputedStyle(document.body).backgroundColor : "";
  const canvasEl = opaque(rootBg) || getComputedStyle(doc).backgroundImage !== "none" || !document.body ? doc : document.body;
  const canvasBg = opaque(rootBg) ? rootBg : opaque(bodyBg) ? bodyBg : "#ffffff";
  const page = { r: { x: 0, y: 0, w: docW, h: docH }, sub: 0 };

  const shapes = (svg: SVGSVGElement) => {
    for (const shape of svg.querySelectorAll("path, circle, ellipse, rect, polygon, polyline, line, text, use")) {
      if (!shape.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const cs = getComputedStyle(shape);
      const r = clip(shape.getBoundingClientRect());
      if (!cs.fill.startsWith("url(") && cs.fill !== "none") add(cs.fill, "icon", r.w * r.h * 0.5 * Number(cs.fillOpacity || 1), shape);
      const stroke = parseFloat(cs.strokeWidth) || 0;
      if (cs.stroke !== "none" && !cs.stroke.startsWith("url(")) add(cs.stroke, "icon", (r.w + r.h) * 2 * stroke, shape);
    }
  };

  /** Each element paints its own area less what its nearest painted descendants cover; `owner` is the nearest painted ancestor. */
  const visit = (el: Element, owner: { r: Rect; sub: number }) => {
    if (/^(HEAD|SCRIPT|STYLE|NOSCRIPT|TEMPLATE|LINK|META)$/.test(el.tagName)) return;
    const cs = getComputedStyle(el);
    // A cookie banner is the consent tool's styling, not the site's. Consent tools also tag <body>, so only overlays and
    // the tools' own root elements count.
    const tagged = `${el.id} ${el.getAttribute("class") ?? ""}`;
    if (CONSENT.test(tagged) && (/^(fixed|sticky)$/.test(cs.position) || CONSENT_ROOT.test(el.id))) return;
    const box = cs.display !== "contents";
    if (box && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return;
    const r = box ? clip(el.getBoundingClientRect()) : { x: 0, y: 0, w: 0, h: 0 };
    const area = r.w * r.h;
    if (el instanceof SVGSVGElement) {
      shapes(el);
      return;
    }
    if (/^(IMG|VIDEO|CANVAS|IFRAME|OBJECT|EMBED|PICTURE)$/.test(el.tagName)) {
      owner.sub += overlap(r, owner.r);
      return;
    }

    const clipText = cs.backgroundClip === "text" || cs.getPropertyValue("-webkit-background-clip") === "text";
    const gradient = stops(cs.backgroundImage);
    const paints = el !== canvasEl && area > 0 && !clipText && (opaque(cs.backgroundColor) || cs.backgroundImage !== "none");
    let me = owner;
    if (paints) {
      owner.sub += overlap(r, owner.r);
      me = { r, sub: 0 };
    }

    for (const side of ["Top", "Right", "Bottom", "Left"] as const) {
      const width = parseFloat(cs.getPropertyValue(`border-${side.toLowerCase()}-width`)) || 0;
      const style = cs.getPropertyValue(`border-${side.toLowerCase()}-style`);
      if (width > 0 && style !== "none" && style !== "hidden") {
        add(cs.getPropertyValue(`border-${side.toLowerCase()}-color`), "border", (side === "Top" || side === "Bottom" ? r.w : r.h) * width, el);
      }
    }

    for (const node of el.childNodes) {
      if (node.nodeType !== Node.TEXT_NODE || !/\S/.test(node.textContent ?? "")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const textArea = [...range.getClientRects()].reduce((sum, rect) => {
        const c = clip(rect);
        return sum + c.w * c.h;
      }, 0);
      if (!textArea) continue;
      const fill = cs.getPropertyValue("-webkit-text-fill-color");
      if (clipText) for (const c of gradient) add(c, "accent", textArea / gradient.length, el);
      else {
        // Only a link styled apart from its surroundings has a link colour; a card or heading wrapped in <a> is text.
        const a = el.closest("a[href]");
        const link = a && !el.closest(BUTTON) && a.parentElement && getComputedStyle(a.parentElement).color !== cs.color;
        add(fill && parse(fill)?.alpha ? fill : cs.color, link ? "link" : "text", textArea, el);
      }
      const role: FontRole = el.closest("code, pre, kbd, samp, tt")
        ? "mono"
        : el.closest('h1, h2, h3, h4, h5, h6, [role="heading"]') || parseFloat(cs.fontSize) >= 28
          ? "heading"
          : el.closest(UI)
            ? "ui"
            : "body";
      fonts.push({ stack: cs.fontFamily, role, chars: (node.textContent ?? "").trim().length, source: selector(el) });
    }

    for (const child of el.children) visit(child, me);
    if (el.shadowRoot) for (const child of el.shadowRoot.children) visit(child, me);

    if (paints) {
      const painted = Math.max(0, area - me.sub);
      const role: ColorRole = (el.closest(BUTTON) || el.closest("a[href]") === el) && r.w < vw * 0.5 && r.h < 120
        ? "button"
        : r.w >= vw * 0.9
          ? "background"
          : "surface";
      if (gradient.length) for (const c of gradient) add(c, role, painted / gradient.length, el);
      else if (cs.backgroundImage === "none") add(cs.backgroundColor, role, painted, el);
    }
  };
  for (const child of doc.children) visit(child, page);
  const canvasArea = Math.max(0, page.r.w * page.r.h - page.sub);
  const canvasGradient = stops(getComputedStyle(canvasEl).backgroundImage);
  if (canvasGradient.length) for (const c of canvasGradient) add(c, "background", canvasArea / canvasGradient.length, canvasEl);
  else add(canvasBg, "background", canvasArea, canvasEl);

  // Logo: an SVG in the header, inline or linked, that looks like a logo; else an image that says "logo".
  const site = location.hostname.replace(/^www\./, "").split(".")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  const inHeader = (el: Element) => !!el.closest('header, [role="banner"], nav') || el.getBoundingClientRect().top + window.scrollY < 160;
  const says = (el: Element, word: RegExp) => {
    for (let e: Element | null = el, depth = 0; e && depth < 4; e = e.parentElement, depth++) {
      const attrs = ["id", "class", "alt", "aria-label", "title", "src", "href", "data"].map((a) => e!.getAttribute(a) ?? "").join(" ");
      if (word.test(attrs)) return true;
      if (/^(HEADER|NAV|BODY)$/.test(e.tagName)) break;
    }
    return false;
  };
  const lang = doc.lang.split(/[-_]/)[0].toLowerCase();
  const homeLink = (el: Element) => {
    const a = el.closest("a[href]") as HTMLAnchorElement | null;
    if (!a || !URL.canParse(a.href, location.href)) return false;
    const u = new URL(a.href, location.href);
    return u.hostname.replace(/^www\./, "") === location.hostname.replace(/^www\./, "") && (u.pathname === "/" || /^\/[a-z]{2}[-_][a-z]{2}\/?$/i.test(u.pathname) || /^\/([a-z]{2})\/?$/i.exec(u.pathname)?.[1].toLowerCase() === lang);
  };
  const shown = (el: Element) => {
    const r = el.getBoundingClientRect();
    return el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && r.width >= 16 && r.height >= 12;
  };
  const byPosition = (a: Element, b: Element) => {
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    return ra.top - rb.top || ra.left - rb.left;
  };
  const svgUrl = (el: Element) =>
    el instanceof HTMLImageElement && /\.svg(?:[?#]|$)|^data:image\/svg\+xml/i.test(el.currentSrc || el.src)
      ? el.currentSrc || el.src
      : el instanceof HTMLObjectElement && el.type === "image/svg+xml" && el.data
        ? el.data
        : null;
  const scored = [...document.querySelectorAll("svg, img, object")]
    .filter((el) => (el instanceof SVGSVGElement ? !el.parentElement?.closest("svg") : svgUrl(el)) && shown(el) && inHeader(el))
    .map((el) => {
      const r = el.getBoundingClientRect();
      const score = (says(el, /logo|brand/i) ? 3 : 0) + (homeLink(el) ? 2 : 0) + (r.width / r.height >= 1.8 && r.width >= 60 ? 1 : 0);
      return { el, score };
    })
    .filter((c) => c.score >= 2)
    .sort((a, b) => b.score - a.score || byPosition(a.el, b.el));

  const serialise = (svg: SVGSVGElement) => {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const from = [svg, ...svg.querySelectorAll("*")];
    const to = [clone, ...clone.querySelectorAll("*")];
    // Framework attributes (@click, x-on:click, hx-on:*) are legal in HTML but not in a standalone SVG file.
    for (const el of to) for (const a of [...el.attributes]) if (!/^(?:(?:xlink|xml|xmlns):)?[A-Za-z_][\w.-]*$/.test(a.name)) el.removeAttribute(a.name);
    // Fills set by the page's stylesheet (or currentColor) would be lost outside the page.
    const props = ["fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-opacity", "opacity", "stop-color", "stop-opacity", "color"];
    from.forEach((src, i) => {
      const cs = getComputedStyle(src);
      for (const p of props) (to[i] as SVGElement).style.setProperty(p, cs.getPropertyValue(p));
    });
    const refs = new Set<string>();
    for (const el of [clone, ...clone.querySelectorAll("*")]) {
      const href = el.getAttribute("href") ?? el.getAttribute("xlink:href") ?? "";
      if (href.startsWith("#")) refs.add(href.slice(1));
      for (const m of (el.getAttribute("style") ?? "").matchAll(/url\(["']?#([^"')]+)/g)) refs.add(m[1]);
    }
    const missing = [...refs].filter((id) => !clone.querySelector(`[id="${CSS.escape(id)}"]`)).map((id) => document.getElementById(id));
    if (missing.some(Boolean)) {
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      for (const el of missing) if (el) defs.appendChild(el.cloneNode(true));
      clone.prepend(defs);
    }
    const r = svg.getBoundingClientRect();
    if (!clone.getAttribute("viewBox")) clone.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
    clone.setAttribute("width", String(Math.round(r.width)));
    clone.setAttribute("height", String(Math.round(r.height)));
    return new XMLSerializer().serializeToString(clone);
  };

  let logo: Collected["logo"] = null;
  const best = scored[0]?.el;
  if (best instanceof SVGSVGElement) logo = { svg: serialise(best) };
  else if (best) logo = { url: svgUrl(best)! };
  else {
    const images = [...document.querySelectorAll("img")].filter((img) => (img.currentSrc || img.src) && says(img, /logo/i));
    const ownLogo = (img: HTMLImageElement) => inHeader(img) || (!!site && `${img.alt} ${img.className} ${img.src}`.toLowerCase().includes(site));
    const pick = images.filter(ownLogo).sort((a, b) => Number(shown(b)) - Number(shown(a)) || byPosition(a, b))[0];
    if (pick) logo = { url: pick.currentSrc || pick.src };
  }

  const favicons = [...document.querySelectorAll<HTMLLinkElement>("link[rel][href]")]
    .filter((l) => /(?:^|\s)(?:icon|apple-touch-icon(?:-precomposed)?|mask-icon)(?:\s|$)/i.test(l.rel))
    .map((l) => ({ url: l.href, rel: l.rel, sizes: l.getAttribute("sizes"), type: l.getAttribute("type") }));
  const og = document.querySelector<HTMLMetaElement>('meta[property="og:image"], meta[name="og:image"], meta[property="og:image:url"]')?.content;
  const ogImage = og && URL.canParse(og, document.baseURI) ? new URL(og, document.baseURI).href : null;

  return { colors, fonts, logo, favicons, ogImage };
}
