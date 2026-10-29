import { z } from "zod";
import { designSchema, titleTreatmentSchema, transitionSchema } from "./design";

const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);

export const sceneSchema = z.object({
  id,
  kicker: z.string().max(60).optional(),
  headline: z.string().trim().min(2).max(120).optional(),
  narration: z.string().trim().min(4).max(1500),
  minSeconds: z.number().min(0).max(120).default(0),
  /** How this scene's title shows, overriding design.title. */
  title: titleTreatmentSchema.optional(),
  /** The transition into this scene, overriding design.transition. */
  transition: transitionSchema.optional(),
});

export const videoSchema = z.object({
  id,
  title: z.string().min(3).max(120),
  brief: z.string().min(1),
  fps: z.union([z.literal(24), z.literal(25), z.literal(30), z.literal(60)]).default(30),
  width: z.number().int().min(640).max(3840).default(1920),
  height: z.number().int().min(360).max(2160).default(1080),
  voice: z.object({
    provider: z.literal("elevenlabs"),
    voiceId: z.string().min(1),
    modelId: z.string().min(1),
    settings: z.record(z.string(), z.number()).default({}),
  }),
  timing: z
    .object({
      leadInSeconds: z.number().min(0).max(3).default(0.35),
      tailSeconds: z.number().min(0).max(5).default(0.9),
      outroSeconds: z.number().min(0).max(10).default(2),
    })
    .default({ leadInSeconds: 0.35, tailSeconds: 0.9, outroSeconds: 2 }),
  scenes: z.array(sceneSchema).min(1).max(40),
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

/** Stable text for a voice config; settings keys are sorted so reordering video.json changes nothing. */
export const voiceFingerprint = (voice: VideoSpec["voice"]): string =>
  JSON.stringify({
    voiceId: voice.voiceId,
    modelId: voice.modelId,
    settings: Object.fromEntries(Object.entries(voice.settings).sort(([a], [b]) => a.localeCompare(b))),
  });

export const voiceManifestSchema = z.object({
  videoId: id,
  voiceFingerprint: z.string(),
  clips: z.record(
    z.string(),
    z.object({
      file: z.string(),
      text: z.string(),
      durationSeconds: z.number().positive(),
      alignment: alignmentSchema.nullable(),
      placeholder: z.boolean().default(false),
    }),
  ),
});

export type Alignment = z.infer<typeof alignmentSchema>;
export type VoiceManifest = z.infer<typeof voiceManifestSchema>;
