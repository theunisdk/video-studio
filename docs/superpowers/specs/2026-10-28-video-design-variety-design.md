# Design variety for Video Studio

Date: 2026-10-28

## Intent

Every video Video Studio makes looks alike. Three causes, found in the repo:

- The `make-video` skill tells Claude to "read the closer one before writing a new video"
  (`SKILL.md:12-13`). Claude then copies it. The newest private video
  is a near-clone of `getting-started`: same card helpers, gradient background, `StepTracker`, badge
  sequence and "Step N ·" kickers. Only the palette and font changed.
- Every scene opens with the same `Headline` banner (top-left, round badge, `overlay.tsx:21-45`) and
  carries the same caption pill (`overlay.tsx:48-60`). The fixed safe-zone rule (`SKILL.md:117-118`)
  forces everything into the middle band.
- The kit has two fixed themes (`theme.ts`), one easing and one spring (`anim.ts`), and the videos
  only crossfade between scenes. Several kit parts hard-code colours.
- No step decides the design, and the storyboard check looks only for defects.

The goal: each video's look comes from its own content and brand, so two videos on different subjects
look different, and a series of training videos can share one look on purpose. Making a video stays
one plain request: Claude decides the design itself and asks the user nothing new.

## Goals

1. **A design step.** Before the script, Claude writes a design direction for the video, derived from
   the subject, audience, purpose (training, marketing, explainer), brand (site colours, fonts and logo
   from the capture) and tone. It goes in two places: `videos/<id>/design.md` (about one page: the
   chosen look and why it fits, palette with where each colour came from, type pairing, layout grammar,
   title and caption treatment, motion, transitions, recurring devices) and a `design` block in
   `video.json` that the code reads.
2. **A library of looks**, written as descriptions, not code, in `.claude/skills/make-video/looks/`.
   About eight to ten, for example editorial/magazine, kinetic typography, blueprint/technical,
   paper cut-out/collage, terminal/data, cinematic 3D, soft product UI, hand-drawn/sketch,
   bold poster/retro and minimal Swiss. The existing neon 3D and flat 2D styles become entries too.
   Each entry says when it fits, its palette and type approach, layout grammar, title and caption
   treatment, motion preset, transitions, signature devices, what to avoid, and which kit parts build
   it. Looks are a starting vocabulary: a design direction adapts one to the content, mixes two, or
   invents its own.
3. **Options without questions.** Claude picks the look itself. In the hand-off it names the look it
   chose and two others that would also fit, so the user can say "make it blueprint instead". A
   re-render in another look is a new version, as every render already is.
4. **A kit that can render those looks.** Opt-in, on top of what exists:
   - Design tokens read from the `design` block: palette, fonts (any `@remotion/google-fonts`
     family for display, body and mono), shape (radius, stroke, shadow), background treatment
     (solid, gradient, texture, grain, grid), motion preset, default transition, title treatment and
     caption treatment. Kit components read the tokens instead of fixed constants.
   - Title treatments: the current banner plus at least four others, such as a centred hero, a
     lower third, a side rail, a full-screen kinetic word, and none. `kicker` and `headline` become
     optional in the schema.
   - Caption treatments: the current pill plus at least three others, such as a full-width strip,
     plain text with an outline or shadow, and word-by-word highlight using the existing word timings.
     Captions stay burned in and legible on every look, and the `.srt` stays.
   - Transitions: crossfade plus at least four others (cut, wipe, push, zoom, mask/iris), with a
     per-scene override. Narration sync must survive: each scene still lasts as long as its clip and a
     word-timed animation still lands on its word.
   - Motion presets: at least four (such as calm, snappy, bouncy, mechanical), each setting easing,
     spring, stagger and entrance style.
   - No hard-coded colours left in kit parts: `StepTracker` (`flat.tsx`), `Starfield` (`objects.tsx`),
     the walkthrough browser frame (`walkthrough.tsx`, which also gets dark and frameless variants) and
     the illustrated furniture (`illustrated.tsx`) take their colours from tokens.
   - Safe zones are documented per title and caption treatment instead of one fixed rule.
5. **No more copying.** The skill stops telling Claude to start from the closest example. Examples
   teach the mechanics only: wiring audio, timing scenes, tying an animation to a word. A new video does
   not copy another video's `Video.tsx`, helpers or palette. A helper that turns out to be generally
   useful moves into the kit.
6. **A distinctiveness check.** At the storyboard step, a script puts this video's contact sheet beside
   those of the last three videos rendered, leaving out videos in the same series:
   `pnpm compare <id>` writes `out/<id>/stills/compare.jpg`. Claude looks at it and states how this
   video differs. If it reads as the same look (same title treatment, palette family and layout),
   Claude revises before rendering.
7. **Series looks, for continuity across a set of training videos.**
   `pnpm series:export <id> <name>` writes a self-contained folder `series/<name>/`: `design.json`
   (the tokens), `design.md` (the direction, plus continuity rules: what stays fixed across episodes,
   such as palette, fonts, title and caption treatment, intro and outro, transitions, voice, kicker
   convention and logo placement, and what may vary), and any series-specific components, such as an
   intro card, as `.tsx`. When a request names a series ("the next video in the onboarding series"),
   or says "same style as <id>", Claude uses that look, skips look selection and keeps the fixed parts.
   For those videos, the compare step checks continuity with the previous episode instead of
   difference. `series/` is git-ignored, because series carry client brands, except `series/demo/`
   (goal 12). The folder can be copied to another machine. After a training video, the hand-off mentions in one line that the look can be
   saved as a series.
   - An episode **copies** the series into its own folder: the `design` block, the series components and
     the brand files go into `videos/<id>/`, and `video.json` records which series it came from. Each
     episode then renders the same way forever, a video folder works when copied on its own, and a
     missing `series/` folder never fails `pnpm typecheck`. A later change to a series reaches new
     episodes only; restyling old ones is a re-render on request.
   - A series carries its brand files: local font files and logos sit in `series/<name>/assets/`, and an
     episode copies them into its own folder so Remotion can serve them.
