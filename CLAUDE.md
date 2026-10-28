# Video Studio

This repo turns a plain-language request into a narrated, captioned MP4. For any request for a video
(training, tutorial, explainer, marketing, product, walkthrough) or a change to an existing one, follow the
`make-video` skill in `.claude/skills/make-video/SKILL.md`.

CodeRabbit: none

- One folder per video: `videos/<id>/` for sources, `out/<id>/` for renders. Both are git-ignored except
  the two public examples (`openclaw`, `getting-started`). Never commit another video or move its files into a tracked folder.
- Renders never overwrite: each one is a new `<id>-v<N>.mp4`.
- Never write API keys or passwords into files. ElevenLabs reads `ELEVENLABS_API_KEY` from the environment.
- `pnpm typecheck` before rendering.
