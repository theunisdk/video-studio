// Series looks: a design saved under series/<name>/ so several videos can share it.
//   pnpm series:export <videoId> <name>   save a video's look as series/<name>/
//   pnpm series:use <name> <videoId>      copy series/<name>/ into videos/<videoId>/ for a new episode
// An episode copies the series (tokens, components, brand files) rather than pointing at it,
// so it renders the same way forever and works when its folder is copied on its own.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { designFiles, designSchema, type Design } from "../src/video/design";

const [command, a, b, ...extra] = process.argv.slice(2);
const usage = "Usage: pnpm series:export <videoId> <name> | pnpm series:use <name> <videoId>";
const idPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;
if (!a || !b || extra.length || !idPattern.test(a) || !idPattern.test(b)) throw new Error(usage);

type SeriesMeta = { name: string; exportedFrom: string; exportedAt: string; voice?: unknown };

const readJson = (path: string): Record<string, unknown> => JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
const writeJson = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value, null, 2) + "\n");

/** Copies `from` to `to` unless `to` already holds different content, which it refuses to overwrite. */
const copyInto = (from: string, to: string): "copied" | "same" => {
  if (existsSync(to)) {
    if (readFileSync(to).equals(readFileSync(from))) return "same";
    throw new Error(`${to} already exists and differs from ${from}; move it aside first`);
  }
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  return "copied";
};

/** Rewrites every file path in a design with `map`. */
const remapFiles = (d: Design, map: (p: string) => string): Design => {
  const font = (t: Design["fonts"]["display"] | undefined) => (t && "files" in t ? { ...t, files: t.files.map((f) => ({ ...f, src: map(f.src) })) } : t);
  return {
    ...d,
    fonts: { display: font(d.fonts.display)!, body: font(d.fonts.body)!, ...(d.fonts.mono ? { mono: font(d.fonts.mono) } : {}) },
    background: d.background.src ? { ...d.background, src: map(d.background.src) } : d.background,
    ...(d.logo ? { logo: { ...d.logo, src: map(d.logo.src) } } : {}),
  };
};

const continuity = (d: Design, meta: SeriesMeta, kickers: string[]) => `
## Continuity

Fixed in every episode:

- Palette: ${Object.entries(d.palette).filter(([, v]) => typeof v === "string").map(([k, v]) => `${k} ${v}`).join(", ")}${d.palette.accents.length ? `; accents ${d.palette.accents.join(", ")}` : ""}
- Fonts: display ${d.fonts.display.family}, body ${d.fonts.body.family}${d.fonts.mono ? `, mono ${d.fonts.mono.family}` : ""}
- Title treatment: ${d.title}. Caption treatment: ${d.caption}.
- Motion: ${d.motion}. Transition: ${d.transition.kind}${d.transition.kind === "cut" ? "" : ` (${d.transition.frames} frames)`}.
- Background: ${d.background.kind}${d.background.grain ? ` with grain ${d.background.grain}` : ""}. Shape: radius ${d.shape.radius}, stroke ${d.shape.stroke}, shadow ${d.shape.shadow}.
- Logo: ${d.logo ? `${d.logo.placement}, ${d.logo.height}px high` : "none"}.
- Voice: the \`voice\` block in series.json.
- Kickers: ${kickers.length ? `follow the pattern of ${kickers.slice(0, 3).map((k) => `"${k}"`).join(", ")}` : "none"}.
- Intro and outro: the components in components/, if any, open and close every episode.

May vary per episode: the scene layouts, the subject's own screenshots and diagrams, accents chosen from the palette for
the subject's parts, and the number of scenes.

Exported from \`${meta.exportedFrom}\` on ${meta.exportedAt.slice(0, 10)}.
`;

