import { z } from "zod";
import { designSchema, titleTreatmentSchema, transitionSchema } from "./design";

const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);

export const sceneSchema = z.object({
  id,
  kicker: z.string().max(60).optional(),
  headline: z.string().trim().min(2).max(120).optional(),
  narration: z.string().trim().min(4).max(1500),
  /** The heading the narration opens with, spoken as its own phrase; the kit holds a pause after it. */
  spokenHeading: z.string().trim().min(2).max(120).optional(),
  /** Overrides timing.headingPauseSeconds for this scene. */
  headingPauseSeconds: z.number().min(0).max(3).optional(),
  /** Phrases in the narration to hold a pause after, mid-scene; seconds defaults to timing.headingPauseSeconds. */
  pauses: z
    .array(z.object({ after: z.string().trim().min(2).max(200), seconds: z.number().min(0).max(3).optional() }))
    .max(10)
    .optional(),
  minSeconds: z.number().min(0).max(120).default(0),
  /** How this scene's title shows, overriding design.title. */
  title: titleTreatmentSchema.optional(),
  /** The transition into this scene, overriding design.transition. */
  transition: transitionSchema.optional(),
});

export const elevenLabsVoiceSchema = z.object({
  provider: z.literal("elevenlabs"),
  voiceId: z.string().min(1),
  modelId: z.string().min(1),
  settings: z.record(z.string(), z.number()).default({}),
});

/** Kokoro-82M, run offline by scripts/kokoro.ts. The voice name's first letter is its language (a = US English). */
export const kokoroVoiceSchema = z.object({
  provider: z.literal("kokoro"),
  voice: z.string().regex(/^[a-z]{2}_[a-z]+$/).default("af_heart"),
  speed: z.number().min(0.5).max(2).default(1),
  /** espeak language code; defaults from the voice name. */
  lang: z.string().min(2).optional(),
});

export const voiceSchema = z.discriminatedUnion("provider", [elevenLabsVoiceSchema, kokoroVoiceSchema]);

