# Bold poster retro

A screen-printed poster. Flat saturated colour, heavy type, thick outlines, hard shadows, a little print grain.

## When it fits

- Events, campaigns, launches, consumer products, food and drink, local businesses.
- Short marketing videos that must grab attention in the first second.
- Brands with a confident, fun or nostalgic tone.

## When it doesn't

- Careful explanations, data or compliance content. The look shouts.
- Brands built on restraint and quiet luxury.

## Palette

- From `brand.json`: push the brand colours to full strength. The brand's `button` colour, or its most
  saturated colour, becomes either the `bg` of the whole frame or the `accent` on a bright warm `bg`.
  `fg` and `line` are the same dark ink, so outlines and text match.
- Without a brand: choose a period and a place from the subject. Sixties travel posters use teal, orange and cream.
  Seventies use mustard, brown and red. Eighties use magenta, cyan and yellow.
- `accents`: two or three flat colours for blocks and badges.
- Example palette (one example only): bg `#ffcf3f`, surface `#fff4d1`, fg `#1a1208`, line `#1a1208`, accent `#c8231a`, accents blue.

## Type

- A very heavy display face, and a sturdy body that holds up in captions.
- Options: `Archivo Black` 400 with `Archivo` 500/800; `Bowlby One` 400 with `Rubik` 400/700;
  `Alfa Slab One` 400 with `Work Sans` 500/700; `Shrikhand` 400 with `DM Sans` 400/700.
- Tokens: `titleCase` `upper` for sans faces (keep `none` for script faces like Shrikhand),
  `titleTracking` 0 to 0.02, `titleScale` 1.05 to 1.3.

## Layout

- Big blocks of colour that split the frame: a diagonal band, a circle behind the subject, a frame inside the frame.
- The product or subject sits in the middle of `contentArea(title, caption)`, large.
- Use `hero` for the headline, then let the content take the full frame after `titleClear()`.

## Title and captions

- `title`: `hero` or `kinetic`. `banner` for scenes with a lot of content.
- `caption`: `highlight` matches the loud style and needs word timings. `strip` with a thick top border is the safe choice.

## Motion and transitions

- `motion`: `bouncy`. Things pop in with overshoot.
- `transition`: `iris` for a retro feel, `push` at 12 frames, or `cut` on the beat.

## Signature devices

- Hard offset shadow in ink on every surface and on the product (`shadow` `hard`, `stroke` 3 to 5).
- Sunburst: rays behind the subject, slowly turning (an SVG of wedges with a small rotation per frame).
- Starburst badge with a price, date or short claim, popping in with a slight tilt.
- Halftone dots in a corner (`dots` background or an SVG pattern), like cheap print.

## Avoid

- Thin lines and small type. Nothing under 3px stroke or 32px text.
- Soft shadows and gradients. Everything is flat.
- Grain so strong that captions break up. Keep it at 0.16 or below.

## Kit parts

- `Backdrop` with `grain` or `dots`, `Title` with `titleClear()`, `Captions`, `SceneTrack`.
- `surfaceStyle(d)` gives the hard shadow and thick outline for free. `Chip` for short claims.
- Plain SVG for sunbursts, starbursts and colour blocks.

## Starting point (one starting point, adapt it)

```json
{
  "look": "bold-poster-retro",
  "palette": { "bg": "#ffcf3f", "surface": "#fff4d1", "fg": "#1a1208", "muted": "#5c4a1e", "line": "#1a1208", "accent": "#c8231a", "accents": ["#1f6feb", "#11998e"] },
  "fonts": { "display": { "family": "Archivo Black", "weights": [400] }, "body": { "family": "Archivo", "weights": [500, 800] } },
  "type": { "titleCase": "upper", "titleTracking": 0.01, "titleScale": 1.15 },
  "shape": { "radius": 0, "stroke": 4, "shadow": "hard" },
  "background": { "kind": "grain", "grain": 0.14 },
  "motion": "bouncy",
  "transition": { "kind": "iris", "frames": 18, "direction": "left" },
  "title": "hero",
  "caption": "highlight"
}
```
