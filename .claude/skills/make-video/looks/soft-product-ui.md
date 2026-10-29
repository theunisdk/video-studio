# Soft product UI

The product's own screens, presented well. Rounded cards, soft shadows, the brand's colours, a gentle gradient behind.

## When it fits

- App and SaaS walkthroughs, onboarding videos, feature tours, release notes.
- Any video built on screenshots from `pnpm capture-site`.
- Audiences who will use the product and need to recognise its screens.

## When it doesn't

- Products with no screens, or screens that are not ready to show.
- Big-idea explainers. Screens pull attention toward detail.

## Palette

- From `brand.json`: this look follows the brand closely. `background` gives `bg` (or a tint of it for the gradient),
  `surface` gives `surface`, `text` gives `fg`, `border` gives `line`, and the `button` colour is the `accent`.
  Callouts and the cursor ring then match the product's own buttons.
- Without a brand: sample the screenshots. The most common button colour is the accent.
  The page background, nudged a little toward the accent, makes the gradient.
- Keep `accents` for status colours the product uses (success, warning).
- Example palette (one example only): bg `#f5f6fb`, surface `#ffffff`, fg `#1d2433`, muted `#667085`, line `#e3e6ee`, accent `#4f46e5`.

## Type

- Match the product's UI font when it is on Google Fonts (`brand.json` `fonts`). Otherwise a modern UI sans.
- Options: `Plus Jakarta Sans` 600/800 with `Inter` 400/600; `Manrope` 700/800 with `DM Sans` 400/700;
  `Figtree` 700/900 with `Figtree` 400/600.
- Tokens: `titleCase` `none`, `titleTracking` -0.01 to 0, `titleScale` 1.

## Layout

- The browser or device frame is the main object. Size it to fill `contentArea(title, caption)`.
- With `banner`, the frame sits below the top 200px. With `rail`, it sits right of the 480px rail.
- One callout at a time. Zoom into the part of the screen being explained.

## Title and captions

- `title`: `banner` for a step-by-step tour, `rail` when steps need numbers and the screens are tall.
- `caption`: `pill` matches rounded UI. Its radius follows `shape.radius`, capped at 28.

## Motion and transitions

- `motion`: `calm` for tutorials, `snappy` for a short marketing tour.
- `transition`: `crossfade` at 14 to 18 frames, or `push` left between steps.

## Signature devices

- Zoom and callout: `Walkthrough` beats with `zoom` and a `callout` on the exact control being named.
- Floating card: a single UI element (a toggle, a notification) lifted out of the screen at a larger size with a soft shadow.
- Cursor path from one control to the next, so viewers can follow along.
- A device pair: the web screen and a `Phone` side by side, when the product has both.

## Avoid

- Mock UI drawn in HTML when a real screenshot exists. Use the real one.
- Text in screenshots smaller than about 20px on screen. Zoom in or crop instead.
- Heavy backgrounds. A gradient or a soft `dots` pattern is the most it needs.

## Kit parts

- `Walkthrough` (`frame` `light`, `dark` or `none`, `radius` matching `shape.radius`), `scheduleBeats`.
- `Phone`, `Chip`, `StepTracker`, `surfaceStyle(d)` for floating cards.
- `Title`, `Captions`, `SceneTrack`, `Backdrop` with `gradient`, `Logo`.

## Starting point (one starting point, adapt it)

```json
{
  "look": "soft-product-ui",
  "palette": { "bg": "#f5f6fb", "surface": "#ffffff", "fg": "#1d2433", "muted": "#667085", "line": "#e3e6ee", "accent": "#4f46e5", "accents": ["#12b76a", "#f79009"] },
  "fonts": { "display": { "family": "Plus Jakarta Sans", "weights": [600, 800] }, "body": { "family": "Inter", "weights": [400, 600] }, "mono": { "family": "JetBrains Mono", "weights": [400] } },
  "type": { "titleCase": "none", "titleTracking": -0.01, "titleScale": 1 },
  "shape": { "radius": 18, "stroke": 1, "shadow": "soft" },
  "background": { "kind": "gradient", "angle": 160 },
  "motion": "calm",
  "transition": { "kind": "crossfade", "frames": 16, "direction": "left" },
  "title": "banner",
  "caption": "pill"
}
```
