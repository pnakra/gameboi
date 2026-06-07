import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

/**
 * 1080x1920, 30fps, 360 frames = 12s.
 *
 * BOYS GROUPCHAT AD
 * Beats:
 *  0–90  (0–3s): boys groupchat, one drops the after-the-fact scenario
 *  90–150 (3–5s): whip-pan transition → cards fan in
 *  150–210 (5–7s): animated cursor hovers, picks a card, "sends" it
 *  210–300 (7–10s): mid-review ito moment slides up
 *  300–360 (10–12s): hard cut → gameboi.online end card
 */

const BG = "#0b0710";
const CHAT_BG = "#000000";
const INK = "#f5f0fa";
const MUTED = "rgba(245,240,250,0.55)";
const BUBBLE_THEM = "#2a2a2c";
const BUBBLE_YOU = "#0a84ff";
const AMBER = "#ffb24a";
const CYAN = "#37d6e0";
const MAGENTA = "#ff3aa3";
const GREEN = "#5cd9a8";

/* ---------- Beat 1: Boys chat ---------- */
type Msg = {
  from: string;
  text: string;
  appearAt: number;
  color: string;
  side: "left" | "right";
};

const MSGS: Msg[] = [
  { from: "marcus", text: "bro", appearAt: 4, color: "#7fd3a8", side: "left" },
  { from: "marcus", text: "i think i fucked up", appearAt: 14, color: "#7fd3a8", side: "left" },
  { from: "you", text: "what happened", appearAt: 26, color: BUBBLE_YOU, side: "right" },
  { from: "marcus", text: "remember sarah from saturday", appearAt: 38, color: "#7fd3a8", side: "left" },
  { from: "dev", text: "uh oh", appearAt: 50, color: "#ffb27f", side: "left" },
  { from: "marcus", text: "she just texted \"we need to talk\"", appearAt: 60, color: "#7fd3a8", side: "left" },
  { from: "marcus", text: "what do i even say back", appearAt: 76, color: "#7fd3a8", side: "left" },
];

const ChatHeader: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 0, left: 0, right: 0,
      paddingTop: 60,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 10,
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      paddingBottom: 22,
      background: CHAT_BG,
    }}
  >
    <div style={{ display: "flex", marginBottom: 2 }}>
      {["#7fd3a8", "#ffb27f", "#9ab5ff"].map((c, i) => (
        <div
          key={i}
          style={{
            width: 64, height: 64, borderRadius: 999,
            background: c,
            marginLeft: i === 0 ? 0 : -18,
            border: `3px solid ${CHAT_BG}`,
          }}
        />
      ))}
    </div>
    <div style={{ color: INK, fontSize: 34, fontWeight: 600 }}>the boys</div>
    <div style={{ color: MUTED, fontSize: 22 }}>marcus, dev, you</div>
  </div>
);

const ChatBubble: React.FC<{ msg: Msg; shakeStart?: number }> = ({ msg, shakeStart }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - msg.appearAt;
  if (local < -2) return <div style={{ height: 0 }} />;
  const s = spring({ frame: local, fps, config: { damping: 14, stiffness: 220 } });
  const op = interpolate(local, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(s, [0, 1], [22, 0]);

  const isPivot = msg === MSGS[MSGS.length - 1];
  const pulse = isPivot
    ? interpolate(frame, [76, 88, 105], [0, 1, 1], { extrapolateRight: "clamp" })
    : 0;

  // tiny shake when scenario drops
  let shakeX = 0;
  if (shakeStart != null && frame > shakeStart && frame < shakeStart + 18) {
    shakeX = Math.sin((frame - shakeStart) * 2.2) * 6 * (1 - (frame - shakeStart) / 18);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: msg.side === "right" ? "flex-end" : "flex-start",
        opacity: op,
        transform: `translate(${shakeX}px, ${y}px)`,
      }}
    >
      {msg.side === "left" && (
        <div style={{
          color: msg.color, fontSize: 18, fontWeight: 600,
          marginLeft: 18, marginBottom: 4, textTransform: "lowercase",
        }}>{msg.from}</div>
      )}
      <div style={{
        maxWidth: "80%",
        background: msg.side === "right" ? BUBBLE_YOU : BUBBLE_THEM,
        color: INK,
        padding: "16px 24px",
        borderRadius: 30,
        borderBottomLeftRadius: msg.side === "left" ? 8 : 30,
        borderBottomRightRadius: msg.side === "right" ? 8 : 30,
        fontSize: 34,
        lineHeight: 1.28,
        boxShadow: isPivot ? `0 0 ${50 * pulse}px ${AMBER}` : "none",
        outline: isPivot && pulse > 0 ? `2px solid ${AMBER}` : "none",
      }}>
        {msg.text}
      </div>
    </div>
  );
};

