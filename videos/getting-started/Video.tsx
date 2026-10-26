import { AbsoluteFill, Img, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { phraseFrame, sceneById, type TimedScene, type Timeline } from "../../src/video/timeline";
import { pop, ramp, visibleBetween } from "../../src/kit/anim";
import { StepTracker } from "../../src/kit/flat";
import { Captions, Headline, NarrationAudio } from "../../src/kit/overlay";
import { ThemeContext, fonts as baseFonts, lightTheme } from "../../src/kit/theme";

const c = {
  ink: "#1f2533",
  muted: "#687086",
  line: "#e2e4ec",
  accent: "#5b5bd6",
  coral: "#ff6b4a",
  green: "#22a06b",
  dark: "#141927",
  darkLine: "#2a3045",
};
const fonts = { display: lightTheme.fonts.display, body: lightTheme.fonts.body, mono: baseFonts.mono };

const card: React.CSSProperties = {
  position: "absolute", background: "#ffffff", borderRadius: 22,
  boxShadow: "0 24px 70px rgba(31,37,51,0.14), 0 0 0 1px rgba(31,37,51,0.06)", overflow: "hidden",
};
const darkCard: React.CSSProperties = { ...card, background: c.dark, boxShadow: "0 24px 70px rgba(20,25,39,0.35)" };

/** Fade + lift for an element that enters at `start`. */
const enter = (frame: number, fps: number, start: number, lift = 22): React.CSSProperties => {
  const p = Math.min(1, pop(frame, fps, start));
  return { opacity: p, transform: `translateY(${(1 - p) * lift}px)` };
};

const WindowDots: React.FC<{ label?: string; dark?: boolean }> = ({ label, dark }) => (
  <div style={{ height: 50, display: "flex", alignItems: "center", gap: 10, padding: "0 22px", borderBottom: `1px solid ${dark ? c.darkLine : c.line}`, background: dark ? "#1b2133" : "#f3f4f8" }}>
    {["#ff5f57", "#febc2e", "#28c840"].map((d) => (
      <div key={d} style={{ width: 14, height: 14, borderRadius: 7, background: d }} />
    ))}
    {label && <div style={{ marginLeft: 16, font: `600 19px ${fonts.mono}`, color: dark ? "#8a93ad" : c.muted }}>{label}</div>}
  </div>
);

const Lock: React.FC<{ color: string }> = ({ color }) => (
  <svg width="26" height="30" viewBox="0 0 26 30" style={{ display: "block" }}>
    <path d="M7 13 V9 a6 6 0 0 1 12 0 V13" fill="none" stroke={color} strokeWidth="3" />
    <rect x="3" y="13" width="20" height="15" rx="4" fill={color} />
  </svg>
);

const Check: React.FC<{ on: number }> = ({ on }) => (
  <div
    style={{
      width: 34, height: 34, borderRadius: 17, flex: "none", display: "flex", alignItems: "center", justifyContent: "center",
      background: on > 0.5 ? c.green : "#ffffff", border: `2px solid ${on > 0.5 ? c.green : c.line}`,
      color: "#ffffff", font: `800 19px ${fonts.body}`, transform: `scale(${0.8 + 0.2 * Math.min(1, on)})`,
    }}
  >
    {on > 0.5 ? "✓" : ""}
  </div>
);

/** Typed terminal line: characters appear from `start`. */
const typed = (text: string, frame: number, start: number, cps = 2.2) => text.slice(0, Math.max(0, Math.floor((frame - start) * cps)));

export const GettingStartedVideo: React.FC<{ videoId: string; timeline: Timeline }> = ({ videoId, timeline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (id: string) => sceneById(timeline, id);
  const at = (scene: TimedScene, phrase: string) => phraseFrame(scene, phrase, fps);
  const shown = (scene: TimedScene) => visibleBetween(frame, scene.from, scene.from + scene.durationInFrames, 12);

  const intro = s("intro");
  const ask = s("ask");
  const research = s("research");
  const script = s("script");
  const scenes = s("scenes");
  const render = s("render");
  const priv = s("private");
  const start = s("start");

  const stepScenes = [ask, research, script, scenes, render];
  const current = stepScenes.findIndex((sc) => frame < sc.from + sc.durationInFrames);
  const trackerShown = visibleBetween(frame, ask.from + 10, render.from + render.durationInFrames, 14);

  return (
    <ThemeContext.Provider value={lightTheme}>
      <AbsoluteFill style={{ background: "linear-gradient(160deg, #ffffff 0%, #f5f5fa 55%, #eceef6 100%)" }}>
        {/* 1 · intro: request in, MP4 out */}
        {shown(intro) > 0 && (
          <AbsoluteFill style={{ opacity: shown(intro) }}>
            <div style={{ ...card, left: 250, top: 400, width: 640, padding: "34px 40px", ...enter(frame, fps, at(intro, "You ask Claude") - 6) }}>
              <div style={{ font: `800 20px ${fonts.body}`, letterSpacing: "0.12em", textTransform: "uppercase", color: c.accent }}>You ask</div>
              <div style={{ font: `600 40px/1.3 ${fonts.body}`, color: c.ink, marginTop: 10 }}>"Make a one-minute video about our product."</div>
            </div>
            <svg style={{ position: "absolute", left: 930, top: 500, overflow: "visible" }} width="160" height="60">
              <path d="M0 30 L130 30" stroke={c.accent} strokeWidth="6" strokeLinecap="round" strokeDasharray="130" strokeDashoffset={130 * (1 - ramp(frame, at(intro, "and you get back") - 8, 18))} />
              <path d="M112 12 L140 30 L112 48" fill="none" stroke={c.accent} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity={ramp(frame, at(intro, "and you get back") + 6, 6)} />
            </svg>
            <div style={{ ...darkCard, left: 1130, top: 330, width: 540, height: 360, ...enter(frame, fps, at(intro, "finished") - 4) }}>
              <Img src={staticFile("getting-started/media/openclaw-frame.jpg")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} />
              <div style={{ position: "absolute", left: 220, top: 118, width: 100, height: 100, borderRadius: 50, background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 0, height: 0, borderTop: "22px solid transparent", borderBottom: "22px solid transparent", borderLeft: `36px solid ${c.accent}`, marginLeft: 10 }} />
              </div>
            </div>
            <div style={{ position: "absolute", left: 1130, top: 712, width: 540, display: "flex", gap: 12, ...enter(frame, fps, at(intro, "narrated MP4") - 4) }}>
              {["MP4 · 1080p", "Narrated", "Captions"].map((t) => (
                <div key={t} style={{ padding: "10px 18px", borderRadius: 12, background: "#ffffff", border: `1px solid ${c.line}`, font: `700 22px ${fonts.body}`, color: c.ink }}>{t}</div>
              ))}
            </div>
          </AbsoluteFill>
        )}

        {/* 2 · ask: three kinds of request typed into Claude Code */}
        {shown(ask) > 0 && (
          <AbsoluteFill style={{ opacity: shown(ask) }}>
            <div style={{ ...darkCard, left: 260, top: 250, width: 1400, height: 560, ...enter(frame, fps, ask.from + 8) }}>
              <WindowDots label="~/video-studio" dark />
              <div style={{ padding: "34px 44px", font: `500 32px/1.9 ${fonts.mono}`, color: "#e7eaf3" }}>
                <div><span style={{ color: "#6f7894" }}>$</span> claude</div>
                {[
                  { phrase: "A marketing video", text: "Make a marketing video for example.com", tag: "Marketing", color: c.coral },
                  { phrase: "A tutorial", text: "I need a tutorial on adding a user in our app", tag: "Tutorial", color: "#4cc38a" },
                  { phrase: "Or an explainer", text: "Explain how our system works, from docs/", tag: "Explainer", color: "#9d9dff" },
                ].map((r) => {
                  const t0 = at(ask, r.phrase) - 4;
                  if (frame < t0) return null;
                  return (
                    <div key={r.tag} style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 22 }}>
                      <span style={{ color: r.color }}>&gt;</span>
                      <span style={{ flex: 1 }}>{typed(r.text, frame, t0)}</span>
                      <span style={{ font: `800 20px ${fonts.body}`, padding: "6px 14px", borderRadius: 10, background: `${r.color}26`, color: r.color, opacity: ramp(frame, t0 + 12, 8) }}>{r.tag}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </AbsoluteFill>
        )}

        {/* 3 · research: a real screenshot, the files it produces, and the read-only browser */}
        {shown(research) > 0 && (
          <AbsoluteFill style={{ opacity: shown(research) }}>
            <div style={{ ...card, left: 180, top: 236, width: 860, height: 50 + 860 * (900 / 1440), ...enter(frame, fps, research.from + 8) }}>
              <WindowDots label="github.com/theunisdk/video-studio" />
              <div style={{ position: "relative", width: 860, height: 860 * (900 / 1440), overflow: "hidden" }}>
                <Img
                  src={staticFile("getting-started/research/01-theunisdk-video-studio.png")}
                  style={{ width: "100%", transformOrigin: "30% 20%", transform: `scale(${1 + 0.08 * ramp(frame, research.from, research.durationInFrames)})` }}
                />
              </div>
            </div>
            <div style={{ position: "absolute", left: 1200, top: 250, width: 600 }}>
              <div style={{ font: `700 24px ${fonts.mono}`, color: c.muted, marginBottom: 18, ...enter(frame, fps, at(research, "takes screenshots") - 8) }}>videos/&lt;id&gt;/research/</div>
              {[
                { phrase: "takes screenshots", name: "screenshots", ext: ".png", color: c.accent },
                { phrase: "reads the pages", name: "page text", ext: ".txt", color: c.coral },
              ].map((f) => (
                <div key={f.name} style={{ ...card, position: "relative", display: "flex", alignItems: "center", gap: 18, padding: "20px 26px", marginBottom: 16, ...enter(frame, fps, at(research, f.phrase)) }}>
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: `${f.color}1f`, color: f.color, font: `800 17px ${fonts.mono}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{f.ext}</div>
                  <div style={{ font: `700 30px ${fonts.body}`, color: c.ink }}>{f.name}</div>
                </div>
              ))}
              <div style={{ ...card, position: "relative", marginTop: 34, padding: "26px 28px", border: `2px solid ${c.green}`, ...enter(frame, fps, at(research, "read-only browser") - 4) }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <Lock color={c.green} />
                  <div style={{ font: `800 30px ${fonts.body}`, color: c.ink }}>Read-only browser</div>
                </div>
                {["POST", "PATCH", "DELETE"].map((m, i) => (
                  <div key={m} style={{ display: "flex", justifyContent: "space-between", font: `600 22px ${fonts.mono}`, color: c.muted, marginTop: 12, opacity: ramp(frame, at(research, "nothing gets changed") - 10 + i * 6, 8) }}>
                    <span>{m} …</span>
                    <span style={{ color: c.green }}>blocked</span>
                  </div>
                ))}
              </div>
            </div>
          </AbsoluteFill>
        )}

        {/* 4 · script and voice: this video's own scenes, with their real clip lengths */}
        {shown(script) > 0 && (
          <AbsoluteFill style={{ opacity: shown(script) }}>
            <div style={{ ...card, left: 260, top: 236, width: 1400, height: 600, ...enter(frame, fps, script.from + 6) }}>
              <WindowDots label="videos/getting-started/video.json" />
              <div style={{ padding: "18px 40px" }}>
                {timeline.scenes.slice(0, 6).map((sc, i) => {
                  const rowAt = script.from + 10 + i * 5;
                  const waveAt = at(script, "records a natural voice-over") + i * 5;
                  const grow = ramp(frame, waveAt, 16);
                  return (
                    <div key={sc.id} style={{ display: "flex", alignItems: "center", gap: 26, height: 84, borderBottom: i < 5 ? `1px solid ${c.line}` : "none", opacity: ramp(frame, rowAt, 8) }}>
                      <div style={{ width: 300, font: `800 19px ${fonts.body}`, letterSpacing: "0.1em", textTransform: "uppercase", color: c.accent }}>{sc.kicker}</div>
                      <div style={{ flex: 1, font: `600 25px ${fonts.body}`, color: c.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sc.narration}</div>
                      <div style={{ width: 260, height: 44, display: "flex", alignItems: "center", gap: 3 }}>
                        {Array.from({ length: 40 }, (_, k) => (
                          <div key={k} style={{ width: 3.5, borderRadius: 2, background: c.coral, height: Math.max(3, 40 * grow * (0.2 + 0.8 * random(`${sc.id}-${k}`))) }} />
                        ))}
                      </div>
                      <div style={{ width: 70, textAlign: "right", font: `700 22px ${fonts.mono}`, color: c.muted, opacity: grow }}>{sc.audioSeconds.toFixed(1)}s</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </AbsoluteFill>
        )}

        {/* 5 · scenes: code on the left, the result on the right, the chip pops on the spoken word */}
        {shown(scenes) > 0 && (
          <AbsoluteFill style={{ opacity: shown(scenes) }}>
            <div style={{ ...darkCard, left: 120, top: 260, width: 820, height: 480, ...enter(frame, fps, scenes.from + 8) }}>
              <WindowDots label="videos/<id>/Video.tsx" dark />
              <div style={{ padding: "34px 40px", font: `500 27px/1.75 ${fonts.mono}`, color: "#e7eaf3" }}>
                <div><span style={{ color: "#9d9dff" }}>const</span> at = <span style={{ color: "#ffd479" }}>phraseFrame</span>(</div>
                <div style={{ paddingLeft: 40 }}>scene, <span style={{ color: "#7ee0a8" }}>"right as they're said"</span></div>
                <div>);</div>
                <div style={{ marginTop: 26 }}>&lt;<span style={{ color: "#ff9b85" }}>Chip</span></div>
                <div style={{ paddingLeft: 40 }}>appear={"{"}<span style={{ color: "#ffd479" }}>pop</span>(frame, at){"}"}</div>
                <div>/&gt;</div>
              </div>
            </div>
            <div style={{ ...darkCard, left: 1000, top: 260, width: 800, height: 450, ...enter(frame, fps, at(scenes, "React and Three.js") - 4) }}>
              <Img src={staticFile("getting-started/media/openclaw-frame.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ position: "absolute", left: 1000, top: 726, font: `700 22px ${fonts.body}`, color: c.muted, opacity: ramp(frame, at(scenes, "React and Three.js") + 4, 10) }}>
              From the OpenClaw example in this repo
            </div>
            {(() => {
              const p = pop(frame, fps, at(scenes, "right as they're said"));
              return p > 0.01 ? (
                <div style={{ position: "absolute", left: 1640, top: 672, transform: `translateX(-50%) scale(${p})`, padding: "16px 28px", borderRadius: 16, background: c.coral, color: "#ffffff", font: `800 30px ${fonts.body}`, boxShadow: "0 14px 34px rgba(255,107,74,0.45)", whiteSpace: "nowrap" }}>
                  On the word
                </div>
              ) : null;
            })()}
          </AbsoluteFill>
        )}

        {/* 6 · render: storyboard, then the MP4 and its checks */}
        {shown(render) > 0 && (
          <AbsoluteFill style={{ opacity: shown(render) }}>
            <div style={{ ...card, left: 120, top: 250, width: 900, height: 50 + 900 * (728 / 1936), ...enter(frame, fps, at(render, "storyboard") - 8) }}>
              <WindowDots label="out/<id>/stills/contact.jpg" />
              <Img src={staticFile("getting-started/media/openclaw-storyboard.jpg")} style={{ width: "100%", display: "block" }} />
            </div>
            <div style={{ position: "absolute", left: 120, top: 652, font: `700 24px ${fonts.body}`, color: c.muted, opacity: ramp(frame, at(render, "storyboard"), 10) }}>
              Review the look before anything renders
            </div>
            <div style={{ ...card, left: 1090, top: 250, width: 710, padding: "30px 36px", ...enter(frame, fps, at(render, "renders the video") - 6) }}>
              <div style={{ font: `700 30px ${fonts.mono}`, color: c.ink }}>&lt;id&gt;-v1.mp4</div>
              <div style={{ font: `600 22px ${fonts.body}`, color: c.muted, marginTop: 6, opacity: ramp(frame, at(render, "with captions"), 10) }}>+ captions (.srt) and script (.md)</div>
              <div style={{ height: 1, background: c.line, margin: "24px 0 8px" }} />
              {["Video and audio streams", "1920 × 1080 at 30 fps", "Length matches the script", "Loudness at −16 LUFS"].map((label, i) => {
                const on = ramp(frame, at(render, "checks the file") + i * 9, 6);
                return (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 16 }}>
                    <Check on={on} />
                    <div style={{ font: `700 27px ${fonts.body}`, color: on > 0.5 ? c.ink : c.muted }}>{label}</div>
                  </div>
                );
              })}
              <div style={{ marginTop: 26, display: "inline-block", padding: "10px 20px", borderRadius: 12, background: c.green, color: "#ffffff", font: `800 26px ${fonts.body}`, ...enter(frame, fps, at(render, "hands it over")) }}>
                QA passed
              </div>
            </div>
          </AbsoluteFill>
        )}

        {/* 7 · private: what git ignores */}
        {shown(priv) > 0 && (
          <AbsoluteFill style={{ opacity: shown(priv) }}>
            <div style={{ ...card, left: 460, top: 240, width: 1000, padding: "10px 0 20px", ...enter(frame, fps, priv.from + 6) }}>
              <WindowDots label="video-studio/" />
              <div style={{ padding: "18px 46px", font: `600 30px/1 ${fonts.mono}`, color: c.ink }}>
                <div style={{ color: c.muted, margin: "8px 0 18px" }}>videos/</div>
                {[
                  { name: "openclaw/", open: true },
                  { name: "getting-started/", open: true },
                  { name: "product-launch/", open: false },
                  { name: "client-tutorial/", open: false },
                ].map((f, i) => {
                  const tag = f.open ? ramp(frame, at(priv, "only the examples") + i * 4, 8) : ramp(frame, at(priv, "git ignores") + i * 5, 8);
                  return (
                    <div key={f.name} style={{ display: "flex", alignItems: "center", height: 74, paddingLeft: 40, borderTop: `1px solid ${c.line}` }}>
                      <div style={{ flex: 1 }}>{f.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: tag, font: `800 22px ${fonts.body}`, color: f.open ? c.accent : c.coral }}>
                        {!f.open && <Lock color={c.coral} />}
                        {f.open ? "public example" : "ignored by git"}
                      </div>
                    </div>
                  );
                })}
                <div style={{ color: c.muted, marginTop: 22, display: "flex", justifyContent: "space-between", opacity: ramp(frame, at(priv, "git ignores") + 20, 10) }}>
                  <span>out/</span>
                  <span style={{ font: `700 22px ${fonts.body}` }}>same rule for renders</span>
                </div>
              </div>
            </div>
          </AbsoluteFill>
        )}

        {/* 8 · start: the commands, then the repo address */}
        {shown(start) > 0 && (
          <AbsoluteFill style={{ opacity: visibleBetween(frame, start.from, start.from + start.durationInFrames + 30, 12) }}>
            <div style={{ ...darkCard, left: 260, top: 240, width: 1400, height: 420, ...enter(frame, fps, start.from + 6) }}>
              <WindowDots label="terminal" dark />
              <div style={{ padding: "30px 44px", font: `500 31px/1.95 ${fonts.mono}`, color: "#e7eaf3" }}>
                {[
                  { phrase: "clone the repo", text: "git clone https://github.com/theunisdk/video-studio" },
                  { phrase: "install it", text: "cd video-studio && pnpm install" },
                  { phrase: "add your ElevenLabs key", text: "export ELEVENLABS_API_KEY=…" },
                  { phrase: "Then just ask", text: "claude", prompt: "> Make a video about …" },
                ].map((l) => {
                  const t0 = at(start, l.phrase) - 6;
                  if (frame < t0) return null;
                  return (
                    <div key={l.text}>
                      <span style={{ color: "#6f7894" }}>$ </span>
                      {typed(l.text, frame, t0, 3)}
                      {l.prompt && frame > t0 + 14 && <span style={{ color: "#9d9dff" }}>{"   " + typed(l.prompt, frame, t0 + 14, 2.4)}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ position: "absolute", left: 0, right: 0, top: 712, display: "flex", justifyContent: "center", ...enter(frame, fps, at(start, "This video was made") - 4) }}>
              <div style={{ padding: "20px 38px", borderRadius: 18, background: "#ffffff", boxShadow: "0 18px 50px rgba(31,37,51,0.14)", font: `700 40px ${fonts.mono}`, color: c.ink }}>
                github.com/theunisdk/<span style={{ color: c.accent }}>video-studio</span>
              </div>
            </div>
          </AbsoluteFill>
        )}

        <StepTracker steps={["Ask", "Research", "Script", "Scenes", "Render"]} current={current < 0 ? 5 : current} x={683} y={872} color={c.accent} appear={trackerShown} />

        <Headline scene={intro} badge="▶" color={c.accent} />
        <Headline scene={ask} badge="1" color={c.accent} />
        <Headline scene={research} badge="2" color={c.accent} />
        <Headline scene={script} badge="3" color={c.accent} />
        <Headline scene={scenes} badge="4" color={c.accent} />
        <Headline scene={render} badge="5" color={c.accent} />
        <Headline scene={priv} badge="✓" color={c.coral} />
        <Headline scene={start} badge="→" color={c.accent} />

        <Captions timeline={timeline} />
        <NarrationAudio videoId={videoId} timeline={timeline} />
      </AbsoluteFill>
    </ThemeContext.Provider>
  );
};
