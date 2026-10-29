import type { Alignment } from "./schema";
import type { Timeline } from "./timeline";

export type Cue = { startFrame: number; endFrame: number; text: string };

const MAX_CHARS = 64;
const MIN_CLAUSE = 24;

// Splits on sentence ends, then on clause punctuation, then packs words into short cues.
// Punctuation followed by a non-space ("cat .env", "ficta.sh", "2.5") stays inside the word.
const chunkText = (text: string): string[] => {
  const sentences = text.match(/(?:[^.!?]|[.!?](?=\S))+[.!?]*\s*/g) ?? [text];
  const chunks: string[] = [];
  for (const sentence of sentences) {
    let current = "";
    for (const word of sentence.trim().split(/\s+/)) {
      if (current && (current + " " + word).length > MAX_CHARS) {
        chunks.push(current);
        current = word;
      } else {
        current = current ? `${current} ${word}` : word;
      }
      if (/[,:;]$/.test(word) && current.length >= MIN_CLAUSE) {
        chunks.push(current);
        current = "";
      }
    }
    if (current) chunks.push(current);
  }
  // A run of bare punctuation ("...") never gets a cue of its own.
  return chunks.reduce<string[]>((out, c) => {
    if (!/[\p{L}\p{N}]/u.test(c) && out.length) out[out.length - 1] += ` ${c}`;
    else out.push(c);
    return out;
  }, []);
};

// Character offset -> seconds into the clip, from alignment when present, else proportional.
const timeAt = (offset: number, text: string, seconds: number, alignment: Alignment | null): number => {
  if (alignment && alignment.characters.length === text.length) {
    const i = Math.min(offset, alignment.startSeconds.length - 1);
    return alignment.startSeconds[i];
  }
  return (offset / text.length) * seconds;
};

type Span = Cue & { scene: Timeline["scenes"][number]; start: number };

const cueSpans = (timeline: Timeline): Span[] => {
  const cues: Span[] = [];
  for (const scene of timeline.scenes) {
    const text = scene.narration;
    let searchFrom = 0;
    const chunks = chunkText(text);
    if (chunks.length === 0) throw new Error(`Scene "${scene.id}" produced no captions`);
    chunks.forEach((chunk, i) => {
      const start = text.indexOf(chunk.split(" ")[0], searchFrom);
      searchFrom = start + chunk.length;
      const nextStart =
        i + 1 < chunks.length ? text.indexOf(chunks[i + 1].split(" ")[0], searchFrom) : text.length;
      const startSec = timeAt(start, text, scene.audioSeconds, scene.alignment);
      const endSec = i + 1 < chunks.length ? timeAt(nextStart, text, scene.audioSeconds, scene.alignment) : scene.audioSeconds;
      cues.push({
        scene,
        start,
        startFrame: scene.audioFrom + Math.round(startSec * timeline.fps),
        endFrame: scene.audioFrom + Math.round(endSec * timeline.fps),
        text: chunk,
      });
    });
  }
  return cues;
};

export const buildCues = (timeline: Timeline): Cue[] =>
  cueSpans(timeline).map(({ startFrame, endFrame, text }) => ({ startFrame, endFrame, text }));

export type WordCue = Cue & {
  /** Each word with the frame it starts being spoken; null frames when the scene has no word timings. */
  words: { text: string; startFrame: number | null }[];
  /** Whether the words carry real timings (alignment that matches the narration). */
  timed: boolean;
};

/** The same cues as buildCues, split into words, for word-by-word caption effects. */
export const buildWordCues = (timeline: Timeline): WordCue[] =>
  cueSpans(timeline).map(({ scene, start, startFrame, endFrame, text }) => {
    const a = scene.alignment;
    const timed = !!a && a.characters.length === scene.narration.length;
    let from = start;
    const words = text.split(" ").map((w) => {
      const at = scene.narration.indexOf(w, from);
      from = at < 0 ? from : at + w.length;
      return {
        text: w,
        startFrame: timed && at >= 0 ? scene.audioFrom + Math.round(a!.startSeconds[at] * timeline.fps) : null,
      };
    });
    return { startFrame, endFrame, text, words, timed };
  });

const srtTime = (frame: number, fps: number) => {
  const ms = Math.round((frame / fps) * 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
};

export const toSrt = (cues: Cue[], fps: number): string =>
  cues.map((c, i) => `${i + 1}\n${srtTime(c.startFrame, fps)} --> ${srtTime(c.endFrame, fps)}\n${c.text}\n`).join("\n");
