// Series looks: a design saved under series/<name>/ so several videos can share it.
//   pnpm series:export <videoId> <name>   save a video's look as series/<name>/
//   pnpm series:use <name> <videoId>      copy series/<name>/ into videos/<videoId>/ for a new episode
// An episode copies the series (tokens, components, brand files) rather than pointing at it,
// so it renders the same way forever and works when its folder is copied on its own.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { designFiles, designSchema, type Design } from "../src/video/design";
import { videoSchema, type SceneSpec } from "../src/video/schema";

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

const transitionText = (t: Design["transition"]) =>
  t.kind === "cut" ? "cut" : `${t.kind}${t.kind === "wipe" || t.kind === "push" ? ` ${t.direction}` : ""} (${t.frames} frames)`;

/** Where a scene sits, in words another episode can follow (its id is the source video's own). */
const position = (i: number, count: number, id: string) =>
  `${i === 0 ? "the opening scene" : i === count - 1 ? "the closing scene" : `scene ${i + 1} of ${count}`} (\`${id}\` in the source)`;

const overrides = (scenes: SceneSpec[], pick: (s: SceneSpec, i: number) => string | undefined) =>
  scenes.flatMap((s, i) => {
    const value = pick(s, i);
    return value ? [`${position(i, scenes.length, s.id)} uses ${value}`] : [];
  });

const continuity = (d: Design, meta: SeriesMeta, scenes: SceneSpec[]) => {
  const titleOverrides = overrides(scenes, (s) => (s.title && s.title !== d.title ? s.title : undefined));
  // A transition belongs to the edge into its scene, so the opening scene has none.
  const transitionOverrides = overrides(scenes, (s, i) =>
    i > 0 && s.transition && JSON.stringify(s.transition) !== JSON.stringify(d.transition) ? transitionText(s.transition) : undefined,
  );
  const kicked = scenes.filter((s) => s.kicker);
  const drawnByScenes = kicked.some((s) => (s.title ?? d.title) === "none");
  const kickers = kicked.length
    ? `follow the pattern of ${kicked.slice(0, 3).map((s) => `"${s.kicker}"`).join(", ")}` +
      (drawnByScenes ? ". Where the title treatment is none, the scenes draw them themselves, so keep writing them" : "")
    : "none; leave `kicker` out";
  return `## Continuity

Generated from the design block and scenes of \`${meta.exportedFrom}\` on ${meta.exportedAt.slice(0, 10)}.

Fixed in every episode:

- Palette: ${Object.entries(d.palette).filter(([, v]) => typeof v === "string").map(([k, v]) => `${k} ${v}`).join(", ")}${d.palette.accents.length ? `; accents ${d.palette.accents.join(", ")}` : ""}
- Fonts: display ${d.fonts.display.family}, body ${d.fonts.body.family}${d.fonts.mono ? `, mono ${d.fonts.mono.family}` : ""}
- Title treatment: ${d.title}${titleOverrides.length ? `, except ${titleOverrides.join("; ")}` : ""}. Caption treatment: ${d.caption}.
- Motion: ${d.motion}. Transition: ${transitionText(d.transition)}${transitionOverrides.length ? `, except ${transitionOverrides.join("; ")}` : ""}.
- Background: ${d.background.kind}${d.background.grain ? ` with grain ${d.background.grain}` : ""}. Shape: radius ${d.shape.radius}, stroke ${d.shape.stroke}, shadow ${d.shape.shadow}.
- Logo: ${d.logo ? `${d.logo.placement}, ${d.logo.height}px high` : "none"}.
- Voice: the \`voice\` block in series.json.
- Kickers: ${kickers}.
- Intro and outro: the components in components/, if any, open and close every episode.

May vary per episode: the scene layouts, the subject's own screenshots and diagrams, accents chosen from the palette for
the subject's parts, and the number of scenes.
`;
};

/** The source video's design.md, quoted, so its subject-specific prose never reads as a series rule. */
const sourceNotes = (videoId: string, text: string) =>
  `
## Notes from the source video

Quoted from \`videos/${videoId}/design.md\`, written for that video alone. It explains why the look was chosen; its
subject, devices and scene notes are not rules for other episodes. The Continuity section above is the rule.

${text
  .trimEnd()
  .split("\n")
  .map((line) => (line ? `> ${line}` : ">"))
  .join("\n")}
`;

/** True for a video committed to the repo (the public examples), whose files must never name a series. */
const isPublic = (file: string) => {
  try {
    execFileSync("git", ["check-ignore", "-q", file], { stdio: "ignore" });
    return false;
  } catch (e) {
    return (e as { status?: number }).status === 1;
  }
};

