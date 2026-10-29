# Cinematic 3D

A lit 3D world with a slow camera. Soft shadows, depth, warm or cool light, few labels.

## When it fits

- Physical or spatial subjects: a clinic, a shop floor, a building, a route, a product in a room.
- A journey from one place or step to the next, told by moving the camera.
- A premium or calm tone, where polish matters more than detail.

## When it doesn't

- Dense information. 3D scenes hold one idea at a time.
- Screen-based products. Show the screens with `Walkthrough` instead.
- Tight deadlines. Each scene needs a camera plan.

## Palette

- From `brand.json`: the brand colours go on objects, not on the background. Use the `button` colour for the
  one object that matters in each scene (a pin, a door, a device). Furniture and floors take muted tints of
  `surface` and `background`. Override single furniture colours with `kit.furniture` when needed.
- Without a brand: pick a time of day. Morning is warm cream and soft blue. Evening is deep blue and amber.
  The light sets the mood more than the palette does.
- `bg` is the sky or the void behind the world. A gentle `gradient` reads as distance.
- Example palette (one example only): bg `#e9e4dc`, surface `#ffffff`, fg `#22313a`, muted `#56656b`, accent `#b8552a`, accents teal and sand.

## Type

- A refined display face and a clean body, both quiet, so the world stays the hero.
- Options: `Sora` 600/700 with `Inter` 400/600; `Cormorant Garamond` 600/700 with `Manrope` 400/700;
  `Outfit` 600/800 with `Figtree` 400/600.
- Tokens: `titleCase` `none`, `titleTracking` 0 to 0.02, `titleScale` 0.9 to 1.

## Layout

- The camera frames the subject inside `contentArea(title, caption)`. Plan each camera move so the subject
  is never under the caption zone or the title zone.
- Labels sit next to objects in 3D space with `Label`, a few at a time.
- The `lowerThird` title leaves the top two-thirds of the frame for the world.

## Title and captions

- `title`: `lowerThird` or `hero` for the opening. `none` for scenes where the camera move says enough.
- `caption`: `outline` sits over the world without a box. Switch to `pill` if the world is bright and busy behind the captions.

## Motion and transitions

- `motion`: `calm`. The camera moves in long eased arcs with `cameraAt`.
- `transition`: `crossfade` at 20 to 30 frames, or one continuous world with no cuts at all.
  Use `zoom` once, to move into a detail.

## Signature devices

- One continuous world: every scene is a camera position in the same model, so the viewer keeps their bearings.
- A glowing path (`GroundPath` with `progress`) that grows from one place to the next.
- Map pins (`Pin`) that drop in and light up as the narration names each place.
- A warm light that changes with the story (`DaylightRig` `warmth`).

## Avoid

- Fast cuts and spins. They break the sense of a place.
- Labels on everything. Name only what the narration names.
- The neon look's starfield in a lit world. Pick one.

## Kit parts

- `Stage` with `look="lit"`, `DaylightRig`, `Room`, `Person` with poses, furniture (`Desk`, `Chair`, `Sofa`, `Plant`, ...).
- `Ground`, `GroundPath`, `Tree`, `Bush`, `Pin` for outdoor scenes. `Label` for text anchored in 3D.
- `Title`, `Captions`, `SceneTrack` (with `opaque` for different worlds per scene), `Logo`.

## Starting point (one starting point, adapt it)

```json
{
  "look": "cinematic-3d",
  "palette": { "bg": "#e9e4dc", "surface": "#ffffff", "fg": "#22313a", "muted": "#56656b", "line": "#d8d0c4", "accent": "#b8552a", "accents": ["#3a8f8a", "#c9a46a"] },
  "fonts": { "display": { "family": "Sora", "weights": [600, 700] }, "body": { "family": "Inter", "weights": [400, 600] } },
  "type": { "titleCase": "none", "titleTracking": 0.01, "titleScale": 0.95 },
  "shape": { "radius": 16, "stroke": 0, "shadow": "soft" },
  "background": { "kind": "gradient", "colors": ["#f1ede6", "#dcd5ca"], "angle": 180 },
  "motion": "calm",
  "transition": { "kind": "crossfade", "frames": 24, "direction": "left" },
  "title": "lowerThird",
  "caption": "outline"
}
```
