import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { narrationEndFrame, phraseFrame, sceneById, type Timeline } from "../../src/video/timeline";
import { pop, ramp, visibleBetween } from "../../src/kit/anim";
import { cameraAt, type CameraMove, type Vec3 } from "../../src/kit/camera";
import { Connector, Core, Orb, ServerBox, Starfield, connectorPoint } from "../../src/kit/objects";
import { Captions, Chip, Headline, Label, NarrationAudio, Phone } from "../../src/kit/overlay";
import { Stage } from "../../src/kit/Stage";
import { colors, fonts } from "../../src/kit/theme";

const PHONE: Vec3 = [-5.6, 0, 0];
const ORB: Vec3 = [5.6, 0, 0];
const CHAT_FROM: Vec3 = [-4.6, 0.3, 0];
const CHAT_TO: Vec3 = [-1.45, 0.3, 0];
const AI_FROM: Vec3 = [1.45, 0.3, 0];
const AI_TO: Vec3 = [4.3, 0.3, 0];

const PARTS = [
  { label: "OpenClaw", role: "the software", color: colors.claw },
  { label: "Hostinger", role: "the computer", color: colors.host },
  { label: "AI model", role: "the intelligence", color: colors.ai },
  { label: "Telegram / WhatsApp", role: "the conversation", color: colors.chat },
];

