---
name: make-video
description: Turn a plain-language request ("make a marketing video for example.com", "I need a training video on how X works", "explain what our product does") into a narrated, captioned 1080p MP4 in this repo. Use when the user asks for any video (training, tutorial, walkthrough, explainer, marketing, product) or to change or re-render an existing one in videos/.
---

# Make a video

You are the whole pipeline: researcher, art director, script writer, voice producer, motion designer and QA.
The user gives a request, often a single line. You hand back `out/<id>/<id>-v<N>.mp4` that you have rendered
and looked at.

Every video gets its own look, decided from its subject, audience, purpose, brand and tone. You decide the
design yourself: never ask the user to pick a style. In the hand-off you name the look you chose and two
others that would also fit, so they can ask for one.

The public examples are `videos/openclaw/` and `videos/getting-started/`. They teach the mechanics only:
how audio is wired, how scenes are timed, how an animation is tied to a spoken word. Do not start a new video
from either of them or from any other video in `videos/`: do not copy its `Video.tsx`, its helpers, its palette
or its layout. A helper that turns out to be generally useful belongs in `src/kit/`, not in a copy.

## 0. Privacy

`videos/*`, `out/*` and `series/*` are git-ignored except the two examples and `series/demo/`, because videos
and series usually contain client material. Keep every file for a video inside `videos/<id>/`, never commit
one, and never move one into a tracked folder. Screenshots of real apps can show personal data (names, phone
numbers, emails): blur it or use demo data before the user shares the video, and say so in your reply.

## 1. Understand the request and gather sources

Pick a video id (kebab-case). Work out three things, and ask only when the request leaves one open and a
wrong guess would waste a render:

- **Kind.** *Training/tutorial*: how to do a task, step by step, plain and calm. *Explainer*: how something
  works. *Marketing*: what a product does for its users, confident and benefit-led, written as a working
  product in the present tense.
- **Audience.** Who watches it, and what they already know.
- **Sources.** Every fact in the video comes from one of these:
  - A public website: `pnpm capture-site <id> <url> [<url> ...]` saves a screenshot, a full-page screenshot
    and the visible text of each page to `videos/<id>/research/`. Read the `.txt` files. Capture the home
    page plus the pages that explain the product (features, how it works, pricing only if the user wants
    prices in the video). Use WebFetch for pages that need no screenshot.
  - A codebase or docs folder: read its README and docs. Delegate wide reading to a subagent and keep the
    conclusions.
  - A running app: capture real screenshots (see "App walkthroughs" below).
  - Files the user attaches: transcripts, PDFs, decks.

Write `videos/<id>/NOTES.md`: the request, the sources you used, and every assumption. It stays with the
video and tells the next session what this video rests on.

Rules for content:
- State only what the sources say. That includes decorative numbers on screen (counts, uptimes, prices).
- Marketing: no invented customers, quotes, testimonials, metrics or awards. Leave out anything the
  sources mark as planned or beta unless the user says to include it.
- Real people in sources (support transcripts, team pages) stay out of the video unless the user asks.
- Product UI only ever comes from real screenshots. Never draw a fake version of a real app screen.

## 2. Design the look

Before the script, decide how this video looks. Skip to "Series" below when the request names a series
("the next video in the onboarding series") or says "same style as <id>".

**Inputs.** The subject, the audience, the purpose (training, marketing, explainer), the tone, and the brand:

- `videos/<id>/research/brand.json`, when the capture wrote one: the site's colours with their CSS role
  (`background`, `surface`, `text`, `muted`, `link`, `button`, `accent`, `border`) and `share` (how much of
  the page uses each, sorted high to low), its fonts with their role and whether each is on Google Fonts
  (`googleFont`), and `logo`, `favicon` and `ogImage` paths (relative to `videos/<id>/`, or `null`).
  A missing `brand.json` is normal: work from the screenshots and the text.
