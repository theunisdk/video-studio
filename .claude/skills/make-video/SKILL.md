---
name: make-video
description: Turn a plain-language request ("make a marketing video for example.com", "I need a training video on how X works", "explain what our product does") into a narrated, captioned 1080p MP4 in this repo. Use when the user asks for any video (training, tutorial, walkthrough, explainer, marketing, product) or to change or re-render an existing one in videos/.
---

# Make a video

You are the whole pipeline: researcher, script writer, voice producer, motion designer and QA. The user
gives a request, often a single line. You hand back `out/<id>/<id>-v<N>.mp4` that you have rendered and
looked at.

The public example is `videos/openclaw/` (sources) and `out/openclaw/` (its render). Read it before writing
a new video. Other folders in `videos/` are the user's own videos; they are good references too.

## 0. Privacy

`videos/*` and `out/*` are git-ignored except the OpenClaw example, because videos usually contain
client material. Keep every file for a video inside `videos/<id>/`, never commit one, and never move one
into a tracked folder. Screenshots of real apps can show personal data (names, phone numbers, emails):
blur it or use demo data before the user shares the video, and say so in your reply.

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

## 2. Plan the script

- 4-8 scenes, 45-120 seconds unless the user says otherwise. One idea per scene.
- Training arc: what you'll do / each step / done. Explainer: what it is / the parts / how they fit /
  recap. Marketing: the problem / what the product does / how it works / the result / call to action
  (the site's own call to action, e.g. "Book a demo at example.com").
- Narration: plain spoken English, 125-155 words per minute, short sentences. Each scene's narration is
  one voice clip.

## 3. Write `videos/<id>/video.json`

Schema: `src/video/schema.ts`. Each scene has `id`, `kicker` (small label, e.g. "Step 2 · Upload the file"),
`headline` (one line on screen), `narration` and optional `minSeconds`. Copy `voice` from the OpenClaw
example unless the user asks for another voice. Put the user's original request in `brief`.

## 4. Voice

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

## 5. Visuals: `videos/<id>/Video.tsx` and `videos/<id>/index.ts`

`index.ts` registers the video (copy the OpenClaw one). It can register variants of one script with
`defineVideo(spec, voice, OtherComponent, "flat")`, which renders as composition `<id>-flat`.

Pick a style for the subject, and build from the kit in `src/kit/`. Put new pieces there only when they
are reusable.

| Style | Good for | Kit | Render speed |
|---|---|---|---|
| Neon 3D, dark | software, systems, abstract ideas | `objects.tsx`: `Starfield`, `Core`, `ServerBox`, `Orb`, `Connector`, `Glow` | fast |
| Flat 2D, light | message flows, people and roles, phones | `flat.tsx`: `Avatar`, `RoleTag`, `FlowLine`, `StepTracker`; `overlay.tsx`: `Phone` | fastest |
| Illustrated 3D, light | people in real places | `illustrated.tsx`: `Person` + poses, `Room`, furniture, outdoors, `DaylightRig`; `Stage look="lit"` | slow (shadows) |
| Screenshot walkthrough | how to use a real app or site | `walkthrough.tsx`: `Walkthrough`, `scheduleBeats` | fastest |

Marketing videos for a website usually mix styles: real screenshots of the site (from `research/`, shown
with `Img` from `remotion` or `Walkthrough`) for the product, flat 2D for the story around it. Take colours
and type cues from the site so the video feels like the brand. Use logos only from the site itself.

Shared pieces:
- `Stage` (`Stage.tsx`): WebGL world plus an HTML overlay; `useProject()` anchors HTML to 3D points.
- `cameraAt(frame, moves)` (`camera.ts`): hold a shot, ease to the next. One continuous world reads better
  than cuts.
- `overlay.tsx`: `Headline`, `Captions`, `Label`, `Phone` (chat with text, photo, voice-note and button
  messages), `Chip`, `NarrationAudio` (always include it).
- `theme.ts`: `darkTheme`, `lightTheme` through `ThemeContext`; fonts load from Google Fonts.
- `anim.ts`: `ramp`, `pop`, `visibleBetween`, `lerp`.
- `phraseFrame(scene, "exact words", fps)` (`src/video/timeline.ts`): the frame where those words are
  spoken. Sync every reveal, click and status change to the narration this way.

Hard rules (renders must be deterministic and frame-addressable):
- Derive everything from `useCurrentFrame()`. No `useFrame`, `Date`, `performance.now`, timers or
  `Math.random` (use `random(seed)` from `remotion`).
- No network assets at render time except the Google fonts in `theme.ts`. Images and audio live in
  `videos/<id>/` and load with `staticFile("<id>/...")` (the public dir is `videos/`).
- Layout at 1920x1080: the headline zone is the top ~200px and captions sit in the bottom ~140px. Keep
  objects and their labels between y≈200 and y≈880.

## 6. Storyboard before the full render

```bash
pnpm typecheck
pnpm render <id> --stills-only                    # one still per scene + out/<id>/stills/contact.jpg
pnpm render <id> --stills-only --frames 240,610   # specific frames
```

Open `contact.jpg` and look. Fix before rendering the video:
- text overlapping text (labels, captions, headline), anything cut off at an edge
- objects hidden behind labels, small text that would be unreadable on a phone
- a scene whose picture does not match what the narration says at that moment

When the user wants to approve the look first, send them the contact sheet and wait.

## 7. Render and verify

```bash
pnpm render <id>
```

Takes about 1-3 minutes per minute of video for 2D and neon styles (software WebGL); illustrated 3D with
shadows is much slower. Every render writes a new version and never replaces an earlier one:
`out/<id>/<id>-v<N>.mp4` (H.264/AAC, -16 LUFS), `.srt` captions and `.md` script. Files only appear once
QA passes (streams, size, fps and duration against the timeline). Treat anything but `QA passed` as failed.

Then pull 6-9 frames from the MP4 itself at moments of motion and look at them:

```bash
ffmpeg -v error -ss <seconds> -i out/<id>/<id>-v<N>.mp4 -frames:v 1 -vf scale=640:-1 /tmp/f.jpg
```

Only report the video as done after you have looked at frames from the rendered file. Give the user the
path, the duration, and anything you assumed or simulated.

## 8. Revisions

- Reworded narration: edit `video.json`, `pnpm voice <id>` (only changed clips are re-made), re-render.
- Visual change: edit `Video.tsx`, check stills, re-render.
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
   narration with `phraseFrame`.
4. Blur or replace personal data in the screenshots before the video goes public.
