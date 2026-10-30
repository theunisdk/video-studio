import type { TitleTreatment, TransitionSpec } from "./design";
import { voiceFingerprint, voiceLabel, type Alignment, type VideoSpec, type VoiceManifest } from "./schema";

export type TimedScene = {
  id: string;
  index: number;
  /** "" when the scene has none. */
  kicker: string;
  /** "" when the scene has none. */
  headline: string;
  narration: string;
  from: number;
  durationInFrames: number;
  audioFrom: number;
  audioFile: string;
  audioSeconds: number;
  alignment: Alignment | null;
  placeholder: boolean;
  /**
   * Pauses held mid-clip, after the spoken heading and each `pauses` phrase, in clip order: the clip plays up to
   * cutFrame (frames into the clip), then resumes `frames` later. `at` is the narration offset where the pause falls.
   */
  pauses: { at: number; cutFrame: number; frames: number }[];
  title?: TitleTreatment;
  transition?: TransitionSpec;
};

export type Timeline = {
  fps: number;
  durationInFrames: number;
  scenes: TimedScene[];
  /** Who voiced the narration; `override` when it was not video.json's voice (pnpm voice <id> --kokoro). */
  voice: { provider: VideoSpec["voice"]["provider"]; label: string; override: boolean };
  /** Pauses that are missing or placed without exact word timings, with pnpm voice's reason. */
  pauseNotes: { sceneId: string; after: string; note: string }[];
};

// Narration audio sets every scene's length; storyboard hints never trim speech.
export const buildTimeline = (video: VideoSpec, voice: VoiceManifest): Timeline => {
  const { fps, timing } = video;
  if (voice.videoId !== video.id) {
    throw new Error(`voice.json was made for video "${voice.videoId}", not "${video.id}". Run: pnpm voice ${video.id}`);
  }
  const used = voice.override ?? video.voice;
  if (voice.voiceFingerprint !== voiceFingerprint(used)) {
    throw new Error(`Voice settings changed since the clips were made. Run: pnpm voice ${video.id}`);
  }
  let cursor = 0;
  const pauseNotes: Timeline["pauseNotes"] = [];
  const scenes = video.scenes.map((scene, index) => {
    const clip = voice.clips[scene.id];
    if (!clip) throw new Error(`No voice clip for scene "${scene.id}". Run: pnpm voice ${video.id}`);
    if (clip.text !== scene.narration) {
      throw new Error(`Voice clip for scene "${scene.id}" is stale. Run: pnpm voice ${video.id}`);
    }
    if (scene.spokenHeading && (clip.heading?.text !== scene.spokenHeading || clip.heading.fps !== fps)) {
      throw new Error(`The heading cut for scene "${scene.id}" is stale. Run: pnpm voice ${video.id}`);
    }
    const asked = scene.pauses ?? [];
    const cuts = clip.pauses ?? [];
    if (asked.length !== cuts.length || asked.some((p, i) => cuts[i].after !== p.after || cuts[i].fps !== fps)) {
      throw new Error(`The pause cuts for scene "${scene.id}" are stale. Run: pnpm voice ${video.id}`);
    }
    const isLast = index === video.scenes.length - 1;
    const leadIn = index === 0 ? (timing.openingLeadInSeconds ?? timing.leadInSeconds) : timing.leadInSeconds;
    const breakAfter = (end: number) => end + (scene.narration.slice(end).match(/^\S*/)?.[0].length ?? 0);
    const wanted = [
      ...(scene.spokenHeading
        ? [{ after: scene.spokenHeading, at: breakAfter(scene.spokenHeading.length), seconds: scene.headingPauseSeconds, cut: clip.heading }]
        : []),
      ...asked.map((p, i) => ({ ...p, at: breakAfter(scene.narration.indexOf(p.after) + p.after.length), cut: cuts[i] })),
    ];
    const pauses: (TimedScene["pauses"][number] & { after: string })[] = [];
    for (const { after, at, seconds, cut } of wanted) {
      const frames = Math.round((seconds ?? timing.headingPauseSeconds) * fps);
      if (frames <= 0) continue;
      if (cut?.cutSeconds) pauses.push({ after, at, cutFrame: Math.round(cut.cutSeconds * fps), frames });
      if (cut?.note || !cut?.cutSeconds) pauseNotes.push({ sceneId: scene.id, after, note: cut?.cutSeconds ? cut.note! : `no pause: ${cut?.note ?? "no cut recorded"}` });
    }
    pauses.sort((a, b) => a.cutFrame - b.cutFrame);
    for (let i = pauses.length - 1; i > 0; i--) {
      if (pauses[i].cutFrame !== pauses[i - 1].cutFrame) continue;
      const [merged] = pauses.splice(i, 1);
      pauses[i - 1].frames += merged.frames;
      pauseNotes.push({ sceneId: scene.id, after: merged.after, note: `cut at the same point as the pause after "${pauses[i - 1].after}"; both are held there` });
    }
    const pausedFrames = pauses.reduce((sum, p) => sum + p.frames, 0);
    const seconds = Math.max(
      leadIn + clip.durationSeconds + pausedFrames / fps + timing.tailSeconds + (isLast ? timing.outroSeconds : 0),
      scene.minSeconds,
    );
    const durationInFrames = Math.ceil(seconds * fps);
    const timed: TimedScene = {
      id: scene.id,
      index,
      kicker: scene.kicker ?? "",
      headline: scene.headline ?? "",
      narration: scene.narration,
      from: cursor,
      durationInFrames,
      audioFrom: cursor + Math.round(leadIn * fps),
      audioFile: clip.file,
      audioSeconds: clip.durationSeconds,
      alignment: clip.alignment,
      placeholder: clip.placeholder,
      pauses: pauses.map(({ at, cutFrame, frames }) => ({ at, cutFrame, frames })),
      ...(scene.title ? { title: scene.title } : {}),
      ...(scene.transition ? { transition: scene.transition } : {}),
    };
    cursor += durationInFrames;
    return timed;
  });
  return {
    fps,
    durationInFrames: cursor,
    scenes,
    voice: { provider: used.provider, label: voiceLabel(used), override: !!voice.override },
    pauseNotes,
  };
};

