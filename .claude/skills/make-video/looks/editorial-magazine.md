# Editorial magazine

A printed feature page that moves. Serif headlines, generous margins, thin rules, one strong colour.

## When it fits

- Explainers about ideas, trends, research or a company's story.
- Audiences who read: leaders, analysts, curious generalists.
- Content with quotes, numbers worth a pull-out, and a few strong pictures.

## When it doesn't

- Fast product demos or anything with a lot of UI on screen. The look needs air.
- Young, loud consumer marketing. It reads as calm and considered.

## Palette

- From `brand.json`: take the `background` colour, then warm or cool it toward paper (off-white or deep ink).
  Use the brand's `button` or `accent` colour as the single accent. Use it for kickers, rules and one word per title.
  Take `text` for `fg` if it is near-black; otherwise use a deep ink close to it.
- Without a brand: pick paper and ink from the subject. Newsprint for current affairs, cream for history,
  cool grey for science. The accent is one ink colour a printer might use: a red, a deep blue, a green.
- Keep `accents` to one or two. Magazines are not colourful.
- Example palette (one example only): paper `#f6f1e7`, ink `#1b1a17`, muted `#6d665a`, rule `#d9cfbd`, accent `#b3261e`.

## Type

- A serif with character for display, a readable serif or clean sans for body.
- Options: `Fraunces` 600/800 with `Source Serif 4` 400/700; `Playfair Display` 700/900 with `Libre Franklin` 400/600;
  `Newsreader` 600/800 with `Inter` 400/600.
- If the brand font is a serif, use it for display and pair a neutral body.
- Tokens: `titleCase` `none`, `titleTracking` -0.01 to 0, `titleScale` 1 to 1.15.

## Layout

- Asymmetric columns. Text sits in a narrow column; a picture or figure takes the wider side.
- `rail` suits it: the rail holds the scene number and headline, and content lives in `contentArea("rail", caption)`.
- Leave at least a quarter of the content area empty. White space is the point.

## Title and captions

- `title`: `rail` for a numbered feature, `lowerThird` for a lighter touch, `hero` for the opening scene only.
- `caption`: `outline` keeps the page clean. Use `strip` when pictures behind the captions are busy.

## Motion and transitions

- `motion`: `calm`. Things rise into place and settle.
- `transition`: `crossfade` at 18 to 24 frames, or `wipe` with direction `up` like turning a page.

## Signature devices

- Pull quote: one sentence from the narration set large in the display serif, with a thin accent rule above it.
- Drop number: a big figure (a year, a percent) in the accent, with a small caption under it.
- Hairline rules that draw across before text arrives (an SVG line with a growing width).
- Photo with a caption line in small caps, set like a printed figure.

## Avoid

- Shadows and glows. Use `shadow` `none` and borders of 1px.
- More than two type sizes per scene, besides the title.
- Rounded corners above 4px.

## Kit parts

- `Title`, `Captions`, `SceneTrack`, `Backdrop` (solid or a faint `grain` around 0.04), `Logo`.
- `surfaceStyle(d)` for figure panels. Plain HTML and SVG for quotes, rules and numbers.
- `Walkthrough` with `frame` `none` if a screen must appear, framed by a rule.

## Starting point (one starting point, adapt it)

```json
{
  "look": "editorial-magazine",
  "palette": { "bg": "#f6f1e7", "surface": "#fffdf8", "fg": "#1b1a17", "muted": "#6d665a", "line": "#d9cfbd", "accent": "#b3261e", "accents": ["#1f4e79"] },
  "fonts": { "display": { "family": "Fraunces", "weights": [600, 800] }, "body": { "family": "Source Serif 4", "weights": [400, 700] } },
  "type": { "titleCase": "none", "titleTracking": -0.01, "titleScale": 1.05 },
  "shape": { "radius": 0, "stroke": 1, "shadow": "none" },
  "background": { "kind": "grain", "grain": 0.04 },
  "motion": "calm",
  "transition": { "kind": "crossfade", "frames": 20, "direction": "left" },
  "title": "rail",
  "caption": "outline"
}
```