const exportSeries = (videoId: string, name: string) => {
  const src = join("videos", videoId);
  const spec = readJson(join(src, "video.json"));
  if (!spec.design) throw new Error(`videos/${videoId}/video.json has no design block to export`);
  const design = designSchema.parse(spec.design);
  const dest = join("series", name);
  if (existsSync(dest)) throw new Error(`${dest} already exists; pick another name, or delete it first if it should be replaced`);
  mkdirSync(join(dest, "assets"), { recursive: true });

  const moved = new Map<string, string>();
  for (const file of designFiles(design)) {
    if (!existsSync(join(src, file))) throw new Error(`design names ${file}, but ${join(src, file)} does not exist`);
    const target = file.startsWith("assets/") ? file : `assets/${basename(file)}`;
    if ([...moved.values()].includes(target)) throw new Error(`two design files would both be saved as ${target}; rename one`);
    copyInto(join(src, file), join(dest, target));
    moved.set(file, target);
  }
  const components = existsSync(join(src, "components")) ? readdirSync(join(src, "components")).filter((f) => /\.tsx?$/.test(f)) : [];
  for (const f of components) copyInto(join(src, "components", f), join(dest, "components", f));

  const meta: SeriesMeta = { name, exportedFrom: videoId, exportedAt: new Date().toISOString(), voice: spec.voice };
  writeJson(join(dest, "design.json"), remapFiles(design, (p) => moved.get(p) ?? p));
  writeJson(join(dest, "series.json"), meta);
  const kickers = ((spec.scenes as { kicker?: string }[] | undefined) ?? []).map((s) => s.kicker).filter((k): k is string => !!k);
  const direction = existsSync(join(src, "design.md")) ? readFileSync(join(src, "design.md"), "utf8").trimEnd() + "\n" : `# ${name}\n`;
  writeFileSync(join(dest, "design.md"), /^## Continuity/m.test(direction) ? direction : direction + continuity(design, meta, kickers));

  console.log(`series ${dest}`);
  console.log(`  design.json, series.json, design.md${components.length ? `, components/ (${components.join(", ")})` : ""}${moved.size ? `, assets/ (${[...moved.values()].map((p) => basename(p)).join(", ")})` : ""}`);
  console.log(`Read ${join(dest, "design.md")} and tighten its Continuity section: say what must stay fixed and what may vary.`);
};

const useSeries = (name: string, videoId: string) => {
  const from = join("series", name);
  if (!existsSync(join(from, "design.json"))) throw new Error(`No series "${name}" (series/${name}/design.json is missing)`);
  const design = designSchema.parse(readJson(join(from, "design.json")));
  const meta = existsSync(join(from, "series.json")) ? (readJson(join(from, "series.json")) as SeriesMeta) : null;
  const dest = join("videos", videoId);
  mkdirSync(dest, { recursive: true });

  const copied: string[] = [];
  for (const file of designFiles(design)) {
    if (!existsSync(join(from, file))) throw new Error(`series design names ${file}, but ${join(from, file)} does not exist`);
    if (copyInto(join(from, file), join(dest, file)) === "copied") copied.push(file);
  }
  if (existsSync(join(from, "components"))) {
    for (const f of readdirSync(join(from, "components")).filter((x) => /\.tsx?$/.test(x))) {
      if (copyInto(join(from, "components", f), join(dest, "components", f)) === "copied") copied.push(`components/${f}`);
    }
  }
  if (existsSync(join(from, "design.md")) && copyInto(join(from, "design.md"), join(dest, "design.md")) === "copied") copied.push("design.md");

  const specPath = join(dest, "video.json");
  const spec = existsSync(specPath) ? readJson(specPath) : { id: videoId };
  if (spec.series && spec.series !== name) throw new Error(`${specPath} already belongs to series "${String(spec.series)}"`);
  spec.series = name;
  spec.design = readJson(join(from, "design.json"));
  if (meta?.voice && !spec.voice) spec.voice = meta.voice;
  writeJson(specPath, spec);

  console.log(`videos/${videoId} now uses series ${name}`);
  console.log(`  video.json: series, design${meta?.voice ? ", voice (if it had none)" : ""}`);
  if (copied.length) console.log(`  copied: ${copied.join(", ")}`);
  if (meta?.voice && JSON.stringify(spec.voice) !== JSON.stringify(meta.voice)) console.log("  note: video.json keeps its own voice, which differs from the series voice");
};

if (command === "export") exportSeries(a, b);
else if (command === "use") useSeries(a, b);
else throw new Error(usage);
