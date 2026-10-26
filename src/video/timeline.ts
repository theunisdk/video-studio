import { voiceFingerprint, type Alignment, type VideoSpec, type VoiceManifest } from "./schema";

export type TimedScene = {
  id: string;
  index: number;
  kicker: string;
  headline: string;
  narration: string;
  from: number;
  durationInFrames: number;
  audioFrom: number;
  audioFile: string;
  audioSeconds: number;
  alignment: Alignment | null;
  placeholder: boolean;
};

export type Timeline = {
  fps: number;
  durationInFrames: number;
  scenes: TimedScene[];
};

// Narration audio sets every scene's length; storyboard hints never trim speech.
export const buildTimeline = (video: VideoSpec, voice: VoiceManifest): Timeline => {
  const { fps, timing } = video;
  if (voice.voiceFingerprint !== voiceFingerprint(video.voice)) {
    throw new Error(`Voice settings changed since the clips were made. Run: pnpm voice ${video.id}`);
  }
  let cursor = 0;
  const scenes = video.scenes.map((scene, index) => {
    const clip = voice.clips[scene.id];
    if (!clip) throw new Error(`No voice clip for scene "${scene.id}". Run: pnpm voice ${video.id}`);
    if (clip.text !== scene.narration) {
      throw new Error(`Voice clip for scene "${scene.id}" is stale. Run: pnpm voice ${video.id}`);
    }
    const isLast = index === video.scenes.length - 1;
    const seconds = Math.max(
      timing.leadInSeconds + clip.durationSeconds + timing.tailSeconds + (isLast ? timing.outroSeconds : 0),
      scene.minSeconds,
    );
    const durationInFrames = Math.ceil(seconds * fps);
    const timed: TimedScene = {
      id: scene.id,
      index,
      kicker: scene.kicker,
      headline: scene.headline,
      narration: scene.narration,
      from: cursor,
      durationInFrames,
      audioFrom: cursor + Math.round(timing.leadInSeconds * fps),
      audioFile: clip.file,
      audioSeconds: clip.durationSeconds,
      alignment: clip.alignment,
      placeholder: clip.placeholder,
    };
    cursor += durationInFrames;
    return timed;
  });
  return { fps, durationInFrames: cursor, scenes };
};

export const sceneById = (timeline: Timeline, id: string): TimedScene => {
  const scene = timeline.scenes.find((s) => s.id === id);
  if (!scene) throw new Error(`Unknown scene "${id}"`);
  return scene;
};

/** Absolute frame at which `phrase` starts being spoken in this scene's narration. */
export const phraseFrame = (scene: TimedScene, phrase: string, fps: number): number => {
  const offset = scene.narration.indexOf(phrase);
  if (offset < 0) throw new Error(`Phrase "${phrase}" not in narration of scene "${scene.id}"`);
  const a = scene.alignment;
  const seconds =
    a && a.characters.length === scene.narration.length
      ? a.startSeconds[offset]
      : (offset / scene.narration.length) * scene.audioSeconds;
  return scene.audioFrom + Math.round(seconds * fps);
};
