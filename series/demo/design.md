# Demo series: Lanternfield Academy

Lanternfield Academy is a made-up training school. This series shows what a saved series look looks like.
Ask for "a training video in the demo series" and the new video copies this folder and keeps its fixed parts.

## Direction

A field guide for people learning a tool at their desk. Calm, practical and warm. It should feel like a
well-made printed handbook: paper background, ink-dark text, one lantern-orange accent for the thing to
look at, and steady motion that never hurries the learner.

- **Look:** field guide, adapted from soft product UI and editorial. Not a copy of either.
- **Palette:** paper `#f3efe6` background with `#fffdf7` cards, ink `#1f2b24` text, muted `#5f6b62`,
  rules `#d8d0bf`. The accent `#d9572b` is the lantern orange from the logo and marks the one thing to act
  on in each scene. Pine `#2f6f5e` and amber `#e0a526` are for categories and steps, in that order.
- **Type:** Bricolage Grotesque 600/800 for titles (friendly, a little hand-cut), Figtree 400/700 for
  body and captions (plain and legible), IBM Plex Mono for paths, commands and values.
- **Layout grammar:** content sits in the area above the lower third (`contentArea("lowerThird", "highlight")`),
  one idea per scene, left-aligned, usually one card or one screenshot with a single callout.
- **Titles:** lower third, kicker plus headline, the kicker reads "Step N · Verb the thing".
- **Captions:** word highlight in the accent. Without word timings it falls back to plain outlined text.
- **Motion:** calm. Transitions are wipes to the left, 18 frames, like turning a page.
- **Background:** a light dot grid with a little grain, like squared notebook paper.
- **Recurring devices:** the intro card (logo, "Lanternfield Academy · Episode N", the episode title), the
  outro card ("Next: ..."), a hard 2px ink outline with an offset shadow on every card, and a single
  orange callout per screenshot.

## Continuity

Fixed in every episode:

- Palette, fonts, title treatment (lower third), caption treatment (highlight), motion (calm),
  transition (wipe left, 18 frames), background (dots with grain), card shape (radius 10, stroke 2, hard shadow).
- The logo, top right, 64px high, from `assets/logo.svg`.
- `components/SeriesCards.tsx`: `IntroCard` over the start of the first scene, `OutroCard` over the end of
  the last one. The episode number counts up.
- The voice in `series.json`.
- Kickers follow "Step N · Verb the thing" for steps, and plain labels for intro and recap scenes.

May vary per episode:

- Scene layouts, screenshots, diagrams and the number of scenes.
- Which of pine and amber marks which category, as long as orange stays the "act here" colour.
- Per-scene transition overrides for a deliberate beat (a `cut` into a recap, say), at most one per episode.
