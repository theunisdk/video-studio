# Kinetic typography

The words are the picture. Big type moves on the beat of the narration, with few or no images.

## When it fits

- Short videos (30 to 60 seconds) with a clear message: a launch, a manifesto, a teaser, a value statement.
- Content that has no good pictures, or where pictures would distract.
- Social cuts, where the sound may be off and the words must carry the meaning.

## When it doesn't

- Tutorials and walkthroughs. People need to see the thing, not read about it.
- Long videos. Five minutes of moving words is tiring.

## Palette

- From `brand.json`: use the brand's strongest colour as a full-frame `bg` for some scenes, or as the `accent` on a
  near-black or near-white `bg`. The `button` colour is usually the strongest. Check that `fg` reads on `bg` at a glance.
- Without a brand: pick two colours with high contrast that match the tone. Warm and loud for energy,
  black and one colour for seriousness.
- `accents` can hold one or two colours to swap the background between scenes.
- Example palette (one example only): bg `#111111`, fg `#f5f5f0`, muted `#9a9a92`, line `#2c2c2a`, accent `#ff5a36`.

## Type

- A heavy display face that holds up at 150px, and a plain body for captions.
- Options: `Anton` 400 with `Inter` 400/700; `Unbounded` 700/900 with `Inter Tight` 400/600;
  `Syne` 700/800 with `DM Sans` 400/700.
- Condensed faces fit more words per line. Wide faces need fewer words per scene.
- Tokens: `titleCase` `upper` for condensed faces, `titleTracking` -0.02 to 0.02, `titleScale` 1.1 to 1.4.

## Layout

- The `kinetic` title fills the frame until `titleClear()`. Content, if any, enters after it.
- After the clear, `contentArea("kinetic", caption)` is the whole frame minus the caption zone.
  Put one supporting word, number or icon there, not a diagram.
- Break headlines into short phrases. Six words or fewer per scene works best.

## Title and captions

- `title`: `kinetic` for most scenes. Use `hero` for a slower scene where the headline is a full sentence.
- `caption`: `highlight` follows the voice word by word; it needs word timings. Use `outline` if a scene has none.
- Keep captions below the type, never over it. The caption zone holds the bottom 170px.

## Motion and transitions

- `motion`: `snappy` for punch, `bouncy` for a playful brand.
- `transition`: `cut` on the beat, or `push` at 10 to 12 frames. Use `zoom` for one dramatic moment.

## Signature devices

- The last word of each headline in the accent (the kinetic title does this already). Choose headlines whose last word matters.
- Background colour swap: each scene changes `bg` to the next colour in `accents` (a full-frame div under the title).
- One giant number or word that fills the frame, cropped at the edges.
- A word that stays on screen across a cut and changes the sentence around it.

## Avoid

- Paragraphs. If the narration needs a full sentence on screen, that is what captions are for.
- Many fonts. One display face does all the work.
- Grain or texture that makes thin strokes of the type shimmer.

## Kit parts

- `Title` with `titleClear()`, `Captions`, `SceneTrack`, `Backdrop`, `entrance` and `exit` from `motion.ts`.
- Plain HTML spans for extra words, timed with `phraseFrame()`.

## Starting point (one starting point, adapt it)

```json
{
  "look": "kinetic-typography",
  "palette": { "bg": "#111111", "surface": "#1c1c1b", "fg": "#f5f5f0", "muted": "#9a9a92", "line": "#2c2c2a", "accent": "#ff5a36", "accents": ["#2f6bff", "#ffd23f"] },
  "fonts": { "display": { "family": "Anton", "weights": [400] }, "body": { "family": "Inter", "weights": [400, 700] } },
  "type": { "titleCase": "upper", "titleTracking": 0.01, "titleScale": 1.25 },
  "shape": { "radius": 0, "stroke": 0, "shadow": "none" },
  "background": { "kind": "solid" },
  "motion": "snappy",
  "transition": { "kind": "cut", "frames": 0, "direction": "left" },
  "title": "kinetic",
  "caption": "highlight"
}
```