8. **Brand extraction in capture.** `pnpm capture-site` also writes `videos/<id>/research/brand.json`:
   the site's computed colours with the CSS role each came from (background, text, link, button, accent)
   and how much each is used, its font families with where each is used, and its logo, favicon and
   `og:image` saved as files. The design step reads it, so the palette in `design.md` can say where each
   colour came from. A site whose fonts are not on Google Fonts gets the nearest Google family, unless
   the font files are supplied.
9. **Fonts beyond Google.** A font token is either a Google Fonts family or a local font file in the
   video folder, so a client's own brand font works (one private video already does this by hand
   through `FontFace` and `staticFile`).
10. **Every look stays renderable.** When the user asks for another look ("make it blueprint
    instead"), the new look is the next version of the same id. Each render saves the sources that
    produced it (`Video.tsx`, `video.json`, `design.md`) under its version number, so any earlier
    version can be rendered again. The saved copies must not break `pnpm typecheck`. The compare step
    counts the same video's earlier look as one to differ from.
11. **Word-timed effects need word timings.** Word-by-word caption highlight and word-tied motion only
    run when the narration has word timings (`alignment` in `voice.json`). Without them, the caption
    falls back to the plain form of the same treatment, which a series allows. `openclaw` has no word
    timings, so it exercises this fallback.
12. **A demo series.** `series/demo/` is tracked and shows what a series looks like: its `design.json`,
    `design.md` with continuity rules, any series components, and `assets/`. It uses a fictional brand
    or Video Studio's own look, with Google Fonts or assets made for it, and no real company's brand.
    The README shows how to make a video in it ("make a training video in the demo series").

## Non-goals

- A house style that makes every video recognisable as Video Studio. The user said it isn't needed.
- Changes to the voice or TTS pipeline. Capture changes are limited to the brand extraction in goal 8.
- Re-rendering or restyling the two public examples.
- A GUI or any interactive design picker.

## Anti-goals (a failure even if it works)

- Any new question to the user while making a video.
- The looks library turning into a set of templates that every video copies: ten looks that all
  videos are cloned from is the same problem again.
- A caption or title treatment that is hard to read.
- Narration and picture going out of sync.
- Breaking an existing video.

## Constraints

- The repo's `CLAUDE.md`: one folder per video; `videos/` and `out/` are git-ignored except the two
  public examples, and no other video gets committed; renders never overwrite; no API keys in files;
  `pnpm typecheck` before rendering.
- The existing kit exports (`Headline`, `Captions`, `Stage`, `theme`, `anim`, `flat`, `objects`,
  `illustrated`, `walkthrough`, `overlay`) keep their signatures and their default output, because
  private videos on other checkouts import them. The new behaviour is opt-in through the `design`
  block or new props.
- `openclaw` and `getting-started` render as they do now. Stills at the same frames match `main`.
- Remotion `4.0.534`. Any new dependency is pinned to an exact version, like the rest of
  `package.json`, for example `@remotion/transitions@4.0.534` if it is used.
- Output stays 1080p, with loudness and QA as now.
- **The repo is public and other people use it.** Saved brands never touch the core: brand data
  (`brand.json`, logos, font files, series) lives only in the git-ignored `videos/` and `series/`
  folders. The kit, the skill, the looks library, the README and the docs stay generic: no client
  names, brands, private video ids, fonts or logos in any tracked file. A series-specific component
  lives in its series folder, never in `src/kit`.

## Done means

- `pnpm typecheck` passes. Stills of `openclaw` and `getting-started` match `main` at the sampled
  frames.
- Every title, caption, transition and motion variant renders. A stills sheet of each one is the
  evidence.
- The skill has the design step, the looks library, alternates in the hand-off, the compare step and
  the series flow, and the README describes them.
- End to end: a fresh session follows the new skill and makes two videos.
  **A** reuses the `getting-started` narration (its existing audio and word timings) in a look the
  skill chose from the content; it is clearly not flat 2D with a top-left banner.
  **B** reuses the `openclaw` narration in a series exported from A; it reads as the same family as A,
  and not like the original OpenClaw video. B runs on estimated timing, so its captions use the
  fallback from goal 11 and its sync is judged at the phrase, not the word. The `compare.jpg` sheets
  show both.
- `pnpm capture-site` on a real site writes a `brand.json` whose colours and fonts match the site.
- `series/demo/` is tracked, and a stills sheet shows a scene rendered in it. `git ls-files` shows no
  other series, no `brand.json` and no client names.

## Left to the builder

- Token names, the shape of the `design` block, and component APIs.
- How transitions overlap scene edges while keeping sync.
- The exact list of looks and their content.
- How `compare` and `series:export` work inside, and what "the last three videos" means when there are
  fewer.
- Whether to add a kit gallery composition to the Remotion studio for previewing every treatment.
- Whether the two public examples move to tokens or keep the current defaults.

## Calls made by the PM, not the user

- "Options" means Claude picks and names two alternates in the hand-off. It does not ask.
- `series/` is git-ignored.
- The end-to-end proof reuses existing narration, because `ELEVENLABS_API_KEY` is not set in this
  environment and the proof is about the picture, not the voice.
- Capture extracts the brand (goal 8), and font tokens accept local files (goal 9).
- Series episodes copy the series rather than point to it (goal 7).
- Each render saves its sources, so a look change never loses the old look (goal 10).
- Word-timed effects fall back when there are no word timings (goal 11).
