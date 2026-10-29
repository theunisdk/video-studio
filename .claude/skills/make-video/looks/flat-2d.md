# Flat 2D

A light, tidy tour. White cards with soft shadows on a pale gradient, a serif headline with a numbered badge,
a step tracker along the bottom. This is the style of the getting-started example video.

## When it fits

- Step-by-step tutorials and process explainers with four to seven steps.
- Mixed content per scene: a few cards, a file list, a small screenshot, arrows between them.
- General audiences who need a clear and calm guide.

## When it doesn't

- A video that is mostly one product's screens. Use soft-product-ui and let the screens fill the frame.
- Loud marketing, or a subject with a strong world of its own (a place, a craft).
- Every tutorial by default. Two tutorials in this look side by side should still differ in palette, type and devices.

## Palette

- From `brand.json`: `bg` from the brand's `background`, turned into a gentle gradient toward the accent.
  `surface` is white or the brand `surface`. The `button` colour is the accent for badges and arrows.
  `accents` take one warm and one green brand colour for states (new, done).
- Without a brand: a near-white bg with a cool or warm tint chosen from the subject, an ink `fg`,
  and one clear accent. Coral and green are good second and third colours.
- Example palette (one example only, close to the getting-started example video): bg `#f5f5fa`, surface `#ffffff`,
  fg `#1f2533`, muted `#687086`, line `#e2e4ec`, accent `#5b5bd6`, accents coral and green.

## Type

- A warm serif for headlines and a friendly sans for everything else.
- Options: `Fraunces` 600/700 with `Nunito Sans` 400/700/800 (the example's set); `Lora` 600/700 with `Lexend` 400/600;
  `Libre Baskerville` 700 with `Figtree` 400/700. A mono (`JetBrains Mono`) for file names and commands.
- Tokens: `titleCase` `none`, `titleTracking` 0, `titleScale` 1.

## Layout

- `banner` takes the top 200px. Cards sit in `contentArea("banner", caption)`, usually two to four across.
- A `StepTracker` can hold a strip just above the caption zone. Leave room for it when sizing cards.
- Arrows (SVG paths) connect cards from left to right in the order the narration names them.

## Title and captions

- `title`: `banner`, with the step number (or a symbol on intro and outro) as the badge.
- `caption`: `pill`, white on the light background with a soft shadow.

## Motion and transitions

- `motion`: `calm` or `snappy`. Cards fade and lift into place, one after another.
- `transition`: `crossfade` at 14 to 18 frames.

## Signature devices

- Numbered banner badge that changes with each step.
- Step tracker that fills in as the video moves from step to step.
- Cards that tick to done (a green check) when the narration finishes a step.
- One dark card among light ones for a terminal or code block.

## Avoid

- Copying the example's cards, arrows or colours. Pick cards from this subject's own objects.
- Too many cards. Four per scene is plenty.
- Small text inside cards. Nothing under 22px.

## Kit parts

- `Title` (banner), `Captions`, `SceneTrack`, `Backdrop` with `gradient`, `surfaceStyle(d)` for cards, `Logo`.
- `StepTracker`, `FlowLine`, `Avatar`, `RoleTag`, `Chip`.
- `Walkthrough` with `frame` `light` for a screenshot inside a card.

## Starting point (one starting point, adapt it)

```json
{
  "look": "flat-2d",
  "palette": { "bg": "#f5f5fa", "surface": "#ffffff", "fg": "#1f2533", "muted": "#687086", "line": "#e2e4ec", "accent": "#5b5bd6", "accents": ["#ff6b4a", "#22a06b"] },
  "fonts": { "display": { "family": "Fraunces", "weights": [600, 700] }, "body": { "family": "Nunito Sans", "weights": [400, 700, 800] }, "mono": { "family": "JetBrains Mono", "weights": [400, 600] } },
  "type": { "titleCase": "none", "titleTracking": 0, "titleScale": 1 },
  "shape": { "radius": 22, "stroke": 0, "shadow": "soft" },
  "background": { "kind": "gradient", "colors": ["#ffffff", "#f5f5fa", "#eceef6"], "angle": 160 },
  "motion": "calm",
  "transition": { "kind": "crossfade", "frames": 16, "direction": "left" },
  "title": "banner",
  "caption": "pill"
}
```
