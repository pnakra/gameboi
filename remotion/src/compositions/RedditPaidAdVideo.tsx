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
loadInter("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });
import { theme } from "../theme";
import devAvatar from "../../public/images/friend-dev.jpg";

/**
 * RedditPaidAdVideo
 * 1080x1350 (4:5), 30fps, 450 frames = 15s.
 *
 * Built for Reddit Promoted Posts:
 *  - 4:5 = max mobile real estate without desktop letterbox
 *  - Hook is already in-progress at frame 0 (first text on screen, no warmup)
 *  - No end card / no URL screen — Reddit's CTA button handles the click.
 *    Last beat just holds on dev's vulnerable reply, lets it sit.
 *
 * Beats:
 *  0–45   (0–1.5s)  Cold open: first text already there, second text lands ~12f, third ~30f
 *  45–150 (1.5–5s)  Hand 1 deals → highlight bold card → play
 *  150–210(5–7s)    "You" + dev typing + dev joke reply
 *  210–315(7–10.5s) Hand 2 deals → highlight soft card → play
 *  315–390(10.5–13) "You" + dev typing + dev real reply
 *  390–450(13–15s)  Hold on the reply. No URL. Reddit CTA does the work.
 */

// 4:5 vertical canvas
const CANVAS_W = 1080;
const CANVAS_H = 1350;

// "Phone screen" inside the canvas
const SCREEN_W = 980;
const SCREEN_H = 1280;
const SCREEN_X = (CANVAS_W - SCREEN_W) / 2;
const SCREEN_Y = (CANVAS_H - SCREEN_H) / 2;

const T = {
  HAND1_DEAL: 45,
  HAND1_HIGHLIGHT: 90,
  HAND1_PLAY: 110,
  YOU1: 135,
  TYPING1_START: 150,
  DEV_REPLY1: 180,

  HAND2_DEAL: 215,
  HAND2_HIGHLIGHT: 260,
  HAND2_PLAY: 280,
  YOU2: 305,
  TYPING2_START: 320,
  DEV_REPLY2: 355,

  // No END_CARD — final beat is the reply holding on screen
};

const DEV_MSGS = [
  // First text already visible at frame 0 (negative enterFrame so spring is settled)
  { text: "ok third date with riley tmrw", at: -10 },
  { text: "she just texted 'my place this time? i'll cook'", at: 6 },
  { text: "i think she means more than dinner?? idk how to even reply to that", at: 22 },
];

const HAND1 = [
  { vibe: "chill", label: "just say yes to dinner, see what happens" },
  { vibe: "bold", label: "ask her what she actually has in mind" },
  { vibe: "soft", label: "what are you hoping it means" },
];
const PICK1 = 1;
const PICK1_LABEL = HAND1[PICK1].label;
const DEV_REPLY1_TEXT = "wait i can just... ask her? lol";

const HAND2 = [
  { vibe: "chaos", label: "reply 'i'll bring dessert' and log off" },
  { vibe: "direct", label: "tell her what you're hoping for too" },
  { vibe: "soft", label: "what would feel honest to send right now" },
];
const PICK2 = 2;
const PICK2_LABEL = HAND2[PICK2].label;
const DEV_REPLY2_TEXT = "ok yeah. honest is scarier but better";

export const RedditPaidAdVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#0a0712", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 45%, #1a1226 0%, #0a0712 80%)",
        }}
      />
      <PhoneRecording />
    </AbsoluteFill>
  );
};

/* ---------------- Phone screen recording ---------------- */

const PhoneRecording: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        left: SCREEN_X,
        top: SCREEN_Y,
        width: SCREEN_W,
        height: SCREEN_H,
        background: theme.bg,
        borderRadius: 36,
        overflow: "hidden",
        boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <PhoneStatusBar />
      <ConvoHeader />
      <ThreadAndCards />
    </div>
  );
};

const PhoneStatusBar: React.FC = () => (
  <div
    style={{
      height: 44,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 32px",
      color: theme.text,
      fontSize: 18,
      fontWeight: 600,
      flexShrink: 0,
      opacity: 0.85,
    }}
  >
    <span>9:41</span>
    <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span style={{ width: 18, height: 12, background: theme.text, borderRadius: 2, opacity: 0.85 }} />
      <span style={{ width: 28, height: 14, border: `1.5px solid ${theme.text}`, borderRadius: 4, opacity: 0.85 }} />
    </span>
  </div>
);

