# Paper collage

Cut paper on a table. Shapes with torn or slightly uneven edges, layered with hard offset shadows, a bit of texture.

## When it fits

- Friendly explainers for non-experts: a service, a community project, a public health message.
- Stories about people and places, told warmly.
- Brands with a crafted, human or playful tone.

## When it doesn't

- Technical precision. Collage blurs exact shapes and numbers.
- Premium or corporate brands that need a polished finish.

## Palette

- From `brand.json`: pick two or three brand colours and soften them toward paper: less saturated, a little lighter.
  The `button` colour becomes the brightest paper. `bg` is a warm card or kraft tone near the brand `background`.
- Without a brand: take colours from the subject's world. Garden greens and terracotta for a gardening service,
  school-supply primaries for education, sea blues for a coastal town.
- Use `accents` for the paper shapes, three to five colours. `fg` stays a dark warm ink.
- Example palette (one example only): bg `#efe6d6`, surface `#fbf6ec`, fg `#2a241c`, muted `#6a5d4f`, accent `#c8432c`, accents teal, mustard, sky.

## Type

- A rounded or chunky display face, and a warm readable body.
- Options: `Bricolage Grotesque` 700/800 with `Work Sans` 400/600; `Lilita One` 400 with `Nunito` 400/700;
  `DM Serif Display` 400 with `Rubik` 400/600.
- Tokens: `titleCase` `none`, `titleTracking` 0, `titleScale` 1 to 1.2.

## Layout

- Scenes are built from a few large shapes, not many small ones. Three to six pieces per scene.
- Pieces sit at small angles (-4 to 4 degrees) and overlap. Keep them inside `contentArea(title, caption)`.
- Leave the caption zone as plain paper so captions sit on a calm surface.

## Title and captions

- `title`: `banner` on a paper strip, or `hero` for the first and last scenes.
- `caption`: `pill` reads like a paper label. Raise `radius` so the pill is round.

## Motion and transitions

- `motion`: `bouncy`. Pieces drop in and settle with a small overshoot.
- `transition`: `push` at 14 to 18 frames, like sliding a new sheet in. `wipe` also works.
- The motion preset covers the whole video. For a slow scene, start fewer pieces and space them out with `phraseFrame()`.

## Signature devices

- Hard offset shadow: `shadow` `hard` gives every surface a solid shadow, like paper lifted off the table.
- Torn edge: an SVG path with a jagged edge as a mask on a coloured block.
- Paper people and objects built from simple shapes (circles, rounded rectangles), or `Avatar` with flat colours.
- A strip of tape (a pale, slightly see-through rectangle) holding a photo or screenshot in place.

## Avoid

- Glows and gradients. Paper doesn't glow.
- Perfect alignment. A small tilt is what makes it read as paper.
- Texture strong enough to make captions hard to read. Keep `grain` at 0.12 or below.

## Kit parts

- `Backdrop` with `grain` or a `texture` image of paper, `Title`, `Captions`, `SceneTrack`, `surfaceStyle(d)`.
- `Avatar` and `RoleTag` for people, `FlowLine` for paths between pieces.
- Plain HTML and SVG for cut shapes, tape and torn edges.

## Starting point (one starting point, adapt it)

```json
{
  "look": "paper-collage",
  "palette": { "bg": "#efe6d6", "surface": "#fbf6ec", "fg": "#2a241c", "muted": "#6a5d4f", "line": "#2a241c", "accent": "#c8432c", "accents": ["#2f8f83", "#e8b23a", "#6aa6d8"] },
  "fonts": { "display": { "family": "Bricolage Grotesque", "weights": [700, 800] }, "body": { "family": "Work Sans", "weights": [400, 600] } },
  "type": { "titleCase": "none", "titleTracking": 0, "titleScale": 1.1 },
  "shape": { "radius": 10, "stroke": 0, "shadow": "hard" },
  "background": { "kind": "grain", "grain": 0.12 },
  "motion": "bouncy",
  "transition": { "kind": "push", "frames": 16, "direction": "left" },
  "title": "banner",
  "caption": "pill"
}
```