const BoysChatScene: React.FC = () => {
  const frame = useCurrentFrame();
  // Camera-like push-in
  const scale = interpolate(frame, [0, 90], [1.02, 1.06], { easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ background: CHAT_BG, transform: `scale(${scale})` }}>
      <ChatHeader />
      <div style={{
        position: "absolute",
        top: 320, left: 0, right: 0, bottom: 80,
        padding: "0 36px",
        display: "flex", flexDirection: "column",
        justifyContent: "flex-end", gap: 14,
        overflow: "hidden",
      }}>
        {MSGS.map((m, i) => (
          <ChatBubble key={i} msg={m} shakeStart={m === MSGS[5] ? 60 : undefined} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Whip-pan transition ---------- */
const WhipPan: React.FC = () => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, 20], [0, -1400], { easing: Easing.in(Easing.cubic) });
  const blur = interpolate(frame, [0, 10, 20], [0, 18, 0]);
  return (
    <AbsoluteFill style={{
      transform: `translateX(${x}px)`,
      filter: `blur(${blur}px)`,
      background: "linear-gradient(120deg, #1a0f24, #2a1845)",
    }} />
  );
};

/* ---------- Beat 2: Cards fan in ---------- */
const CARDS = [
  { label: "\"hey, can we talk in person?\"", color: CYAN, archetype: "honest" },
  { label: "\"sure, i'm free tonight\"", color: GREEN, archetype: "chill" },
  { label: "\"...about what?\"", color: MAGENTA, archetype: "deflect" },
];

const CardsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: BG, padding: "0 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{
        color: MUTED, fontSize: 26, letterSpacing: 4, textTransform: "uppercase",
        textAlign: "center", marginBottom: 40, fontWeight: 600,
      }}>
        you pick.
      </div>
      <div style={{ display: "flex", gap: 18, justifyContent: "center" }}>
        {CARDS.map((c, i) => {
          const s = spring({ frame: frame - i * 5, fps, config: { damping: 12, stiffness: 180 } });
          const y = interpolate(s, [0, 1], [400, 0]);
          const rot = interpolate(s, [0, 1], [(i - 1) * 18, (i - 1) * 6]);
          const op = interpolate(frame - i * 5, [0, 12], [0, 1], { extrapolateRight: "clamp" });
          // Selected card highlight at end
          const isSelected = i === 0;
          const selectFlash = isSelected
            ? interpolate(frame, [42, 50, 60], [0, 1, 1], { extrapolateRight: "clamp" })
            : 0;
          const lift = isSelected ? interpolate(frame, [42, 55], [0, -30], { extrapolateRight: "clamp" }) : 0;
          return (
            <div key={i} style={{
              width: 280, height: 400,
              borderRadius: 28,
              background: `linear-gradient(160deg, ${c.color}, ${c.color}cc)`,
              color: "#0b0710",
              padding: 24,
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              transform: `translateY(${y + lift}px) rotate(${rot}deg)`,
              opacity: op,
              boxShadow: `0 30px 80px -20px ${c.color}99, 0 0 ${40 * selectFlash}px ${c.color}, inset 0 0 0 2px rgba(255,255,255,0.12)`,
              outline: selectFlash > 0 ? `3px solid ${INK}` : "none",
            }}>
              <div style={{ fontSize: 16, opacity: 0.6, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>
                {c.archetype}
              </div>
              <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.2, letterSpacing: -0.4 }}>
                {c.label}
              </div>
            </div>
          );
        })}
      </div>
      {/* Animated cursor */}
      <AnimatedCursor />
    </AbsoluteFill>
  );
};

