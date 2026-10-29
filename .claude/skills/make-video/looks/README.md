# Looks library

These are starting points for a video's design direction. They are not templates.
Each file describes a look in words: when it fits, how to get its palette and type, where content goes,
which title, caption, motion and transition tokens suit it, and two to four signature devices.
None of them holds code to copy.

You use the library in the design step, before the script. The result is `videos/<id>/design.md`
plus the `design` block in `video.json` (schema: `src/video/design.ts`).

## How to use it

1. Read the request and the research. Note the subject, the audience, the purpose (teach, explain, sell,
   announce), the brand (`videos/<id>/research/brand.json`, screenshots) and the tone.
2. Pick the look that fits those best. Then change it to fit this video:
   - Take colours from the brand, not from the example palette in the look file.
   - Pick the signature device from the subject. A video about shipping gets a route line, not a generic card.
   - Change the title or caption treatment when the content needs the space.
   - Check contrast with `contrast()` from `src/kit/color.ts`. `fg` and `muted` need 4.5 or more on `bg` and `surface`.
     `accent` needs 3 or more on `bg`, because kickers are set in it.
3. Or mix two looks (say blueprint-technical structure with paper-collage warmth), or invent a new one.
   Set `look` to the file name you started from, to `"a+b"` for a mix, or to a short name of your own.
4. Never copy another video's `Video.tsx`, palette or scene layout. Two videos that share a look
   should still look different.
5. In the hand-off, name the look you chose and two alternates you considered, with one line each on why not.

The sample `design` block at the end of each file parses against `designSchema` and its fonts exist.
Treat it as one starting point. Every value in it is meant to change.

## The looks

| Look | When it fits |
| --- | --- |
| [editorial-magazine](editorial-magazine.md) | Thoughtful explainers, reports, long-form ideas told with words and a few strong pictures. |
| [kinetic-typography](kinetic-typography.md) | Short punchy messages, launches, manifestos, where the words are the picture. |
| [blueprint-technical](blueprint-technical.md) | Architecture, how a system is built, engineering audiences, parts and measurements. |
| [paper-collage](paper-collage.md) | Friendly stories, community, education for non-experts, warm human subjects. |
| [terminal-data](terminal-data.md) | Developer tools, CLIs, logs, metrics, anything that lives in a shell or a dashboard. |
| [cinematic-3d](cinematic-3d.md) | Spatial or physical subjects, a place or a journey, a premium tone. |
| [soft-product-ui](soft-product-ui.md) | App and SaaS walkthroughs, onboarding, feature tours over real screenshots. |
| [hand-drawn-sketch](hand-drawn-sketch.md) | Early ideas, whiteboard explanations, processes told as a simple story. |
| [bold-poster-retro](bold-poster-retro.md) | Events, campaigns, consumer marketing, loud and confident short videos. |
| [minimal-swiss](minimal-swiss.md) | Serious, precise subjects: policy, finance, process, data told with restraint. |
| [neon-3d](neon-3d.md) | Abstract systems shown as glowing parts in a dark space (the openclaw example video). |
| [flat-2d](flat-2d.md) | Light, tidy step-by-step tours with cards and a step tracker (the getting-started example video). |

## Where the tokens come from

- Title treatments: `banner`, `hero`, `lowerThird`, `rail`, `kinetic`, `none` (`src/kit/titles.tsx`).
- Caption treatments: `pill`, `strip`, `outline`, `highlight` (`src/kit/subtitles.tsx`).
  `highlight` marks the spoken word only when the scene has word timings; otherwise it shows plain text.
- Safe zones: `titleZones`, `captionZones` and `contentArea(title, caption)` in `src/kit/zones.ts`; `useContentArea(scene)` in `src/kit/titles.tsx` also clears the logo.
  Scene content goes inside `contentArea`. `hero` and `kinetic` hold the whole frame until `titleClear()`.
- Motion: `calm`, `snappy`, `bouncy`, `mechanical` (`src/kit/motion.ts`, with `entrance` and `exit`).
- Transitions: `cut`, `crossfade`, `wipe`, `push`, `zoom`, `iris`, run by `SceneTrack`.
  A scene in `video.json` can override `title` and `transition` for itself.
