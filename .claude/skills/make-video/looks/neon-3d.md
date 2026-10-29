# Neon 3D

Glowing parts in a dark space. Each part of a system is an object with its own colour, joined by connectors
that carry packets. This is the style of the openclaw example video.

## When it fits

- Abstract systems with three to six named parts: software, a server, a model, a messaging channel.
- "How it works" explainers where the parts and the flow between them are the whole story.
- Technology audiences who like a futuristic tone.

## When it doesn't

- Physical places and people. Use cinematic-3d.
- Products with real screens to show. Use soft-product-ui.
- Every tech video by default. This look is the one most at risk of being cloned. Pick it only when parts-in-space is the idea.

## Palette

- From `brand.json`: the `bg` is a very dark tint of the brand (navy, aubergine, forest), not pure black.
  The brand's `button` colour goes to the part the brand owns. The other parts take `accents` that sit well with it.
- Without a brand: one colour per part, chosen so each part is easy to name by colour
  (warm for the software, cool for the computer, bright for the intelligence). Five colours at most.
- `kit.star` sets the star field colour if the derived one is too strong.
- Example palette (one example only, close to the openclaw example video): bg `#070b16`, surface `#131c31`,
  fg `#eef1f8`, muted `#8f9bbb`, line `#29365a`, parts coral, violet, yellow, teal.

## Type

- A wide geometric display face, a highly legible body, a mono for small technical labels.
- Options: `Unbounded` 500/700 with `Atkinson Hyperlegible` 400/700 and `JetBrains Mono` 400/600 (the example's set);
  `Orbitron` 600/800 with `Exo 2` 400/600; `Space Grotesk` 600/700 with `Inter` 400/600.
- Tokens: `titleCase` `none`, `titleTracking` 0, `titleScale` 1.

## Layout

- One world for the whole video. Parts sit along a line or around a centre. The camera moves between them with `cameraAt`.
- Keep each part inside `contentArea(title, caption)` from the camera's view. With `banner`, that is below the top 200px.
- `Label` text sits under each part. `Chip` rows recap the parts on the first and last scenes.

## Title and captions

- `title`: `banner` with the part number as the badge. `lowerThird` gives the world more height.
- `caption`: `pill` on a dark surface. `outline` also reads well on a dark star field.

## Motion and transitions

- `motion`: `calm` for the camera. Parts pop in with a spring.
- `transition`: `crossfade` or none at all, since the camera carries the viewer from scene to scene.

## Signature devices

- A part per colour that comes alive as the narration names it (`Core` activity, `ServerBox` LEDs, `Orb` forming).
- Packets travelling along `Connector` lines to show a request and its reply.
- A slow star field (`Starfield`) behind everything, with `Glow` under each part.
- A final round trip that lights every connector in order.

## Avoid

- Copying the example's parts, camera path or colours. Build the parts this subject has.
- Text on top of glows. Labels go under parts, over the dark background.
- Glow on everything. Only the active part should glow strongly.

## Kit parts

- `Stage` (default `look="flat"`), `Starfield`, `Core`, `ServerBox`, `Orb`, `Connector`, `Glow`, `Trail`, `WireBuilding`.
- `Label`, `Chip`, `Phone` for a chat channel, `Title`, `Captions`, `Logo`.

## Starting point (one starting point, adapt it)

```json
{
  "look": "neon-3d",
  "palette": { "bg": "#0a0f1f", "surface": "#141c33", "fg": "#eef1f8", "muted": "#8f9bbb", "line": "#2a3658", "accent": "#ff7d5c", "accents": ["#a596ff", "#ffcc4d", "#41d4c9"] },
  "fonts": { "display": { "family": "Unbounded", "weights": [500, 700] }, "body": { "family": "Atkinson Hyperlegible", "weights": [400, 700] }, "mono": { "family": "JetBrains Mono", "weights": [400, 600] } },
  "type": { "titleCase": "none", "titleTracking": 0, "titleScale": 1 },
  "shape": { "radius": 14, "stroke": 1, "shadow": "glow" },
  "background": { "kind": "solid" },
  "motion": "calm",
  "transition": { "kind": "crossfade", "frames": 20, "direction": "left" },
  "title": "banner",
  "caption": "pill"
}
```