- A brand font that is not on Google Fonts: use the nearest Google family, unless the user supplied the
  font files, which then go in `videos/<id>/assets/` as a local font token.
- Use a logo only from the brand's own site or files.

**Pick a look.** Read `.claude/skills/make-video/looks/README.md` and the entries that could fit. A look is a
starting vocabulary, not a template: adapt it to this content, mix two, or invent your own. Choose two
alternates while you are at it; they go in the hand-off.

**Write `videos/<id>/design.md`** (about one page):

- the look and why it fits this subject, audience and brand
- the palette, with where each colour came from (`brand.json` role and share, a screenshot, or chosen)
- the type pairing (display, body, mono) and why
- the layout grammar: where content sits, how dense, what repeats
- title treatment, caption treatment, motion preset, default transition and any per-scene overrides
- two or three recurring devices that belong to this subject (not to the look in general)
- the two alternates, one line each

**Write the `design` block in `video.json`** (schema: `src/video/design.ts`). Only `look`, `palette` and
`fonts` are required; everything else has a default.

```json
"design": {
  "look": "blueprint",
  "palette": { "bg": "#0f2a4a", "surface": "#13355d", "fg": "#e8f1ff", "muted": "#8fb0d9", "line": "#3f6a9c", "accent": "#ffd166", "accents": ["#7bdff2"] },
  "fonts": { "display": { "family": "IBM Plex Mono", "weights": [500, 700] }, "body": { "family": "IBM Plex Sans", "weights": [400, 700] } },
  "type": { "titleCase": "upper", "titleTracking": 0.06, "titleScale": 0.9 },
  "shape": { "radius": 2, "stroke": 2, "shadow": "none" },
  "background": { "kind": "grid", "size": 48 },
  "motion": "mechanical",
  "transition": { "kind": "wipe", "frames": 16, "direction": "left" },
  "title": "lowerThird",
  "caption": "strip",
  "logo": { "src": "research/brand/logo.svg", "placement": "top-right", "height": 56 }
}
```

- **Fonts:** any Google Fonts family by its exact name with the weights it has, or local files:
  `{ "family": "Brand Sans", "files": [{ "src": "assets/BrandSans-Bold.woff2", "weight": 700 }] }`.
  `pnpm render` checks every family, weight and file before it bundles.
- **Titles:** `banner` (top-left badge and headline), `hero` (centred, then clears), `lowerThird`, `rail`
  (left column), `kinetic` (full-screen words, then clears), `none`. A scene can override with `"title"`.
- **Captions:** `pill`, `strip` (full-width band), `outline` (plain text with a ring), `highlight` (marks
  the word being spoken). Captions are always burned in and the `.srt` is always written.
- **Motion:** `calm`, `snappy`, `bouncy`, `mechanical`: each sets easing, spring, stagger and entrance style.
- **Transitions:** `cut`, `crossfade`, `wipe`, `push`, `zoom`, `iris`, with `frames` and `direction`.
  A scene can override the transition into it with `"transition"`.
- **Background:** `solid`, `gradient`, `grid`, `dots`, `grain`, `texture` (an image `src`), plus `grain`
  0-0.4 on any of them.

To see every treatment, run `pnpm gallery` (stills in `out/kit-gallery/`) or open `kit-gallery` in
`pnpm studio`.

### Series

A series is a saved look, in `series/<name>/`: `design.json` (the tokens), `design.md` (the direction and
its continuity rules), `series.json` (the voice and where it came from), `components/` (series parts such as
an intro card) and `assets/` (logos, font files). `series/demo/` is the tracked example.

