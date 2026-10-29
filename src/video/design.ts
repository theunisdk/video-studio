import { z } from "zod";

// The `design` block of video.json: the tokens a video's look is built from.
// Every field but `look`, `palette` and `fonts` has a default, so a short block is enough.

const hex = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "a hex colour like #1a2b3c");

/** A file inside the video folder (or a series folder), relative to it, e.g. "assets/logo.svg". */
export const relativePath = z
  .string()
  .regex(/^(?![/\\])(?!.*(?:^|[/\\])\.\.(?:[/\\]|$))[\w ./-]+$/, "a path inside the video folder, e.g. assets/logo.svg");

const weight = z.number().int().min(100).max(900);

/** A Google Fonts family by name, or a font in local files that live in the video folder. */
export const fontTokenSchema = z.union([
  z.object({
    family: z.string().min(1).max(80),
    files: z
      .array(z.object({ src: relativePath, weight: weight.default(400), style: z.enum(["normal", "italic"]).default("normal") }))
      .min(1),
  }),
  z.object({
    family: z.string().min(1).max(80),
    weights: z.array(weight).min(1).default([400, 700]),
  }),
]);

export const titleTreatments = ["banner", "hero", "lowerThird", "rail", "kinetic", "none"] as const;
export const captionTreatments = ["pill", "strip", "outline", "highlight"] as const;
export const transitionKinds = ["cut", "crossfade", "wipe", "push", "zoom", "iris"] as const;
export const motionPresets = ["calm", "snappy", "bouncy", "mechanical"] as const;
export const backgroundKinds = ["solid", "gradient", "grid", "dots", "grain", "texture"] as const;

export const titleTreatmentSchema = z.enum(titleTreatments);
export const captionTreatmentSchema = z.enum(captionTreatments);

export const transitionSchema = z.object({
  kind: z.enum(transitionKinds),
  /** Length of the overlap, centred on the scene edge. Ignored for "cut". */
  frames: z.number().int().min(0).max(60).default(16),
  direction: z.enum(["left", "right", "up", "down"]).default("left"),
});

export const designSchema = z.object({
  /** The look this design started from (a looks/ entry), or a short name of your own. */
  look: z.string().min(1).max(60),
  palette: z.object({
    bg: hex,
    /** Cards, panels, caption boxes. */
    surface: hex,
    fg: hex,
    muted: hex,
    line: hex,
    accent: hex,
    /** Text on an accent fill; picked for contrast when left out. */
    onAccent: hex.optional(),
    /** Further colours for categories, parts or steps, in order. */
    accents: z.array(hex).max(8).default([]),
  }),
  fonts: z.object({ display: fontTokenSchema, body: fontTokenSchema, mono: fontTokenSchema.optional() }),
  type: z
    .object({
      titleCase: z.enum(["none", "upper"]).default("none"),
      /** Letter spacing for titles, in em. */
      titleTracking: z.number().min(-0.1).max(0.4).default(0),
      /** Multiplies every title treatment's type size. */
      titleScale: z.number().min(0.6).max(1.6).default(1),
    })
    .default({ titleCase: "none", titleTracking: 0, titleScale: 1 }),
  shape: z
    .object({
      radius: z.number().min(0).max(64).default(14),
      stroke: z.number().min(0).max(8).default(1),
      shadow: z.enum(["none", "soft", "hard", "glow"]).default("soft"),
    })
    .default({ radius: 14, stroke: 1, shadow: "soft" }),
  background: z
    .object({
      kind: z.enum(backgroundKinds).default("solid"),
      /** Gradient stops; defaults to bg into a slightly shifted bg. */
      colors: z.array(hex).min(2).max(4).optional(),
      angle: z.number().min(0).max(360).default(160),
      /** Grid or dot spacing in px. */
      size: z.number().min(8).max(400).default(64),
      /** Texture image, for kind "texture". */
      src: relativePath.optional(),
      /** Film grain over any kind, 0 to 0.4. */
      grain: z.number().min(0).max(0.4).default(0),
    })
    .refine((b) => b.kind !== "texture" || b.src, { message: 'background kind "texture" needs a src' })
    .default({ kind: "solid", angle: 160, size: 64, grain: 0 }),
  motion: z.enum(motionPresets).default("calm"),
  transition: transitionSchema.default({ kind: "crossfade", frames: 16, direction: "left" }),
  title: titleTreatmentSchema.default("banner"),
  caption: captionTreatmentSchema.default("pill"),
  logo: z
    .object({
      src: relativePath,
      placement: z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]).default("top-right"),
      height: z.number().min(16).max(240).default(56),
    })
    .optional(),
  /** Overrides for single kit colours (furniture, star field, browser frame), when the derived ones don't suit. */
  kit: z
    .object({
      star: hex.optional(),
      highlight: hex.optional(),
      furniture: z.record(z.string(), hex).optional(),
    })
    .optional(),
});

export type Design = z.infer<typeof designSchema>;
export type FontToken = z.infer<typeof fontTokenSchema>;
export type TitleTreatment = z.infer<typeof titleTreatmentSchema>;
export type CaptionTreatment = z.infer<typeof captionTreatmentSchema>;
export type TransitionSpec = z.infer<typeof transitionSchema>;
export type TransitionKind = TransitionSpec["kind"];
export type MotionPresetName = Design["motion"];

/** Every file a design names (local fonts, texture, logo), relative to the folder it lives in. */
export const designFiles = (design: Design): string[] =>
  [
    ...[design.fonts.display, design.fonts.body, design.fonts.mono].flatMap((f) => (f && "files" in f ? f.files.map((x) => x.src) : [])),
    design.background.src,
    design.logo?.src,
  ].filter((p, i, all): p is string => !!p && all.indexOf(p) === i);