export const OpenClawVideo: React.FC<{ videoId: string; timeline: Timeline }> = ({ videoId, timeline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const intro = sceneById(timeline, "intro");
  const software = sceneById(timeline, "software");
  const computer = sceneById(timeline, "computer");
  const model = sceneById(timeline, "model");
  const chat = sceneById(timeline, "chat");
  const together = sceneById(timeline, "together");
  const at = (scene: typeof intro, phrase: string) => phraseFrame(scene, phrase, fps);

  const moves: CameraMove[] = [
    { at: 0, duration: 1, position: [0, 2.2, 18], target: [0, 0, 0], fov: 40 },
    { at: software.from - 10, duration: 45, position: [0, 0.2, 6.6], target: [0, -0.4, 0], fov: 40 },
    { at: computer.from, duration: 50, position: [1.8, 1.2, 11.5], target: [0, 0.3, 0], fov: 40 },
    { at: model.from, duration: 55, position: [3.1, 0.9, 12.4], target: [2.8, 0.3, 0], fov: 40 },
    { at: chat.from, duration: 60, position: [-3.1, 0.9, 12.4], target: [-2.8, 0.3, 0], fov: 40 },
    { at: together.from, duration: 55, position: [0, 1.2, 14.2], target: [0, 0.6, 0], fov: 40 },
  ];
  const camera = cameraAt(frame, moves);

  // Entrances
  const coreIn = pop(frame, fps, software.from + 8);
  const boxIn = ramp(frame, computer.from + 6, 34);
  const orbForm = ramp(frame, model.from + 8, 50);
  const aiLink = ramp(frame, at(model, "OpenClaw passes"), 26);
  const phoneIn = pop(frame, fps, chat.from + 12);
  const chatLink = ramp(frame, at(chat, "That's how you talk"), 26);

  // The round trip in the final scene
  const sent = at(together, "You send a message");
  const pickedUp = at(together, "OpenClaw picks it up");
  const asks = at(together, "asks the AI model");
  const reply = at(together, "and the reply");
  const toBox = ramp(frame, sent + 4, 26);
  const toAi = ramp(frame, asks - 4, 24);
  const backToBox = ramp(frame, reply - 6, 20);
  const backToPhone = ramp(frame, reply + 14, 22);
  const replyLanded = reply + 36;

  // Model demo packet: request leaves the box as the narration says "passes your request"
  const modelPacket = ramp(frame, at(model, "passes your request"), 28);

  const coreActivity = Math.max(
    ramp(frame, at(software, "It receives"), 20) * (1 - ramp(frame, software.from + software.durationInFrames - 20, 20)),
    visibleBetween(frame, pickedUp - 6, reply + 30, 14),
  );
  const orbActivity = Math.max(
    visibleBetween(frame, at(model, "which works out"), model.from + model.durationInFrames, 16),
    visibleBetween(frame, asks + 18, reply + 6, 10),
  );

  const status =
    frame >= replyLanded ? "> reply sent"
    : frame >= reply + 14 ? "> sending the reply"
    : frame >= asks ? "> asking the AI model"
    : frame >= pickedUp ? "> message received"
    : frame >= at(software, "and sends the replies") && frame < software.from + software.durationInFrames ? "> reply sent"
    : frame >= at(software, "works out what to do") && frame < software.from + software.durationInFrames ? "> working out what to do"
    : frame >= at(software, "It receives") && frame < software.from + software.durationInFrames ? "> message received"
    : "> waiting for messages";

  const outroStart = narrationEndFrame(together, fps) + 8;
  const coreLabelIn = ramp(frame, software.from + 20, 16);

  const world = (
    <>
      <ambientLight intensity={0.35} />
      <pointLight position={[4, 5, 6]} intensity={60} />
      <Starfield />
      <Core color={colors.claw} appear={coreIn} activity={coreActivity} />
      <ServerBox color={colors.host} ledColor={colors.ok} appear={boxIn} />
      <Orb color={colors.ai} form={orbForm} activity={orbActivity} position={ORB} />
      <Connector
        from={AI_FROM}
        to={AI_TO}
        color={colors.ai}
        progress={aiLink}
        packets={[
          { t: frame < together.from ? modelPacket : toAi, color: colors.claw },
          { t: 1 - backToBox, color: colors.ai },
        ]}
      />
      <Connector
        from={CHAT_FROM}
        to={CHAT_TO}
        color={colors.chat}
        progress={chatLink}
        packets={[
          { t: toBox, color: colors.chat },
          { t: 1 - backToPhone, color: colors.ai },
        ]}
      />
    </>
  );

  const overlay = (
    <>
      {/* Title card */}
      {visibleBetween(frame, 0, intro.from + intro.durationInFrames, 16) > 0 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: visibleBetween(frame, 0, intro.from + intro.durationInFrames, 16) }}>
          <div style={{ font: `700 22px ${fonts.display}`, letterSpacing: "0.2em", color: colors.muted, textTransform: "uppercase", opacity: ramp(frame, 4, 14) }}>
            A one-minute explainer
          </div>
          <div style={{ font: `700 104px ${fonts.display}`, color: colors.fg, marginTop: 18, opacity: ramp(frame, 8, 18), transform: `translateY(${(1 - ramp(frame, 8, 18)) * 30}px)` }}>
            How OpenClaw works
          </div>
          <div style={{ display: "flex", gap: 22, marginTop: 64 }}>
            {PARTS.map((p, i) => (
              <Chip key={p.label} label={p.label} color={p.color} index={i + 1} appear={pop(frame, fps, at(intro, "It's four parts") + i * 7)} />
            ))}
          </div>
        </AbsoluteFill>
      )}

      <Headline scene={software} badge="1" color={colors.claw} />
      <Headline scene={computer} badge="2" color={colors.host} />
      <Headline scene={model} badge="3" color={colors.ai} />
      <Headline scene={chat} badge="4" color={colors.chat} />
      <Headline scene={together} badge="✓" color={colors.ok} />

      <Label
        at={[0, boxIn > 0.5 ? -0.72 : -1.45, 0]}
        title="OpenClaw"
        sub={boxIn > 0.5 ? undefined : "runs your assistant"}
        mono={status}
        color={colors.fg}
        opacity={coreLabelIn}
        size={boxIn > 0.5 ? "sm" : "lg"}
      />
      <Label
        at={[0, -1.75, 0]}
        title="Hostinger"
        sub="a computer in the cloud · on 24/7"
        mono={frame >= at(computer, "even when your laptop") ? "● laptop closed, still running" : undefined}
        monoColor={colors.ok}
        opacity={ramp(frame, computer.from + 30, 16)}
      />
      <Label
        at={[ORB[0], -2.0, 0]}
        title="AI model"
        sub={frame >= at(model, "like Claude") ? "Claude · GPT · Gemini" : " "}
        opacity={ramp(frame, model.from + 30, 16)}
      />
      <Label at={[...connectorPoint(AI_FROM, AI_TO, 0.5)].map((v, i) => (i === 1 ? v + 0.25 : v)) as Vec3} sub="asks the AI" opacity={aiLink * 0.9} size="sm" />
      <Label at={[...connectorPoint(CHAT_FROM, CHAT_TO, 0.5)].map((v, i) => (i === 1 ? v + 0.25 : v)) as Vec3} sub="your messages" opacity={chatLink * 0.9} size="sm" />
      <Phone
        at={PHONE}
        heightUnits={3.9}
        color={colors.chat}
        appear={Math.min(1, phoneIn)}
        tabs={["Telegram", "WhatsApp"]}
        activeTab={frame >= at(chat, "WhatsApp. That's") && frame < together.from ? 1 : 0}
        messages={[
          { from: "me", text: "Remind me to send the invoice at 4pm", at: sent - 6 },
          { from: "bot", text: "Done. I'll remind you at 4pm.", at: replyLanded },
        ]}
        typingFrom={asks + 10}
        typingUntil={replyLanded}
      />
      <Label at={[PHONE[0], -2.3, 0]} title="Your chat app" opacity={ramp(frame, chat.from + 30, 16)} />

      {/* Recap after the last line */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, display: "flex", justifyContent: "center", gap: 18 }}>
        {PARTS.map((p, i) => (
          <Chip key={p.label} label={`${p.label} · ${p.role}`} color={p.color} appear={pop(frame, fps, outroStart + i * 5)} />
        ))}
      </div>

      <Captions timeline={timeline} />
    </>
  );

  return (
    <AbsoluteFill>
      <Stage camera={camera} world={world} overlay={overlay} />
      <NarrationAudio videoId={videoId} timeline={timeline} />
    </AbsoluteFill>
  );
};