When the request names a series, or says "same style as <id>" (export that video's look first, see below):

```bash
pnpm series:use <name> <id>     # copies the tokens, components, brand files and design.md into videos/<id>/
```

The episode copies the series: `video.json` gets the `design` block and `"series": "<name>"`, and the files
land in `videos/<id>/`. Skip look selection. Read the series `design.md` and keep everything its Continuity
section fixes (palette, fonts, title and caption treatment, intro and outro, transitions, voice, kicker
convention, logo placement). Vary only what it allows. Note the series in `NOTES.md`.

To save a look as a series (when the user asks, or for "same style as <id>"):

```bash
pnpm series:export <id> <name>  # writes series/<name>/ from videos/<id>/
```

Then read `series/<name>/design.md` and tighten its generated Continuity section into real rules.

## 3. Plan the script

- 4-8 scenes, 45-120 seconds unless the user says otherwise. One idea per scene.
- Training arc: what you'll do / each step / done. Explainer: what it is / the parts / how they fit /
  recap. Marketing: the problem / what the product does / how it works / the result / call to action
  (the site's own call to action, e.g. "Book a demo at example.com").
- Narration: plain spoken English, 125-155 words per minute, short sentences. Each scene's narration is
  one voice clip.

## 4. Write `videos/<id>/video.json`

Schema: `src/video/schema.ts`. Each scene has `id`, `narration`, and optional `kicker` (small label, e.g.
"Step 2 · Upload the file"), `headline` (one line on screen), `minSeconds`, `title` and `transition`. Leave
`kicker` and `headline` out when the title treatment is `none` or the scene speaks for itself. Copy `voice`
from the OpenClaw example unless the user asks for another voice or the series sets one. Put the user's
original request in `brief`.

## 5. Voice

```bash
pnpm voice <id>                  # needs ELEVENLABS_API_KEY in the environment
pnpm voice <id> --placeholder    # silent clips sized to the text, no key needed
```

Clips are cached by a hash of text + voice, so only new or reworded scenes spend ElevenLabs credits. If the
key is exported in a shell profile that non-interactive shells skip (such as `~/.bashrc`), load just that
line, e.g. `eval "$(grep '^export ELEVENLABS_API_KEY=' ~/.bashrc)"`. Never write the key into a file.

`pnpm voice` writes `videos/<id>/voice.json` with each clip's duration and character timings. Real audio
durations set each scene's length; never speed speech up to fit. Placeholder clips let you build and
preview scenes first; `pnpm render <id> --preview` renders them, and a full render refuses until real
narration exists. Changing the voice or its settings needs a fresh `pnpm voice`.

**Word timings.** ElevenLabs clips carry character timings, so effects can land on an exact word. Adopted
or placeholder clips have none (`voice.json` prints `timing: estimated`). Without them:
- `highlight` captions fall back to the plain form of the same treatment (`pnpm render` prints a note);
- `phraseFrame` estimates from the text, so a sync is right to the phrase, not the word;
- use `hasWordTimings(scene)` or `wordFrame(...)` (returns `null`) to leave out an effect that only works on
  the exact word.

## 6. Visuals: `videos/<id>/Video.tsx` and `videos/<id>/index.ts`

`index.ts` registers the video:

```ts
import { defineVideo } from "../../src/video/registry";
import { MyVideo } from "./Video";
import spec from "./video.json";
import voice from "./voice.json";

export default [defineVideo(spec, voice, MyVideo)];
```

It can register variants of one script with `defineVideo(spec, voice, OtherComponent, "flat")`, which renders
as composition `<id>-flat`.

Build the scenes for this video's design, from the kit in `src/kit/`. The component gets
`{ videoId, timeline, design }` (`VideoProps`). Wrap everything in `<Designed>`; inside it every kit part
reads the tokens:

```tsx
export const MyVideo: React.FC<VideoProps> = ({ videoId, timeline, design }) => (
  <Designed videoId={videoId} design={design}>
    <AbsoluteFill>
      <Backdrop />
      <SceneTrack timeline={timeline} render={(scene) => <Scene scene={scene} />} />
      <Titles scenes={timeline.scenes} />
      <Logo />
      <Captions timeline={timeline} />
      <NarrationAudio videoId={videoId} timeline={timeline} />
    </AbsoluteFill>
  </Designed>
);
```

Design-driven parts:
- `design.tsx`: `Designed`, `useDesign()` (palette, `families`, `weights`, `accents`, `shape`, ...),
  `useMotion()`, `surfaceStyle(d)` for cards and panels.
- `motion.ts`: `entrance(m, frame, fps, start, index)` and `exit(...)` (spread onto a style), `motionRamp`,
  `motionSpring`.
- `titles.tsx`: `Title`, `Titles`, `titleClear(scene, fps, treatment)` (when a hero or kinetic title has
  left), `useContentArea(scene)`.
- `transitions.tsx`: `SceneTrack` runs each scene only while it is on screen and transitions between
  neighbours. Scenes keep their timeline frames, so narration and `phraseFrame` stay in sync. Pass `opaque`
  when neighbouring scenes are different full-frame pictures.
- `backdrop.tsx`: `Backdrop` (the background treatment), `Logo` (the logo at its placement).
- `overlay.tsx`: `Captions` (takes the caption treatment inside `<Designed>`), `NarrationAudio` (always
  include it), `Headline` (the banner), `Label`, `Phone`, `Chip`.

Building blocks, all of which take their colours from the tokens:

| Kit | Pieces |
|---|---|
| `objects.tsx` (3D, neon) | `Starfield`, `Core`, `ServerBox`, `Orb`, `Connector`, `Glow`, `Trail`, `WireBuilding` |
| `flat.tsx` (2D) | `Avatar`, `RoleTag`, `FlowLine`, `StepTracker` |
| `illustrated.tsx` (3D, clay) | `Person` + poses, `Room`, furniture, outdoors, `DaylightRig`; `Stage look="lit"` (slow: shadows) |
| `walkthrough.tsx` | `Walkthrough` (`frame="light" | "dark" | "none"`), `scheduleBeats` |
| `Stage.tsx`, `camera.ts` | a WebGL world with an HTML overlay, `useProject()`, `cameraAt(frame, moves)` |

Plain HTML, SVG and CSS in `Video.tsx` are fine and often the right tool for a look's signature devices.

**Layout and safe zones.** Each treatment holds part of the 1920x1080 frame (`src/kit/zones.ts`):

| Treatment | Holds |
|---|---|
| title `banner` | top 200px |
| title `lowerThird` | bottom 330px (above the captions) |
| title `rail` | left 480px |
| title `hero`, `kinetic` | the whole frame until `titleClear()`, then nothing |
| caption `pill`, `highlight` | bottom 170px |
| caption `strip` | bottom 150px, full width |
| caption `outline` | bottom 160px |
| `logo` | its height plus 48px at the top (or 40px at the bottom) |

`useContentArea(scene)` returns the rectangle left over. Keep objects and their labels inside it, and start
a scene's content after `titleClear()` when the title is a hero or kinetic.

Hard rules (renders must be deterministic and frame-addressable):
- Derive everything from `useCurrentFrame()`. No `useFrame`, `Date`, `performance.now`, timers or
  `Math.random` (use `random(seed)` from `remotion`).
- No network assets at render time except Google Fonts. Images, audio and font files live in
  `videos/<id>/` and load with `staticFile("<id>/...")` (the public dir is `videos/`).
- Sync every reveal, click and status change to the narration with `phraseFrame(scene, "exact words", fps)`.

## 7. Storyboard and the distinctiveness check

```bash
pnpm typecheck
pnpm render <id> --stills-only                    # one still per scene + out/<id>/stills/contact.jpg
pnpm render <id> --stills-only --frames 240,610   # specific frames
pnpm compare <id>                                 # out/<id>/stills/compare.jpg
```

Open `contact.jpg` and look. Fix before rendering the video:
- text overlapping text (labels, captions, headline, logo), anything cut off at an edge
- objects hidden behind labels, small text that would be unreadable on a phone
- a scene whose picture does not match what the narration says at that moment

Then open `compare.jpg`. Its top row is this storyboard. Below it:
- **A video with no series:** this video's previous look (if it was rendered before) and the three other
  videos rendered most recently. Write down in one or two sentences how this video differs from each. If it
  reads as the same look (same title treatment, same palette family and same layout), revise the design
  and the scenes before rendering.
- **A series episode:** the previous episode in the series. Check it reads as the same family (palette,
  fonts, titles, captions, intro and outro). Fix any drift.

When the user wants to approve the look first, send them the contact sheet and wait.

## 8. Render and verify

```bash
pnpm render <id>
```

Takes about 1-3 minutes per minute of video for 2D and neon styles (software WebGL); illustrated 3D with
shadows is much slower. Every render writes a new version and never replaces an earlier one:
`out/<id>/<id>-v<N>.mp4` (H.264/AAC, -16 LUFS), `.srt` captions and `.md` script. Files only appear once
QA passes (streams, size, fps and duration against the timeline). Treat anything but `QA passed` as failed.
A passed render also saves the sources that made it in `videos/<id>/versions/<id>-v<N>/` and its contact
sheet in `out/<id>/contacts/`.

Then pull 6-9 frames from the MP4 itself at moments of motion and look at them:

```bash
ffmpeg -v error -ss <seconds> -i out/<id>/<id>-v<N>.mp4 -frames:v 1 -vf scale=640:-1 /tmp/f.jpg
```

Only report the video as done after you have looked at frames from the rendered file.

## 9. Hand-off

Give the user:
- the path and the duration
- the look you chose, in a few words, and two alternates that would also fit, e.g. "Look: blueprint.
  Would also work: editorial, or terminal. Say 'make it editorial instead' for a new version."
- anything you assumed or simulated
- after a training video, one line: the look can be saved as a series for the next videos.

## 10. Revisions

- Reworded narration: edit `video.json`, `pnpm voice <id>` (only changed clips are re-made), re-render.
- Visual change: edit `Video.tsx`, check stills, re-render.
- Another look ("make it blueprint instead"): a new version of the same id. Update `design.md`, the design
  block and `Video.tsx`, then storyboard, compare (the earlier look counts as one to differ from) and render.
  The earlier version's sources stay in `versions/`.
- Back to an earlier look: `pnpm restore <id> v2` puts that version's sources back (current unsaved sources
  are kept first), then render; it becomes the next version.
- Preview interactively: `pnpm studio`.

## App walkthroughs (real screenshots)

1. Write a capture recipe at `videos/<id>/capture.ts` with Playwright on top of `scripts/capture/harness.ts`:
   - `openBrowser()` opens a read-only browser. Every request that could change data is aborted and
     recorded in `violations`, unless `allowWrite` lets it through (a login POST, say) or a `fakeWrites`
     entry answers it with a canned response. `rewriteReads` patches JSON responses, for a state the
     test account lacks. WebSockets are closed unless `allowWebSocket` lets them connect. Throw when `violations` is non-empty.
   - `recorder(page, "videos/<id>/capture").snap(id, action, label, locator)` saves a 2x screenshot and the
     target's box for each step; `write(meta)` writes `capture.json`. Pass
     `simulated: [...h.rewritten, ...h.faked]` in `meta` and tell the user what was simulated.
   - Use stable selectors (`getByTestId`, roles). Read credentials from the environment, and set passwords
     with a value setter rather than `fill()` so they never land in a log.
   - Run it with `pnpm exec tsx videos/<id>/capture.ts`.
2. Never write to a shared or production environment from a capture.
3. Build the scenes with `Walkthrough` and `scheduleBeats`: each beat shows one capture step, eases the
   camera onto its target, moves the cursor there, clicks, spotlights and labels it. Anchor beats to the
   narration with `phraseFrame`. Pick the frame (`light`, `dark`, `none`) that suits the design.
4. Blur or replace personal data in the screenshots before the video goes public.