const ConvoHeader: React.FC = () => {
  const frame = useCurrentFrame();
  // Round counter shifts after first card play
  const round = frame >= T.HAND2_PLAY ? 2 : 1;
  return (
    <div
      style={{
        padding: "8px 20px 14px",
        borderBottom: `1px solid ${theme.border}`,
        display: "flex",
        alignItems: "center",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div style={{ color: theme.accent, fontSize: 36, lineHeight: 1, width: 36 }}>‹</div>
      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 999,
            overflow: "hidden",
            boxShadow: `0 0 0 2px ${theme.primary}`,
          }}
        >
          <img src={devAvatar} alt="dev" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div style={{ fontSize: 16, color: theme.text }}>dev</div>
      </div>
      <div
        style={{
          marginLeft: "auto",
          fontSize: 14,
          letterSpacing: 3,
          color: theme.textMuted,
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {round}/6
      </div>
    </div>
  );
};

const ThreadAndCards: React.FC = () => {
  const frame = useCurrentFrame();
  // Auto-scroll the thread upward as more bubbles appear so the active card hand stays in view
  const scrollY = interpolate(
    frame,
    [T.HAND2_DEAL - 20, T.HAND2_DEAL + 20, T.DEV_REPLY2, T.DEV_REPLY2 + 20],
    [0, -80, -80, -180],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "12px 18px 0", overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", transform: `translateY(${scrollY}px)` }}>
        <div
          style={{
            textAlign: "center",
            color: theme.textMuted,
            fontSize: 13,
            fontWeight: 600,
            margin: "4px 0 10px",
            opacity: 0.7,
          }}
        >
          today 9:41
        </div>

        <div style={{ flexShrink: 0 }}>
          {DEV_MSGS.map((m, i) => (
            <ChatBubble key={`d1-${i}`} from="them" text={m.text} enterFrame={m.at} />
          ))}

          {frame >= T.YOU1 && <ChatBubble from="you" text={PICK1_LABEL} enterFrame={T.YOU1} />}

          {frame >= T.TYPING1_START && frame < T.DEV_REPLY1 && <TypingIndicator />}
          {frame >= T.DEV_REPLY1 && <ChatBubble from="them" text={DEV_REPLY1_TEXT} enterFrame={T.DEV_REPLY1} />}

          {frame >= T.YOU2 && <ChatBubble from="you" text={PICK2_LABEL} enterFrame={T.YOU2} />}
          {frame >= T.TYPING2_START && frame < T.DEV_REPLY2 && <TypingIndicator />}
          {frame >= T.DEV_REPLY2 && <ChatBubble from="them" text={DEV_REPLY2_TEXT} enterFrame={T.DEV_REPLY2} />}
        </div>

        {/* Card hand 1 */}
        {frame < T.HAND2_DEAL && (
          <div style={{ marginTop: "auto", paddingBottom: 30 }}>
            <CardHand
              cards={HAND1}
              pickIndex={PICK1}
              dealStart={T.HAND1_DEAL}
              highlightFrame={T.HAND1_HIGHLIGHT}
              playFrame={T.HAND1_PLAY}
            />
          </div>
        )}

        {/* Card hand 2 */}
        {frame >= T.HAND2_DEAL - 5 && (
          <div style={{ marginTop: "auto", paddingBottom: 30 }}>
            <CardHand
              cards={HAND2}
              pickIndex={PICK2}
              dealStart={T.HAND2_DEAL}
              highlightFrame={T.HAND2_HIGHLIGHT}
              playFrame={T.HAND2_PLAY}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------------- Bubbles + typing ---------------- */

const ChatBubble: React.FC<{
  from: "them" | "you";
  text: string;
  enterFrame: number;
}> = ({ from, text, enterFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - enterFrame;
  if (local < 0) return null;
  const pop = spring({ frame: local, fps, config: { damping: 14, stiffness: 240 } });
  const opacity = interpolate(local, [0, 5], [0, 1], { extrapolateRight: "clamp" });
  const ty = interpolate(pop, [0, 1], [10, 0]);
  const scale = interpolate(pop, [0, 1], [0.88, 1]);
  const isYou = from === "you";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isYou ? "flex-end" : "flex-start",
        margin: "5px 0",
      }}
    >
      <div
        style={{
          background: isYou ? theme.bubbleYou : theme.bubbleThem,
          color: isYou ? "#fff" : theme.text,
          padding: "12px 20px",
          borderRadius: 26,
          maxWidth: "76%",
          fontSize: 22,
          lineHeight: 1.32,
          opacity,
          transform: `translateY(${ty}px) scale(${scale})`,
          transformOrigin: isYou ? "bottom right" : "bottom left",
          borderBottomRightRadius: isYou ? 8 : 26,
          borderBottomLeftRadius: !isYou ? 8 : 26,
          boxShadow: isYou
            ? "0 4px 16px -4px rgba(85, 96, 232, 0.5)"
            : "0 4px 12px -4px rgba(0,0,0,0.4)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

const TypingIndicator: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", margin: "5px 0" }}>
      <div
        style={{
          background: theme.bubbleThem,
          padding: "14px 20px",
          borderRadius: 26,
          borderBottomLeftRadius: 8,
          display: "flex",
          gap: 7,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => {
          const t = (frame / fps) * 1.6 + i * 0.18;
          const y = Math.sin(t * Math.PI * 2) * 4;
          const op = 0.4 + (Math.sin(t * Math.PI * 2) + 1) * 0.3;
          return (
            <span
              key={i}
              style={{
                width: 11,
                height: 11,
                borderRadius: 999,
                background: theme.text,
                opacity: op,
                transform: `translateY(${y}px)`,
                display: "inline-block",
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

/* ---------------- Card hand ---------------- */

type CardSpec = { vibe: string; label: string };
const CARD_W = 200;
const CARD_H = 270;

const vibeColor: Record<string, string> = {
  chill: theme.cardChill,
  bold: theme.cardBold,
  soft: theme.cardSoft,
  chaos: theme.cardChaos,
  direct: theme.cardDirect,
};

const CardHand: React.FC<{
  cards: CardSpec[];
  pickIndex: number;
  dealStart: number;
  highlightFrame: number;
  playFrame: number;
}> = ({ cards, pickIndex, dealStart, highlightFrame, playFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ position: "relative", height: CARD_H + 50, width: "100%" }}>
      {cards.map((card, i) => {
        const dealLocal = frame - (dealStart + i * 5);
        const dealSpring = spring({
          frame: dealLocal,
          fps,
          config: { damping: 16, stiffness: 180 },
        });
        const dealOp = interpolate(dealLocal, [0, 8], [0, 1], { extrapolateRight: "clamp" });
        const dealY = interpolate(dealSpring, [0, 1], [160, 0]);
        const dealRot = interpolate(dealSpring, [0, 1], [-22, 0]);

        const isPick = i === pickIndex;
        const center = (cards.length - 1) / 2;
        const offset = i - center;
        const baseX = offset * 150;
        const baseY = Math.abs(offset) * 18;
        const baseRot = offset * 9;

        const hlLocal = frame - highlightFrame;
        const hlSpring = spring({
          frame: hlLocal,
          fps,
          config: { damping: 18, stiffness: 200 },
        });
        const hlLift = isPick ? interpolate(hlSpring, [0, 1], [0, -40]) : 0;
        const hlScale = isPick ? interpolate(hlSpring, [0, 1], [1, 1.08]) : 1;
        const hlRotCorrect = isPick ? interpolate(hlSpring, [0, 1], [0, -baseRot]) : 0;

        let playY = 0;
        let playOp = 1;
        let playScale = 1;
        if (frame >= playFrame) {
          const pl = frame - playFrame;
          if (isPick) {
            const ps = spring({ frame: pl, fps, config: { damping: 18, stiffness: 130 } });
            playY = interpolate(ps, [0, 1], [0, -500]);
            playOp = interpolate(pl, [0, 12, 18], [1, 1, 0], { extrapolateRight: "clamp" });
            playScale = interpolate(ps, [0, 1], [1, 0.6]);
          } else {
            playOp = interpolate(pl, [0, 8], [1, 0], { extrapolateRight: "clamp" });
          }
        }

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              bottom: 0,
              width: CARD_W,
              height: CARD_H,
              marginLeft: -CARD_W / 2,
              transform: `translate(${baseX}px, ${baseY + dealY + hlLift + playY}px) rotate(${
                baseRot + dealRot + hlRotCorrect
              }deg) scale(${hlScale * playScale})`,
              opacity: dealOp * playOp,
              transformOrigin: "bottom center",
              borderRadius: 20,
              padding: 18,
              background: `linear-gradient(160deg, ${vibeColor[card.vibe]} 0%, ${vibeColor[card.vibe]}cc 100%)`,
              color: "#0f0a18",
              fontWeight: 700,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              boxShadow:
                isPick && frame >= highlightFrame && frame < playFrame
                  ? `0 18px 36px -8px ${vibeColor[card.vibe]}aa, 0 0 0 2px rgba(255,255,255,0.5)`
                  : "0 12px 24px -8px rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.25)",
              zIndex: isPick ? 5 : 1,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 2.5,
                textTransform: "uppercase",
                opacity: 0.75,
              }}
            >
              {card.vibe}
            </div>
            <div style={{ fontSize: 17, lineHeight: 1.25 }}>{card.label}</div>
          </div>
        );
      })}
    </div>
  );
};
