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
loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

/**
 * 1080x1920, 30fps, 360 frames = 12s.
 *
 * GROUP CHAT AD
 * - Beats 0-180  (6s): legible iMessage-style group chat builds up; last
 *                       message lands with weight.
 * - Beats 180-240 (2s): three cards at the bottom flip through ~10 options
 *                       very fast — energy / "what would you even say".
 * - Beats 240-300 (2s): hard pause. Cards freeze. Screen dims slightly.
 *                       "ever been in this groupchat?" fades up.
 * - Beats 300-360 (2s): "gameboi.online — the game where you pick."
 */

const BG = "#0b0710";
const CHAT_BG = "#000000";
const INK = "#f5f0fa";
const MUTED = "rgba(245,240,250,0.5)";
const BUBBLE_THEM = "#2a2a2c";
const BUBBLE_YOU = "#0a84ff"; // iMessage blue
const ACCENT_AMBER = "#ffb24a";

/* ---------- Chat data ---------- */
type Msg = {
  from: string;
  text: string;
  appearAt: number; // frame within chat sequence
  color: string;   // sender label color
  side: "left" | "right";
};

const MSGS: Msg[] = [
  { from: "maya", text: "ok update on last night 😭", appearAt: 8,  color: "#ff8db4", side: "left" },
  { from: "tyler", text: "oh no what did u do",          appearAt: 22, color: "#7fd3a8", side: "left" },
  { from: "maya", text: "i think i made it weird w james", appearAt: 36, color: "#ff8db4", side: "left" },
  { from: "you",  text: "weird how",                      appearAt: 52, color: BUBBLE_YOU,  side: "right" },
  { from: "maya", text: "he kissed me and i just kinda… froze", appearAt: 68, color: "#ff8db4", side: "left" },
  { from: "tyler", text: "lmaoooo",                       appearAt: 82, color: "#7fd3a8", side: "left" },
  { from: "sam",  text: "tyler shut up",                  appearAt: 92, color: "#9ab5ff",  side: "left" },
  { from: "maya", text: "i didn't say no but i didn't say yes", appearAt: 108, color: "#ff8db4", side: "left" },
  { from: "maya", text: "he just texted me \"you good?\"", appearAt: 128, color: "#ff8db4", side: "left" },
  { from: "maya", text: "what do i even say back",        appearAt: 148, color: "#ff8db4", side: "left" },
];

/* ---------- Card options that flip ---------- */
const CARD_OPTIONS = [
  "all good!",
  "honestly… not really",
  "can we talk in person",
  "i don't know what to say",
  "yeah i'm fine",
  "no actually",
  "i'm sorry i froze",
  "i needed a sec to think",
  "tonight?",
  "i'm not sure how i feel",
  "i wanted to say no",
  "let's talk tmrw",
];

/* ===== Main ===== */
export const GroupchatAd: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: "Inter, -apple-system, system-ui, sans-serif" }}>
      {/* Whole-video chat surface lives underneath so it's continuous */}
      <ChatSurface />

      {/* Beat 2: cards flip fast (180-240) */}
      <Sequence from={180} durationInFrames={60}>
        <CardDeck mode="flip" />
      </Sequence>

      {/* Beat 3: pause (240-300) */}
      <Sequence from={240} durationInFrames={60}>
        <CardDeck mode="frozen" />
        <PauseOverlay />
      </Sequence>

      {/* Beat 4: closing (300-360) */}
      <Sequence from={300} durationInFrames={60}>
        <ClosingCard />
      </Sequence>
    </AbsoluteFill>
  );
};

/* ---------- Continuous chat surface (frames 0-300) ---------- */
const ChatSurface: React.FC = () => {
  const frame = useCurrentFrame();
  // Fade out chat as we move to closing card
  const opacity = interpolate(frame, [290, 305], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Slight dim during pause
  const dim = interpolate(frame, [200, 240], [1, 0.55], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: CHAT_BG, opacity }}>
      <ChatHeader />
      <div
        style={{
          position: "absolute",
          top: 200,
          left: 0,
          right: 0,
          bottom: 760, // leave room for card deck at bottom
          padding: "20px 36px 0",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          opacity: dim,
        }}
      >
        <ChatStream />
      </div>
    </AbsoluteFill>
  );
};

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
    }}
  >
    {/* Stacked avatars */}
    <div style={{ display: "flex", marginBottom: 4 }}>
      {[ "#ff8db4", "#7fd3a8", "#9ab5ff", "#ffd27f" ].map((c, i) => (
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
    <div style={{ color: INK, fontSize: 32, fontWeight: 600 }}>the chat 🫠</div>
    <div style={{ color: MUTED, fontSize: 22 }}>maya, tyler, sam, you</div>
  </div>
);

const ChatStream: React.FC = () => {
  const frame = useCurrentFrame();
  // Auto-scroll: as more messages appear, push everything up
  const visibleCount = MSGS.filter((m) => frame >= m.appearAt).length;
  const scrollOffset = Math.max(0, (visibleCount - 5) * 120); // start scrolling after 5 msgs
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        transform: `translateY(${-scrollOffset}px)`,
        transition: "none",
      }}
    >
      {MSGS.map((m, i) => (
        <ChatBubble key={i} msg={m} />
      ))}
    </div>
  );
};