export const sceneById = (timeline: Timeline, id: string): TimedScene => {
  const scene = timeline.scenes.find((s) => s.id === id);
  if (!scene) throw new Error(`Unknown scene "${id}"`);
  return scene;
};

/** True when the scene's narration has character timings that match its text (ElevenLabs or Kokoro alignment). */
export const hasWordTimings = (scene: TimedScene): boolean =>
  !!scene.alignment && scene.alignment.characters.length === scene.narration.length;

/** Absolute frame at which the clip reaches `seconds`, counting the pauses held before that point. */
export const audioFrame = (scene: TimedScene, seconds: number, fps: number): number =>
  scene.audioFrom +
  Math.round(seconds * fps) +
  scene.pauses.reduce((sum, p) => (seconds * fps >= p.cutFrame ? sum + p.frames : sum), 0);

/** Absolute frame at which the scene's narration ends. */
export const narrationEndFrame = (scene: TimedScene, fps: number): number =>
  scene.audioFrom + Math.ceil(scene.audioSeconds * fps) + scene.pauses.reduce((sum, p) => sum + p.frames, 0);

/** Absolute frame at which `phrase` starts being spoken in this scene's narration. */
export const phraseFrame = (scene: TimedScene, phrase: string, fps: number): number => {
  const offset = scene.narration.indexOf(phrase);
  if (offset < 0) throw new Error(`Phrase "${phrase}" not in narration of scene "${scene.id}"`);
  const a = scene.alignment;
  const seconds =
    a && a.characters.length === scene.narration.length
      ? a.startSeconds[offset]
      : (offset / scene.narration.length) * scene.audioSeconds;
  return audioFrame(scene, seconds, fps);
};

/** Like phraseFrame, but null when the scene has no word timings, for effects that must land on the exact word. */
export const wordFrame = (scene: TimedScene, phrase: string, fps: number): number | null =>
  hasWordTimings(scene) ? phraseFrame(scene, phrase, fps) : null;
