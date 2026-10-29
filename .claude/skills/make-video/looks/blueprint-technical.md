# Blueprint technical

An engineering drawing. A grid, thin precise lines, labels with leader lines, dimensions and part numbers.

## When it fits

- How a system is built: architecture, data flow, hardware, infrastructure.
- Engineering and technical buyers who want to see the parts and how they connect.
- Content with named components, sequences and numbers.

## When it doesn't

- Emotional stories about people. The look is cool and exact.
- Beginners who would be put off by a drawing full of labels.

## Palette

- From `brand.json`: if the brand is dark, use its `background` as `bg` and a slightly lighter shade as `surface`.
  If it is light, a pale drafting-paper `bg` with ink lines works just as well as classic blue.
  Use the `button` or `accent` colour for the one part being explained right now. Everything else stays in `line`.
- Without a brand: classic blueprint blue, a dark slate, or white drafting paper with graphite lines.
  Choose by the subject. Blue for systems, slate for software, paper for physical products.
- `accents`: one colour per subsystem, at most four.
- Example palette (one example only): bg `#0f2a4a`, surface `#13355d`, fg `#e8f1ff`, muted `#8fb0d9`, line `#3f6a9c`, accent `#ffd166`.

## Type

- A mono or technical face for labels and display, a plain sans for body.
- Options: `IBM Plex Mono` 500/700 with `IBM Plex Sans` 400/700; `Space Mono` 400/700 with `Barlow` 400/600;
  `Chakra Petch` 600/700 with `IBM Plex Sans Condensed` 400/600.
- Set `mono` too: part numbers and measurements use it.
- Tokens: `titleCase` `upper`, `titleTracking` 0.04 to 0.08, `titleScale` 0.85 to 1.

## Layout

- The drawing sits in `contentArea(title, caption)`, centred, with labels outside the parts on leader lines.
- `background.kind` `grid` with `size` 32 to 64. Align parts to the grid lines.
- A title block in one corner (scene number, part name) like the box on a real drawing.

## Title and captions

- `title`: `lowerThird` reads like a drawing label. `banner` works when the drawing is wide.
- `caption`: `strip` gives a solid band that stays legible over grid lines. `outline` works on a plain grid.

## Motion and transitions

- `motion`: `mechanical`. Lines draw on, parts wipe in, nothing bounces.
- `transition`: `wipe` at 14 to 18 frames, or `cut`. Use `zoom` to move from the whole system into one part.

## Signature devices

- Lines that draw on: SVG paths with a growing `strokeDashoffset`, then the label fades in at the end of the line.
- Dimension marks: arrows with a measurement or a count between them (requests per second, a size, a time).
- Exploded view: a part separates into its layers, each with a part number.
- Callout circles with a letter, matched to a key at the side.

## Avoid

- Soft shadows and gradients. Use `shadow` `none` and a `stroke` of 1 or 2.
- Decoration with no meaning. Every line should connect two things or measure one.
- Filling the grid edge to edge. Leave a border like a drawing sheet.

## Kit parts

- `Backdrop` with `grid`, `Title`, `Captions`, `SceneTrack`, `surfaceStyle(d)` for the title block.
- `FlowLine` (with `dashed`) for connections in 2D, `StepTracker` for a sequence.
- In 3D: `Stage` with `WireBuilding` and `Connector`, and `Label` anchored to the parts.

## Starting point (one starting point, adapt it)

```json
{
  "look": "blueprint-technical",
  "palette": { "bg": "#0f2a4a", "surface": "#13355d", "fg": "#e8f1ff", "muted": "#8fb0d9", "line": "#3f6a9c", "accent": "#ffd166", "accents": ["#7bdff2", "#f497da"] },
  "fonts": { "display": { "family": "IBM Plex Mono", "weights": [500, 700] }, "body": { "family": "IBM Plex Sans", "weights": [400, 700] }, "mono": { "family": "IBM Plex Mono", "weights": [400] } },
  "type": { "titleCase": "upper", "titleTracking": 0.06, "titleScale": 0.9 },
  "shape": { "radius": 2, "stroke": 2, "shadow": "none" },
  "background": { "kind": "grid", "size": 48 },
  "motion": "mechanical",
  "transition": { "kind": "wipe", "frames": 16, "direction": "right" },
  "title": "lowerThird",
  "caption": "strip"
}
```