const ChatBubble: React.FC<{ msg: Msg }> = ({ msg }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - msg.appearAt;
  if (local < -2) return <div style={{ height: 0, overflow: "hidden" }} />;
  const s = spring({ frame: local, fps, config: { damping: 18, stiffness: 200 } });
  const op = interpolate(local, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(s, [0, 1], [14, 0]);

  // Highlight the final pivotal message
  const isLast = msg === MSGS[MSGS.length - 1];
  const pulse = isLast
    ? interpolate(frame, [148, 160, 175], [0, 1, 1], { extrapolateRight: "clamp" })
    : 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: msg.side === "right" ? "flex-end" : "flex-start",
        opacity: op,
        transform: `translateY(${y}px)`,
      }}
    >
      {msg.side === "left" && (
        <div
          style={{
            color: msg.color,
            fontSize: 18,
            fontWeight: 600,
            marginLeft: 18,
            marginBottom: 4,
            textTransform: "lowercase",
            letterSpacing: 0.2,
          }}
        >
          {msg.from}
        </div>
      )}
      <div
        style={{
          maxWidth: "78%",
          background: msg.side === "right" ? BUBBLE_YOU : BUBBLE_THEM,
          color: INK,
          padding: "16px 22px",
          borderRadius: 28,
          borderBottomLeftRadius: msg.side === "left" ? 8 : 28,
          borderBottomRightRadius: msg.side === "right" ? 8 : 28,
          fontSize: 32,
          lineHeight: 1.28,
          fontWeight: 400,
          boxShadow: isLast ? `0 0 ${40 * pulse}px ${ACCENT_AMBER}` : "none",
          outline: isLast && pulse > 0 ? `2px solid ${ACCENT_AMBER}` : "none",
        }}
      >
        {msg.text}
      </div>
    </div>
  );
};

/* ---------- Card deck at bottom ---------- */
const CardDeck: React.FC<{ mode: "flip" | "frozen" }> = ({ mode }) => {
  const frame = useCurrentFrame();
  const inOp = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 0,
          right: 0,
          padding: "0 28px",
          display: "flex",
          gap: 14,
          opacity: inOp,
        }}
      >
        {[0, 1, 2].map((i) => (
          <CardSlot key={i} slotIndex={i} mode={mode} />
        ))}
      </div>
      {mode === "flip" && (
        <div
          style={{
            position: "absolute",
            bottom: 460,
            left: 0,
            right: 0,
            textAlign: "center",
            color: MUTED,
            fontSize: 22,
            letterSpacing: 3,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          what do you even say
        </div>
      )}
    </AbsoluteFill>
  );
};

const CARD_COLORS = ["#37d6e0", "#ff3aa3", "#5cd9a8", "#f2c14e", "#ff6b4a", "#a78bfa"];

const CardSlot: React.FC<{ slotIndex: number; mode: "flip" | "frozen" }> = ({ slotIndex, mode }) => {
  const frame = useCurrentFrame();
  // In flip mode, each slot cycles every ~6 frames with a stagger.
  const cyclePeriod = 6;
  const index =
    mode === "flip"
      ? Math.floor((frame + slotIndex * 2) / cyclePeriod) % CARD_OPTIONS.length
      : (slotIndex * 3 + 4) % CARD_OPTIONS.length; // frozen: deterministic pick

  const label = CARD_OPTIONS[(index + slotIndex * 4) % CARD_OPTIONS.length];
  const color = CARD_COLORS[(index + slotIndex) % CARD_COLORS.length];

  // Card flip animation
  const phaseFrame = mode === "flip" ? (frame + slotIndex * 2) % cyclePeriod : 0;
  const rotY = mode === "flip" ? interpolate(phaseFrame, [0, cyclePeriod], [0, 360]) : 0;
  const scale = mode === "frozen"
    ? 1 + Math.sin(frame / 14 + slotIndex) * 0.012
    : 1;

  return (
    <div
      style={{
        flex: 1,
        aspectRatio: "0.72",
        perspective: 1200,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 24,
          background: `linear-gradient(160deg, ${color}, ${color}cc 60%, ${color}88)`,
          color: "#0b0710",
          padding: 22,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontWeight: 700,
          boxShadow: `0 24px 60px -20px ${color}88, 0 0 0 2px rgba(255,255,255,0.08) inset`,
          transform: `rotateY(${rotY}deg) scale(${scale})`,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        <div style={{ fontSize: 16, opacity: 0.55, letterSpacing: 2, textTransform: "uppercase" }}>
          option {slotIndex + 1}
        </div>
        <div
          style={{
            fontSize: 26,
            lineHeight: 1.2,
            fontWeight: 600,
            letterSpacing: -0.3,
            transform: rotY > 90 && rotY < 270 ? "scaleX(-1)" : "none",
          }}
        >
          "{label}"
        </div>
      </div>
    </div>
  );
};

/* ---------- Pause overlay ---------- */
const PauseOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [6, 22], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [6, 28], [16, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{
        background: "rgba(0,0,0,0.55)",
        padding: "0 70px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          opacity: op,
          transform: `translateY(${y}px)`,
          color: INK,
          fontSize: 76,
          fontWeight: 600,
          lineHeight: 1.18,
          letterSpacing: -2,
        }}
      >
        ever been in this groupchat?
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Closing card ---------- */
const ClosingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 22, stiffness: 110 } });
  const y = interpolate(s, [0, 1], [24, 0]);
  const op = interpolate(frame, [4, 18], [0, 1], { extrapolateRight: "clamp" });
  const lineOp = interpolate(frame, [22, 36], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{
        background: BG,
        padding: "0 70px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          opacity: op,
          transform: `translateY(${y}px)`,
          color: INK,
          fontSize: 96,
          fontWeight: 700,
          letterSpacing: -3.5,
          lineHeight: 1.05,
        }}
      >
        it's a game.
        <br />
        <span style={{ color: ACCENT_AMBER }}>you pick.</span>
      </div>
      <div
        style={{
          opacity: lineOp,
          marginTop: 60,
          color: INK,
          fontSize: 44,
          fontWeight: 500,
          letterSpacing: -0.5,
        }}
      >
        gameboi.online
      </div>
    </AbsoluteFill>
  );
};
