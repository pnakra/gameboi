import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
loadInter("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] });
loadSpaceGrotesk("normal", { weights: ["700"], subsets: ["latin"] });
import { BrandBackdrop } from "../components/BrandBackdrop";
import { PhoneFrame } from "../components/PhoneFrame";
import { Bubble, TypingBubble } from "../components/Bubble";
import { CardFan, type CardData } from "../components/CardFan";
import { theme } from "../theme";
import devAvatar from "../../public/images/friend-dev.jpg";
import marcusAvatar from "../../public/images/friend-marcus.jpg";
import jordanAvatar from "../../public/images/friend-jordan.jpg";
import theoAvatar from "../../public/images/friend-theo.jpg";

const PHONE_W = 540;
const PHONE_H = 1100;

// Scene timing (frames at 30fps). Total = 600 frames = 20s.
const T = {
  TITLE: { start: 0, end: 75 }, // 0-2.5s — brand hook
  SELECT: { start: 75, end: 180 }, // 2.5-6s — friend select
  CHAT: { start: 180, end: 480 }, // 6-16s — chat + cards
  RECAP: { start: 480, end: 555 }, // 16-18.5s — end card
  HANDOFF: { start: 555, end: 600 }, // 18.5-20s — isthisok handoff
};

export const DemoVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  return (
    <AbsoluteFill style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <BrandBackdrop progress={progress} />

      <Sequence from={T.TITLE.start} durationInFrames={T.TITLE.end - T.TITLE.start}>
        <TitleScene />
      </Sequence>

      <Sequence from={T.SELECT.start} durationInFrames={T.SELECT.end - T.SELECT.start}>
        <PhoneStage label="pick a friend">
          <FriendSelectInner />
        </PhoneStage>
      </Sequence>

      <Sequence from={T.CHAT.start} durationInFrames={T.CHAT.end - T.CHAT.start}>
        <PhoneStage label="play your move">
          <ChatInner />
        </PhoneStage>
      </Sequence>

      <Sequence from={T.RECAP.start} durationInFrames={T.RECAP.end - T.RECAP.start}>
        <PhoneStage label="recap your call">
          <RecapInner />
        </PhoneStage>
      </Sequence>

      <Sequence from={T.HANDOFF.start} durationInFrames={T.HANDOFF.end - T.HANDOFF.start}>
        <HandoffScene />
      </Sequence>
    </AbsoluteFill>
  );
};

/* ---------- Title hook ---------- */

const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inSpring = spring({ frame, fps, config: { damping: 18, stiffness: 100 } });
  const opacity = interpolate(frame, [0, 12, 60, 75], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const y = interpolate(inSpring, [0, 1], [40, 0]);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ opacity, transform: `translateY(${y}px)`, textAlign: "center" }}>
        <div
          style={{
            fontFamily: "Space Grotesk, system-ui, sans-serif",
            fontSize: 220,
            fontWeight: 700,
            color: theme.text,
            letterSpacing: -8,
            lineHeight: 1,
            textShadow: `0 0 60px ${theme.primaryGlow}`,
          }}
        >
          gameboi
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 36,
            color: theme.textMuted,
            letterSpacing: -0.5,
          }}
        >
          your friend just texted. play your move.
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Phone stage shared by all in-app scenes ---------- */