const exportSeries = (videoId: string, name: string) => {
  const src = join("videos", videoId);
  const spec = readJson(join(src, "video.json"));
  const { design, scenes } = videoSchema.parse(spec);
  if (!design) throw new Error(`videos/${videoId}/video.json has no design block to export`);
  if (spec.series && spec.series !== name && existsSync(join("series", String(spec.series)))) {
    throw new Error(`videos/${videoId} is already an episode of series "${String(spec.series)}"; use that series (pnpm series:use ${String(spec.series)} <id>)`);
  }
  const specPath = join(src, "video.json");
  const markSource = !isPublic(specPath);
  const dest = join("series", name);
  if (existsSync(dest)) throw new Error(`${dest} already exists; pick another name, or delete it first if it should be replaced`);

  // Check everything first, then build in a temp folder, so a failure never leaves a half-written series.
  const moved = new Map<string, string>();
  for (const file of designFiles(design)) {
    if (!existsSync(join(src, file))) throw new Error(`design names ${file}, but ${join(src, file)} does not exist`);
    const target = file.startsWith("assets/") ? file : `assets/${basename(file)}`;
    if ([...moved.values()].includes(target)) throw new Error(`two design files would both be saved as ${target}; rename one`);
    moved.set(file, target);
  }
  const entries = existsSync(join(src, "components")) ? readdirSync(join(src, "components"), { withFileTypes: true }) : [];
  const components = entries.filter((f) => f.isFile() && /\.tsx?$/.test(f.name)).map((f) => f.name);
  const left = entries.filter((f) => !components.includes(f.name)).map((f) => f.name);
  const work = `${dest}.tmp-${process.pid}`;
  rmSync(work, { recursive: true, force: true });
  const meta: SeriesMeta = { name, exportedFrom: videoId, exportedAt: new Date().toISOString(), voice: spec.voice };
  try {
    mkdirSync(join(work, "assets"), { recursive: true });
    for (const [file, target] of moved) copyInto(join(src, file), join(work, target));
    for (const f of components) copyInto(join(src, "components", f), join(work, "components", f));

    writeJson(join(work, "design.json"), remapFiles(design, (p) => moved.get(p) ?? p));
    writeJson(join(work, "series.json"), meta);
    const notes = existsSync(join(src, "design.md")) ? sourceNotes(videoId, readFileSync(join(src, "design.md"), "utf8")) : "";
    writeFileSync(join(work, "design.md"), `# Series ${name}\n\n${continuity(design, meta, scenes)}${notes}`);
    renameSync(work, dest);
  } catch (e) {
    rmSync(work, { recursive: true, force: true });
    throw e;
  }
  // The source is the series' first episode, so the next episode's pnpm compare finds it.
  if (markSource) {
    try {
      writeJson(specPath, { ...spec, series: name });
    } catch (e) {
      rmSync(dest, { recursive: true, force: true });
      throw new Error(`series ${name} was not saved: ${specPath} could not be updated: ${(e as Error).message}`);
    }
  }

  console.log(`series ${dest}`);
  console.log(`  design.json, series.json, design.md${components.length ? `, components/ (${components.join(", ")})` : ""}${moved.size ? `, assets/ (${[...moved.values()].map((p) => basename(p)).join(", ")})` : ""}`);
  if (left.length) console.log(`  not copied from components/ (only .ts and .tsx files directly in it travel): ${left.join(", ")}`);
  console.log(
    markSource
      ? `  ${specPath}: series ${name} (it is the first episode)`
      : `  ${specPath} is a public example, so it is not marked as an episode; the first video made with series:use is`,
  );
  console.log(`Read ${join(dest, "design.md")} and tighten its Continuity section: say what must stay fixed and what may vary.`);
};

const useSeries = (name: string, videoId: string) => {
  const from = join("series", name);
  if (!existsSync(join(from, "design.json"))) throw new Error(`No series "${name}" (series/${name}/design.json is missing)`);
  const design = designSchema.parse(readJson(join(from, "design.json")));
  const meta = existsSync(join(from, "series.json")) ? (readJson(join(from, "series.json")) as SeriesMeta) : null;
  const dest = join("videos", videoId);
  const specPath = join(dest, "video.json");
  const spec = existsSync(specPath) ? readJson(specPath) : { id: videoId };
  const seriesDesign = readJson(join(from, "design.json"));
  if (spec.series && spec.series !== name) throw new Error(`${specPath} already belongs to series "${String(spec.series)}"`);
  if (spec.design && JSON.stringify(designSchema.parse(spec.design)) !== JSON.stringify(design)) {
    throw new Error(`${specPath} already has a different design block; remove it first if this video should take series ${name}'s look`);
  }
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

  spec.series = name;
  spec.design = seriesDesign;
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
