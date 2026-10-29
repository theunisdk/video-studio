# Hand-drawn sketch

A whiteboard or notebook. Marker lines that draw themselves, handwritten labels, simple doodles, one or two marker colours.

## When it fits

- Explaining an idea or process simply, as if at a whiteboard.
- Internal training, early-stage pitches, "how it works" for beginners.
- Subjects that feel complicated, where a friendly sketch lowers the stakes.

## When it doesn't

- Polished brand marketing, or brands with a strict visual identity.
- Content that needs exact data. Sketches suggest, they don't measure.

## Palette

- From `brand.json`: the brand colours become marker colours. Use the `button` colour as the main marker
  and one other brand colour as the second. The `bg` is paper or whiteboard white, not the brand background.
- Without a brand: black or dark grey ink, plus one or two marker colours chosen from the subject.
  Red and blue for teaching, green for growth or nature, orange for warmth.
- Keep the palette small. A real whiteboard has three markers.
- Example palette (one example only): bg `#fbf8f1`, fg `#2b2a28`, muted `#6b675f`, line `#2b2a28`, accent `#d64f3a`, accents blue.

## Type

- A handwriting display face, and a calm hand or rounded body that stays readable in captions.
- Options: `Caveat` 700 with `Kalam` 400/700; `Gochi Hand` 400 with `Patrick Hand` 400;
  `Permanent Marker` 400 with `Shantell Sans` 400/600.
- Handwriting faces run small. Raise `titleScale` to 1.2 or more.
- If the caption face is hard to read at 36 to 42px, use a rounded sans for body (`Nunito` 400/700).

## Layout

- One drawing per scene, built up stroke by stroke inside `contentArea(title, caption)`.
- Labels sit next to what they name, with a hand-drawn arrow.
- Earlier parts of the drawing can stay on screen as the next part is added.

## Title and captions

- `title`: `banner` or `hero`. `none` works if the scene's first stroke is a handwritten heading.
- `caption`: `pill` on a white card keeps the handwriting legible. Avoid `outline` with thin handwriting faces.

## Motion and transitions

- `motion`: `bouncy` for playful, `calm` for training.
- `transition`: `wipe` like an eraser across the board, or `crossfade` at 12 frames.

## Signature devices

- Self-drawing strokes: SVG paths with a growing `strokeDashoffset`, slightly wobbly, with round line caps.
- Circled words and underlines that appear as the narration says them (timed with `phraseFrame()`).
- Doodle icons (a lightbulb, a clock, a person) drawn with a few strokes.
- Sticky notes: rotated squares in a marker colour with a handwritten word.

## Avoid

- Perfect geometry. Add a little wobble to lines.
- Many colours. Ink plus one or two markers.
- Grain heavy enough to look dirty. Keep `grain` at 0.1 or below.

## Kit parts

- `Backdrop` with `grain` or `solid`, `Title`, `Captions`, `SceneTrack`, `surfaceStyle(d)` for sticky notes.
- `FlowLine` (with `bend`) for arrows, `Avatar` for people if doodles would be too rough.
- Plain SVG for strokes, circles and doodles.

## Starting point (one starting point, adapt it)

```json
{
  "look": "hand-drawn-sketch",
  "palette": { "bg": "#fbf8f1", "surface": "#ffffff", "fg": "#2b2a28", "muted": "#6b675f", "line": "#2b2a28", "accent": "#d64f3a", "accents": ["#4a90c2"] },
  "fonts": { "display": { "family": "Caveat", "weights": [700] }, "body": { "family": "Kalam", "weights": [400, 700] } },
  "type": { "titleCase": "none", "titleTracking": 0, "titleScale": 1.25 },
  "shape": { "radius": 18, "stroke": 2, "shadow": "hard" },
  "background": { "kind": "grain", "grain": 0.08 },
  "motion": "bouncy",
  "transition": { "kind": "wipe", "frames": 14, "direction": "right" },
  "title": "banner",
  "caption": "pill"
}
```