const AnimatedCursor: React.FC = () => {
  const frame = useCurrentFrame();
  // Cursor enters from bottom-right, moves toward the leftmost (selected) card, taps it
  if (frame < 18) return null;
  const t = frame - 18;
  const cx = interpolate(t, [0, 22, 30, 42], [820, 220, 220, 220], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp" });
  const cy = interpolate(t, [0, 22, 30, 42], [1700, 1050, 1050, 1050], { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp" });
  const tap = interpolate(t, [24, 30, 36], [1, 0.78, 1], { extrapolateRight: "clamp" });
  // Tap ripple
  const rippleT = t - 26;
  const ripple = rippleT > 0 ? interpolate(rippleT, [0, 20], [0, 220], { extrapolateRight: "clamp" }) : 0;
  const rippleOp = rippleT > 0 ? interpolate(rippleT, [0, 20], [0.7, 0], { extrapolateRight: "clamp" }) : 0;
  return (
    <>
      {ripple > 0 && (
        <div style={{
          position: "absolute", left: cx - ripple / 2, top: cy - ripple / 2,
          width: ripple, height: ripple, borderRadius: 999,
          border: `4px solid ${INK}`, opacity: rippleOp, pointerEvents: "none",
        }} />
      )}
      <div style={{
        position: "absolute", left: cx, top: cy,
        transform: `scale(${tap})`, transformOrigin: "top left",
        pointerEvents: "none", filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.6))",
      }}>
        <svg width="48" height="58" viewBox="0 0 24 28" fill="none">
          <path d="M2 2 L2 22 L7 18 L10.5 26 L13.5 25 L10 17 L17 17 Z"
            fill={INK} stroke="#000" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
    </>
  );
};

/* ---------- Beat 3: Sent message + Mid-review ito ---------- */
const MidReviewScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // First the chosen response flies up into a chat bubble (0-24)
  const bubbleS = spring({ frame, fps, config: { damping: 16, stiffness: 200 } });
  const bubbleY = interpolate(bubbleS, [0, 1], [600, 200]);
  const bubbleOp = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  // Then ito panel slides up (25-90)
  const itoLocal = frame - 28;
  const itoS = spring({ frame: itoLocal, fps, config: { damping: 18, stiffness: 130 } });
  const itoY = interpolate(itoS, [0, 1], [1200, 0]);
  const itoOp = interpolate(itoLocal, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: CHAT_BG }}>
      {/* Sent bubble */}
      <div style={{
        position: "absolute", top: bubbleY, right: 60,
        opacity: bubbleOp,
        maxWidth: 720,
        background: BUBBLE_YOU, color: INK,
        padding: "20px 28px", borderRadius: 34, borderBottomRightRadius: 10,
        fontSize: 38, fontWeight: 500, lineHeight: 1.25,
        boxShadow: "0 20px 50px -20px rgba(10,132,255,0.7)",
      }}>
        hey, can we talk in person?
      </div>

      {/* Mid-review ito panel */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        transform: `translateY(${itoY}px)`,
        opacity: itoOp,
        background: "linear-gradient(180deg, #1a0f24 0%, #2a1845 100%)",
        borderTopLeftRadius: 48, borderTopRightRadius: 48,
        padding: "56px 56px 80px",
        minHeight: 1100,
        boxShadow: "0 -40px 100px -20px rgba(0,0,0,0.6)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          color: AMBER, fontSize: 22, letterSpacing: 4, textTransform: "uppercase",
          fontWeight: 700, marginBottom: 28,
        }}>
          <div style={{ width: 14, height: 14, borderRadius: 999, background: AMBER, boxShadow: `0 0 20px ${AMBER}` }} />
          ito · mid-review
        </div>
        <div style={{
          color: INK, fontSize: 52, fontWeight: 600, lineHeight: 1.2, letterSpacing: -1,
          marginBottom: 36,
        }}>
          you gave her a way to be heard without an audience.
        </div>
        <div style={{
          color: MUTED, fontSize: 32, lineHeight: 1.45, fontWeight: 400,
        }}>
          saturday probably felt blurry for her too. asking to talk in person —
          not in a groupchat, not over text — says you take it seriously.
        </div>

        {/* meter */}
        <div style={{ marginTop: 56 }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            color: MUTED, fontSize: 20, letterSpacing: 3, textTransform: "uppercase",
            marginBottom: 14, fontWeight: 600,
          }}>
            <span>care</span><span>+3</span>
          </div>
          <div style={{ height: 14, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${interpolate(frame, [50, 85], [0, 78], { extrapolateRight: "clamp" })}%`,
              background: `linear-gradient(90deg, ${GREEN}, ${AMBER})`,
              borderRadius: 999,
            }} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Beat 4: end card ---------- */
const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 22, stiffness: 130 } });
  const y = interpolate(s, [0, 1], [40, 0]);
  const op = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const lineOp = interpolate(frame, [18, 32], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{
      background: BG,
      display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center",
      padding: "0 60px", textAlign: "center",
    }}>
      <div style={{
        opacity: op, transform: `translateY(${y}px)`,
        color: INK, fontSize: 130, fontWeight: 700,
        letterSpacing: -5, lineHeight: 1,
      }}>
        gameboi
        <span style={{ color: AMBER }}>.online</span>
      </div>
      <div style={{
        opacity: lineOp, marginTop: 36,
        color: MUTED, fontSize: 32, fontWeight: 500, letterSpacing: -0.3,
      }}>
        a game about the texts you actually send.
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Flash cut helper ---------- */
const FlashCut: React.FC = () => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 2, 6], [0, 1, 0], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: "#fff", opacity: op, pointerEvents: "none" }} />;
};

/* ===== Main ===== */
export const BoysChatAd: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: "Inter, -apple-system, system-ui, sans-serif" }}>
      <Sequence from={0} durationInFrames={95}>
        <BoysChatScene />
      </Sequence>

      <Sequence from={88} durationInFrames={22}>
        <WhipPan />
      </Sequence>

      <Sequence from={105} durationInFrames={95}>
        <CardsScene />
      </Sequence>

      <Sequence from={198} durationInFrames={6}>
        <FlashCut />
      </Sequence>

      <Sequence from={200} durationInFrames={98}>
        <MidReviewScene />
      </Sequence>

      <Sequence from={298} durationInFrames={62}>
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};