const PhoneStage: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // Each phone scene: phone slides up from bottom, settles
  const inS = spring({ frame, fps, config: { damping: 20, stiffness: 80 } });
  const y = interpolate(inS, [0, 1], [80, 0]);
  const opacity = interpolate(frame, [0, 10, durationInFrames - 10, durationInFrames], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });
  // Caption — soft fade
  const captionOp = interpolate(
    frame,
    [0, 14, durationInFrames - 14, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 100,
          transform: `translateY(${y}px)`,
        }}
      >
        {/* Caption to the left of the phone */}
        <div
          style={{
            opacity: captionOp,
            width: 600,
            textAlign: "right",
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: theme.textMuted,
              textTransform: "uppercase",
              letterSpacing: 6,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            step
          </div>
          <div
            style={{
              fontFamily: "Space Grotesk, system-ui, sans-serif",
              fontSize: 68,
              color: theme.text,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.05,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </div>
        </div>
        {children}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Friend select ---------- */

const FRIENDS = [
  { name: "Marcus", sketch: "talking to someone for two weeks. can't tell if it's a thing.", avatar: marcusAvatar, accent: theme.cardChill },
  { name: "Dev", sketch: "met someone at a party. she texted first.", avatar: devAvatar, accent: theme.cardBold },
  { name: "Jordan", sketch: "in a situationship for three months.", avatar: jordanAvatar, accent: theme.cardChaos },
  { name: "Theo", sketch: "something happened last night.", avatar: theoAvatar, accent: theme.cardSoft },
];

const FriendSelectInner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Highlight Dev (index 1) starting at frame 60 — looks like a "tap"
  const HIGHLIGHT = 1;
  const tapFrame = 60;
  return (
    <PhoneFrame width={PHONE_W} height={PHONE_H}>
      <div style={{ padding: "24px 22px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontFamily: "Space Grotesk, system-ui, sans-serif",
            fontSize: 38,
            color: theme.text,
            fontWeight: 700,
            letterSpacing: -1,
            marginBottom: 4,
          }}
        >
          who's texting?
        </div>
        <div style={{ fontSize: 16, color: theme.textMuted, marginBottom: 24 }}>
          pick a friend & step into their group chat
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
          {FRIENDS.map((f, i) => {
            const enter = spring({
              frame: frame - i * 4,
              fps,
              config: { damping: 16, stiffness: 140 },
            });
            const op = interpolate(enter, [0, 1], [0, 1]);
            const ty = interpolate(enter, [0, 1], [24, 0]);

            const isHigh = i === HIGHLIGHT;
            const tapLocal = frame - tapFrame;
            const tapBoost = isHigh && tapLocal > 0
              ? interpolate(tapLocal, [0, 8, 16], [0, 1, 0.4], { extrapolateRight: "clamp" })
              : 0;
            const scale = 1 + tapBoost * 0.04;

            return (
              <div
                key={f.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: 14,
                  borderRadius: 22,
                  background: theme.surface,
                  border: `1.5px solid ${isHigh && tapBoost > 0 ? f.accent : theme.border}`,
                  boxShadow: isHigh && tapBoost > 0 ? `0 0 30px -6px ${f.accent}99` : "none",
                  opacity: op,
                  transform: `translateY(${ty}px) scale(${scale})`,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 999,
                    overflow: "hidden",
                    border: `2px solid ${f.accent}`,
                    flexShrink: 0,
                  }}
                >
                  <img src={f.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: theme.text, marginBottom: 2 }}>
                    {f.name}
                  </div>
                  <div style={{ fontSize: 14, color: theme.textMuted, lineHeight: 1.3 }}>
                    {f.sketch}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PhoneFrame>
  );
};

/* ---------- Chat scene with cards ---------- */

type Beat =
  | { kind: "them"; text: string; at: number }
  | { kind: "you"; text: string; at: number }
  | { kind: "typing"; from: number; to: number };

const CHAT_BEATS: Beat[] = [
  { kind: "typing", from: 0, to: 28 },
  { kind: "them", text: "ok so riley just texted me 😭", at: 28 },
  { kind: "them", text: "she's like 'wanna come over later'", at: 60 },
  { kind: "them", text: "i don't even know what i want bro", at: 95 },
  // Cards deal at ~125, pick at 175, your reply lands ~185
  { kind: "you", text: "what would 'going over' actually mean rn", at: 195 },
  { kind: "typing", from: 220, to: 250 },
  { kind: "them", text: "fr that's the part i'm scared to think about", at: 250 },
  { kind: "them", text: "like is it a hookup thing or a hang thing", at: 280 },
];

const CARDS: CardData[] = [
  { vibe: "chill", label: "it's been 2 days, breathe" },
  { vibe: "bold", label: "what would 'going over' actually mean rn" },
  { vibe: "soft", label: "what do you actually want here" },
];

const ChatInner: React.FC = () => {
  const frame = useCurrentFrame();
  const SCENE_LEN = T.CHAT.end - T.CHAT.start;

  // Scroll the thread so newest bubbles stay visible.
  // Approximate: shift up after ~5 bubbles.
  const visibleThings = CHAT_BEATS.filter(
    (b) => b.kind !== "typing" && (b as { at: number }).at <= frame,
  ).length;
  const scrollY = Math.max(0, (visibleThings - 4) * 60);

  return (
    <PhoneFrame
      width={PHONE_W}
      height={PHONE_H}
      contactName="dev"
      avatar={devAvatar}
      exchange={Math.min(2, Math.floor(frame / 150) + 1)}
      total={6}
    >
      {/* Thread */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          padding: "12px 4px 4px",
          position: "relative",
        }}
      >
        <div
          style={{
            transform: `translateY(${-scrollY}px)`,
            transition: "transform 0.3s ease-out",
          }}
        >
          <div style={{ textAlign: "center", color: theme.textMuted, fontSize: 13, margin: "8px 0 16px", textTransform: "lowercase" }}>
            today 9:41 am
          </div>
          {CHAT_BEATS.map((beat, i) => {
            if (beat.kind === "typing") {
              return <TypingBubble key={i} enterFrame={beat.from} exitFrame={beat.to} />;
            }
            return <Bubble key={i} from={beat.kind} text={beat.text} enterFrame={beat.at} />;
          })}
        </div>
      </div>

      {/* Card hand area */}
      <div style={{ padding: "8px 12px 24px" }}>
        {/* Cards visible from ~125 until just after pick (~195). After that, fade in next set / continue button. */}
        {frame < 220 ? (
          <CardFan cards={CARDS} dealStart={125} highlightIndex={1} pickFrame={185} />
        ) : (
          <ContinueHint visibleFrom={220} sceneLen={SCENE_LEN} />
        )}
      </div>
    </PhoneFrame>
  );
};

const ContinueHint: React.FC<{ visibleFrom: number; sceneLen: number }> = ({ visibleFrom }) => {
  const frame = useCurrentFrame();
  const local = frame - visibleFrom;
  const opacity = interpolate(local, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        height: 280,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <div
        style={{
          background: theme.surface2,
          border: `1.5px solid ${theme.border}`,
          padding: "16px 22px",
          borderRadius: 18,
          color: theme.textMuted,
          fontSize: 16,
          textAlign: "center",
        }}
      >
        new cards coming...
      </div>
    </div>
  );
};

/* ---------- Recap card ---------- */

const RecapInner: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inS = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const op = interpolate(inS, [0, 1], [0, 1]);
  const y = interpolate(inS, [0, 1], [20, 0]);

  return (
    <PhoneFrame width={PHONE_W} height={PHONE_H}>
      <div
        style={{
          flex: 1,
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          opacity: op,
          transform: `translateY(${y}px)`,
        }}
      >
        <div
          style={{
            fontFamily: "Space Grotesk, system-ui, sans-serif",
            fontSize: 32,
            color: theme.text,
            fontWeight: 700,
            letterSpacing: -1,
          }}
        >
          your call
        </div>

        <div
          style={{
            background: theme.surface,
            border: `1.5px solid ${theme.border}`,
            borderRadius: 22,
            padding: 20,
          }}
        >
          <div
            style={{
              fontSize: 12,
              letterSpacing: 2,
              fontWeight: 800,
              color: theme.cardBold,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            the situation
          </div>
          <div style={{ fontSize: 17, lineHeight: 1.4, color: theme.text }}>
            dev's spiraling about whether riley wants a hookup or a hang. he asked you what to do.
          </div>
        </div>

        <div
          style={{
            background: theme.surface,
            border: `1.5px solid ${theme.border}`,
            borderRadius: 22,
            padding: 20,
          }}
        >
          <div
            style={{
              fontSize: 12,
              letterSpacing: 2,
              fontWeight: 800,
              color: theme.accent,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            what you did
          </div>
          <div style={{ fontSize: 17, lineHeight: 1.4, color: theme.text }}>
            you made him name what he actually wanted before saying yes. you slowed him down instead of egging him on.
          </div>
        </div>

        <div
          style={{
            background: `linear-gradient(135deg, ${theme.ito}33, transparent)`,
            border: `1.5px solid ${theme.ito}55`,
            borderRadius: 22,
            padding: 20,
          }}
        >
          <div
            style={{
              fontSize: 12,
              letterSpacing: 2,
              fontWeight: 800,
              color: theme.ito,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            in the wild
          </div>
          <div style={{ fontSize: 16, lineHeight: 1.4, color: theme.text }}>
            got your own situation? hand it to ito.
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
};

/* ---------- Handoff card ---------- */

const HandoffScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inS = spring({ frame, fps, config: { damping: 18, stiffness: 100 } });
  const opacity = interpolate(frame, [0, 10, 35, 45], [0, 1, 1, 1], { extrapolateRight: "clamp" });
  const y = interpolate(inS, [0, 1], [30, 0]);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity }}>
      <div style={{ textAlign: "center", transform: `translateY(${y}px)` }}>
        <div
          style={{
            fontSize: 28,
            color: theme.textMuted,
            marginBottom: 16,
            letterSpacing: 4,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          got your own situation?
        </div>
        <div
          style={{
            fontFamily: "Space Grotesk, system-ui, sans-serif",
            fontSize: 140,
            color: theme.ito,
            fontWeight: 700,
            letterSpacing: -4,
            textShadow: `0 0 50px ${theme.ito}66`,
          }}
        >
          gameboi.online
        </div>
      </div>
    </AbsoluteFill>
  );
};