export const videoSchema = z.object({
  id,
  title: z.string().min(3).max(120),
  brief: z.string().min(1),
  fps: z.union([z.literal(24), z.literal(25), z.literal(30), z.literal(60)]).default(30),
  width: z.number().int().min(640).max(3840).default(1920),
  height: z.number().int().min(360).max(2160).default(1080),
  voice: voiceSchema,
  timing: z
    .object({
      leadInSeconds: z.number().min(0).max(3).default(0.35),
      tailSeconds: z.number().min(0).max(5).default(0.9),
      outroSeconds: z.number().min(0).max(10).default(2),
      /** Silence held after a scene's spokenHeading, on top of the voice's own gap. */
      headingPauseSeconds: z.number().min(0).max(3).default(0.6),
      /** Overrides leadInSeconds for the first scene, so the video can hold before the first words. */
      openingLeadInSeconds: z.number().min(0).max(5).optional(),
    })
    .default({ leadInSeconds: 0.35, tailSeconds: 0.9, outroSeconds: 2, headingPauseSeconds: 0.6 }),
  scenes: z
    .array(sceneSchema)
    .min(1)
    .max(40)
    .superRefine((scenes, ctx) =>
      scenes.forEach((s, i) => {
        if (s.spokenHeading && !(s.narration.startsWith(s.spokenHeading) && /^[^\p{L}\p{N}'’-]*\s/u.test(s.narration.slice(s.spokenHeading.length)))) {
          ctx.addIssue({ code: "custom", path: [i, "spokenHeading"], message: `scene "${s.id}": spokenHeading must be whole words at the start of its narration, followed by a space (after any punctuation) and more narration` });
        }
        if (s.headingPauseSeconds !== undefined && !s.spokenHeading) {
          ctx.addIssue({ code: "custom", path: [i, "headingPauseSeconds"], message: `scene "${s.id}": headingPauseSeconds needs a spokenHeading` });
        }
        const ends = new Set(s.spokenHeading ? [s.spokenHeading.length] : []);
        s.pauses?.forEach((p, j) => {
          const at = s.narration.indexOf(p.after);
          const end = at + p.after.length;
          const whole =
            at >= 0 &&
            s.narration.indexOf(p.after, at + 1) < 0 &&
            !/[\p{L}\p{N}'’-]/u.test(s.narration[at - 1] ?? "") &&
            /^[^\p{L}\p{N}'’-]*\s/u.test(s.narration.slice(end));
          if (!whole) {
            ctx.addIssue({ code: "custom", path: [i, "pauses", j, "after"], message: `scene "${s.id}": pause after "${p.after}" must be whole words found once in its narration, followed by a space (after any punctuation) and more narration` });
          } else if (ends.has(end)) {
            ctx.addIssue({ code: "custom", path: [i, "pauses", j, "after"], message: `scene "${s.id}": two pauses end at "${p.after}"` });
          }
          ends.add(end);
        });
      }),
    ),
  /** The look: tokens the kit reads through <Designed>. Videos without one keep the kit defaults. */
  design: designSchema.optional(),
  /** The series this video's look was copied from (series/<name>/), if any. */
  series: id.optional(),
});

export type VideoSpec = z.infer<typeof videoSchema>;
export type SceneSpec = z.infer<typeof sceneSchema>;

export const alignmentSchema = z.object({
  characters: z.array(z.string()),
  startSeconds: z.array(z.number()),
  endSeconds: z.array(z.number()),
});

export type Voice = z.infer<typeof voiceSchema>;
export type KokoroVoice = z.infer<typeof kokoroVoiceSchema>;

/** The model and engine scripts/kokoro.ts runs; a new model or phonemizer is a new voice, so it is part of the fingerprint. */
export const KOKORO_MODEL = "Kokoro-82M-v1.0-ONNX-timestamped@dd4401a model.onnx, onnxruntime-node 1.31.1, phonemizer 1.2.1";

const kokoroLangs: Record<string, string> = { a: "en-us", b: "en-gb", e: "es", f: "fr-fr", h: "hi", i: "it", j: "ja", p: "pt-br", z: "cmn" };
export const kokoroLang = (voice: KokoroVoice): string => voice.lang ?? kokoroLangs[voice.voice[0]] ?? "en-us";

/** One line naming the voice, for logs and QA output. */
export const voiceLabel = (voice: Voice): string =>
  voice.provider === "elevenlabs" ? `elevenlabs ${voice.voiceId} (${voice.modelId})` : `kokoro ${voice.voice} (${kokoroLang(voice)}, speed ${voice.speed})`;

/**
 * Stable text for a voice config; settings keys are sorted so reordering video.json changes nothing.
 * The ElevenLabs form predates the other providers and must stay exactly as it is: every cached clip is keyed by it.
 */
export const voiceFingerprint = (voice: Voice): string =>
  voice.provider === "elevenlabs"
    ? JSON.stringify({
        voiceId: voice.voiceId,
        modelId: voice.modelId,
        settings: Object.fromEntries(Object.entries(voice.settings).sort(([a], [b]) => a.localeCompare(b))),
      })
    : JSON.stringify({ provider: "kokoro", model: KOKORO_MODEL, voice: voice.voice, speed: voice.speed, lang: kokoroLang(voice) });

export const voiceManifestSchema = z.object({
  videoId: id,
  voiceFingerprint: z.string(),
  /** The voice that made these clips when it is not video.json's (pnpm voice <id> --kokoro). */
  override: voiceSchema.optional(),
  clips: z.record(
    z.string(),
    z.object({
      file: z.string(),
      text: z.string(),
      durationSeconds: z.number().positive(),
      alignment: alignmentSchema.nullable(),
      placeholder: z.boolean().default(false),
      /** Where the clip is cut for the pause after the scene's spokenHeading; cutSeconds is null when no gap was found. */
      heading: z
        .object({ text: z.string(), fps: z.number().int().positive().optional(), cutSeconds: z.number().positive().nullable(), note: z.string().optional() })
        .optional(),
      /** Where the clip is cut for each of the scene's pauses, in the scene's order. */
      pauses: z
        .array(z.object({ after: z.string(), fps: z.number().int().positive(), cutSeconds: z.number().positive().nullable(), note: z.string().optional() }))
        .optional(),
    }),
  ),
});

export type Alignment = z.infer<typeof alignmentSchema>;
export type VoiceManifest = z.infer<typeof voiceManifestSchema>;
