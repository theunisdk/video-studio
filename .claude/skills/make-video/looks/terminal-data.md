# Terminal data

A shell and a monitoring screen. Mono type, a dark background, text that types out, numbers that count, small charts.

## When it fits

- Developer tools, CLIs, APIs, SDKs, infrastructure and observability products.
- Content that is commands, logs, config, metrics or query results.
- Developer audiences, who trust a real command more than an illustration of one.

## When it doesn't

- Non-technical audiences. A wall of mono text reads as noise.
- Brands with a soft, warm or playful identity.

## Palette

- From `brand.json`: start from the brand's dark `background` if it has one. If the brand is light,
  use a very dark tint of its `text` colour as `bg`. The `button` or `accent` colour becomes the prompt and cursor colour.
  Use `link` as a second accent for paths and keys.
- Without a brand: pick the classic that suits the subject. Green on black for systems, amber for hardware,
  a cool blue-grey for cloud tools. Or the colours of a popular editor theme the audience knows.
- `accents`: success, warning, error and info, in that order, so log lines can be coloured by level.
- Example palette (one example only): bg `#0b0f0c`, surface `#121a14`, fg `#d7ffe0`, muted `#6f9a7a`, line `#244030`, accent `#3dff8b`.

## Type

- One mono family can do everything. Or pair a mono with a plain sans for body if the narration is long.
- Options: `JetBrains Mono` 400/700 alone; `IBM Plex Mono` 500/700 with `IBM Plex Sans` 400/600;
  `Geist Mono` 500/700 with `Geist` 400/600.
- Set `mono` explicitly, even when it is the same as display.
- Tokens: `titleCase` `none` (commands are lowercase), `titleTracking` 0, `titleScale` 0.85 to 1.

## Layout

- One terminal window or panel per scene, placed in `contentArea(title, caption)`, often wider than tall.
- A second smaller panel (a chart, a counter) can sit to the side.
- Lines of text stay at 28px or larger. Show 8 to 14 lines at most.

## Title and captions

- `title`: `kinetic` reads like a typed command. `lowerThird` keeps the frame for the terminal. `none` if the prompt line is the title.
- `caption`: `highlight` follows the voice. `strip` gives a solid band if the terminal reaches the bottom of the content area.

## Motion and transitions

- `motion`: `snappy`. Text appears fast, panels slide in.
- `transition`: `cut` most of the time, like switching windows. `wipe` down for a new output.

## Signature devices

- Typed command: the command appears a few characters per frame, then the output prints in blocks.
- Blinking block cursor in the accent, on frames where it is waiting.
- Counter: a number that counts up to its value (latency, requests, saved hours), with a unit in muted.
- Sparkline or bar chart drawn in SVG from a handful of points, in the accent.

## Avoid

- Fake output that a developer would spot as wrong. Use real commands and plausible output.
- Glow on every element. Keep `shadow` `glow` for panels only, or use `none`.
- Long scrolling logs. Show the lines that matter and dim the rest.

## Kit parts

- `Backdrop` with `dots` or `solid` and a little `grain`, `Title`, `Captions`, `SceneTrack`, `surfaceStyle(d)` for panels.
- `Walkthrough` with `frame` `dark` for a real screenshot of a dashboard.
- Plain HTML for terminal lines, SVG for charts.

## Starting point (one starting point, adapt it)

```json
{
  "look": "terminal-data",
  "palette": { "bg": "#0b0f0c", "surface": "#121a14", "fg": "#d7ffe0", "muted": "#6f9a7a", "line": "#244030", "accent": "#3dff8b", "accents": ["#3dff8b", "#ffcf4d", "#ff6b6b", "#6cc6ff"] },
  "fonts": { "display": { "family": "JetBrains Mono", "weights": [700] }, "body": { "family": "JetBrains Mono", "weights": [400, 700] }, "mono": { "family": "JetBrains Mono", "weights": [400, 700] } },
  "type": { "titleCase": "none", "titleTracking": 0, "titleScale": 0.9 },
  "shape": { "radius": 6, "stroke": 1, "shadow": "glow" },
  "background": { "kind": "dots", "size": 28, "grain": 0.05 },
  "motion": "snappy",
  "transition": { "kind": "cut", "frames": 0, "direction": "left" },
  "title": "kinetic",
  "caption": "highlight"
}
```
