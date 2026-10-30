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
  /** The pause after the spoken heading: the clip plays up to cutFrame (frames into the clip), then the rest `frames` later. */
  headingPause: { cutFrame: number; frames: number } | null;
  title?: TitleTreatment;
  transition?: TransitionSpec;
};

export type Timeline = {
  fps: number;
  durationInFrames: number;
  scenes: TimedScene[];
  /** Who voiced the narration; `override` when it was not video.json's voice (pnpm voice <id> --kokoro). */
  voice: { provider: VideoSpec["voice"]["provider"]; label: string; override: boolean };
  /** Scenes whose pause after the spoken heading is missing or placed without exact word timings, with pnpm voice's reason. */
  headingPauseNotes: { sceneId: string; note: string }[];
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
  const headingPauseNotes: Timeline["headingPauseNotes"] = [];
  const scenes = video.scenes.map((scene, index) => {
    const clip = voice.clips[scene.id];
    if (!clip) throw new Error(`No voice clip for scene "${scene.id}". Run: pnpm voice ${video.id}`);
    if (clip.text !== scene.narration) {
      throw new Error(`Voice clip for scene "${scene.id}" is stale. Run: pnpm voice ${video.id}`);
    }
    if (scene.spokenHeading && (clip.heading?.text !== scene.spokenHeading || clip.heading.fps !== fps)) {
      throw new Error(`The heading cut for scene "${scene.id}" is stale. Run: pnpm voice ${video.id}`);
    }
    const isLast = index === video.scenes.length - 1;
    const leadIn = index === 0 ? (timing.openingLeadInSeconds ?? timing.leadInSeconds) : timing.leadInSeconds;
    const pauseFrames = Math.round((scene.headingPauseSeconds ?? timing.headingPauseSeconds) * fps);
    const cutSeconds = scene.spokenHeading ? clip.heading?.cutSeconds : null;
    const headingPause = cutSeconds && pauseFrames > 0 ? { cutFrame: Math.round(cutSeconds * fps), frames: pauseFrames } : null;
    if (scene.spokenHeading && pauseFrames > 0 && (clip.heading?.note || !headingPause)) {
      headingPauseNotes.push({ sceneId: scene.id, note: headingPause ? clip.heading!.note! : `no pause: ${clip.heading?.note ?? "no cut recorded"}` });
    }
    const seconds = Math.max(
      leadIn + clip.durationSeconds + (headingPause ? pauseFrames / fps : 0) + timing.tailSeconds + (isLast ? timing.outroSeconds : 0),
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
      headingPause,
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
    headingPauseNotes,
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

/** Absolute frame at which the clip reaches `seconds`, counting the pause after the spoken heading. */
export const audioFrame = (scene: TimedScene, seconds: number, fps: number): number => {
  const frame = Math.round(seconds * fps);
  const pause = scene.headingPause;
  return scene.audioFrom + frame + (pause && seconds * fps >= pause.cutFrame ? pause.frames : 0);
};

/** Absolute frame at which the scene's narration ends. */
export const narrationEndFrame = (scene: TimedScene, fps: number): number =>
  scene.audioFrom + Math.ceil(scene.audioSeconds * fps) + (scene.headingPause?.frames ?? 0);

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
