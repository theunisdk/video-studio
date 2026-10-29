# Minimal Swiss

International typographic style. A strict grid, one sans family, flush-left text, lots of white, one signal colour.

## When it fits

- Serious, precise subjects: finance, policy, legal, process, research findings, annual results.
- Data stories where a clean chart says more than any picture.
- Brands with a clean, modern identity.

## When it doesn't

- Warm, human stories that need faces and texture.
- Young or playful audiences. It can read as cold.

## Palette

- From `brand.json`: `bg` is white or the brand's lightest `background`. `fg` is near-black.
  The brand's `button` colour becomes the single signal colour. Use it sparingly: one bar, one word, one rule per scene.
  If the brand colour is pale, darken it until white text on it passes contrast.
- Without a brand: white, black and one signal colour. Red is classic. Choose by the subject:
  a green for sustainability, a blue for finance, an orange for safety.
- `accents` only if charts need more than one series. Use greys before adding colours.
- Example palette (one example only): bg `#ffffff`, surface `#f2f2f2`, fg `#111111`, muted `#6b6b6b`, line `#111111`, accent `#e30613`.

## Type

- One grotesque family in two or three weights does everything.
- Options: `Inter Tight` 600/800 with `Inter` 400/600; `Hanken Grotesk` 700/900 with `Hanken Grotesk` 400/600;
  `Instrument Sans` 600/700 with `Instrument Sans` 400/500.
- Tokens: `titleCase` `none`, `titleTracking` -0.02 to -0.01, `titleScale` 1 to 1.2.

## Layout

- A 12-column grid across `contentArea(title, caption)`. Text and figures snap to columns.
- Flush-left text, ragged right. Nothing centred except, rarely, a single number.
- Big numbers and short headlines at the top-left of the content area; supporting detail below in a smaller size.

## Title and captions

- `title`: `lowerThird` with `radius` 0, or `none` and set the headline in the grid yourself.
- `caption`: `outline` on white keeps the page clean. `strip` with `stroke` 2 gives a ruled band.

## Motion and transitions

- `motion`: `mechanical`. Elements wipe in on a straight edge. No bounce, no float.
- `transition`: `cut`, or `wipe` at 12 to 14 frames along the grid direction.

## Signature devices

- Hard rule: a thick black or accent bar that wipes across before a headline arrives.
- Big number: a figure set very large, flush left, with its label in small type under it.
- Simple bar or line chart in black with one bar in the accent: the one the narration is about.
- Grid reveal: modules fill in one by one, in a strict order, to show parts of a whole.

## Avoid

- Shadows, rounded corners, gradients and grain. `radius` 0, `shadow` `none`.
- More than one accent in a scene.
- Decorative images. Every element carries information.

## Kit parts

- `Title`, `Captions`, `SceneTrack`, `Backdrop` with `solid`, `entrance` (its `wipe` entrance suits this look).
- `StepTracker` for a sequence, recoloured through the design.
- Plain HTML and SVG for rules, numbers, grids and charts.

## Starting point (one starting point, adapt it)

```json
{
  "look": "minimal-swiss",
  "palette": { "bg": "#ffffff", "surface": "#f2f2f2", "fg": "#111111", "muted": "#6b6b6b", "line": "#111111", "accent": "#e30613", "accents": ["#111111", "#9a9a9a"] },
  "fonts": { "display": { "family": "Inter Tight", "weights": [600, 800] }, "body": { "family": "Inter", "weights": [400, 600] } },
  "type": { "titleCase": "none", "titleTracking": -0.02, "titleScale": 1.1 },
  "shape": { "radius": 0, "stroke": 2, "shadow": "none" },
  "background": { "kind": "solid" },
  "motion": "mechanical",
  "transition": { "kind": "wipe", "frames": 12, "direction": "left" },
  "title": "lowerThird",
  "caption": "outline"
}
```
