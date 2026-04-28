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
 * 1080x1920, 30fps, 330 frames = 11 seconds.
 * Mobile-vertical TikTok ad. Real product UI (not editorial).
 *
 * Shot list:
 *  0–60     (0–2s)   Game thread: Dev's three rapid texts compressed into 2s.
 *  60–180   (2–6s)   Card hand → tap "what does 'come over' actually mean" → bubble → Dev replies.
 *  180–270  (6–9s)   Cut to End Card. "WORTH SITTING WITH" + question, slightly soft.
 *  270–330  (9–11s)  "want to keep talking this through?" + gameboi.online (amber).
 *  Final frame:      tiny gameboi wordmark fade-in.
 */

const T = {
  THREAD: { start: 0, end: 60 },
  PLAY: { start: 60, end: 180 },
  END: { start: 180, end: 270 },
  CTA: { start: 270, end: 330 },
};

// Phone screen dims (centered, fills most of vertical canvas)
const SCREEN_W = 980;
const SCREEN_H = 1740;
const SCREEN_X = (1080 - SCREEN_W) / 2;
const SCREEN_Y = (1920 - SCREEN_H) / 2;

export const TikTokAdVideo: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: theme.bgDeep, fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Subtle ambient glow behind the phone */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "55%",
          width: 1400,
          height: 1400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${theme.primaryGlow} 0%, transparent 60%)`,
          filter: "blur(40px)",
          opacity: 0.55,
          transform: "translate(-50%, -50%)",
        }}
      />

      <Sequence from={T.THREAD.start} durationInFrames={T.PLAY.end - T.THREAD.start}>
        <GameSurface />
      </Sequence>

      <Sequence from={T.END.start} durationInFrames={T.CTA.end - T.END.start}>
        <EndSurface />
      </Sequence>
    </AbsoluteFill>
  );
};

/* ---------- THREAD + PLAY (0–6s) ---------- */

const DEV_MSGS = [
  "yooo",
  "so riley texted me",
  "she was pretty drunk saturday night and i wasn't really",
];

// All three Dev messages land within the first 60 frames (2s)
// Frames: 6, 26, 46 — each gets ~14 frames of pop before the next
const DEV_BEATS = [6, 26, 46];

// Card hand deals at frame 70 (2.33s into comp = ~10f after thread sequence ends)
const CARD_DEAL_START = 70 - T.THREAD.start; // local to this Sequence
const CARD_HIGHLIGHT_FRAME = 110 - T.THREAD.start; // ~3.66s — card lifts/scales
const CARD_PLAY_FRAME = 125 - T.THREAD.start; // ~4.16s — card flies up
const YOU_BUBBLE_FRAME = 140 - T.THREAD.start; // ~4.66s
const TYPING_START = 150 - T.THREAD.start;
const DEV_REPLY_FRAME = 165 - T.THREAD.start; // ~5.5s

const PICKED_CARD_LABEL = "what does 'come over' actually mean";
const DEV_REPLY = "right?? like… is it a vibe or is it a thing";

const GameSurface: React.FC = () => {
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          position: "absolute",
          left: SCREEN_X,
          top: SCREEN_Y,
          width: SCREEN_W,
          height: SCREEN_H,
          background: theme.bg,
          borderRadius: 80,
          overflow: "hidden",
          boxShadow:
            "0 40px 100px -10px rgba(0,0,0,0.7), 0 0 0 8px #000, 0 0 0 9px rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <PhoneStatusBar />
        <ConvoHeader exchange={1} />
        <ThreadAndCards />
      </div>
    </AbsoluteFill>
  );
};

const PhoneStatusBar: React.FC = () => (
  <div
    style={{
      height: 60,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 56px",
      color: theme.text,
      fontSize: 26,
      fontWeight: 600,
      position: "relative",
      flexShrink: 0,
    }}
  >
    <span>9:41</span>
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 12,
        transform: "translateX(-50%)",
        width: 200,
        height: 44,
        background: "#000",
        borderRadius: 999,
      }}
    />
    <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <span style={{ width: 28, height: 18, background: theme.text, borderRadius: 3, opacity: 0.85 }} />
      <span style={{ width: 44, height: 20, border: `2px solid ${theme.text}`, borderRadius: 5, opacity: 0.85 }} />
    </span>
  </div>
);

const ConvoHeader: React.FC<{ exchange: number }> = ({ exchange }) => (
  <div
    style={{
      padding: "12px 28px 18px",
      borderBottom: `1px solid ${theme.border}`,
      display: "flex",
      alignItems: "center",
      position: "relative",
      flexShrink: 0,
    }}
  >
    <div style={{ color: theme.accent, fontSize: 48, lineHeight: 1, width: 48 }}>‹</div>
    <div
      style={{
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <div
        style={{
          width: 70,
          height: 70,
          borderRadius: 999,
          overflow: "hidden",
          boxShadow: `0 0 0 3px ${theme.primary}`,
        }}
      >
        <img src={devAvatar} alt="dev" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ fontSize: 22, color: theme.text }}>dev</div>
    </div>
    <div
      style={{
        marginLeft: "auto",
        fontSize: 20,
        letterSpacing: 4,
        color: theme.textMuted,
        textTransform: "uppercase",
        fontWeight: 700,
      }}
    >
      {exchange}/6
    </div>
  </div>
);

const ThreadAndCards: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 0" }}>
      {/* Day stamp */}
      <div
        style={{
          textAlign: "center",
          color: theme.textMuted,
          fontSize: 20,
          fontWeight: 600,
          margin: "8px 0 16px",
          opacity: 0.8,
        }}
      >
        today 9:41
      </div>

      {/* Thread bubbles */}
      <div style={{ flexShrink: 0 }}>
        {DEV_MSGS.map((text, i) => (
          <ChatBubble
            key={`dev-${i}`}
            from="them"
            text={text}
            enterFrame={DEV_BEATS[i]}
            tail={i === DEV_MSGS.length - 1}
          />
        ))}

        {/* "You" bubble after card play */}
        {frame >= YOU_BUBBLE_FRAME && (
          <ChatBubble from="you" text={PICKED_CARD_LABEL} enterFrame={YOU_BUBBLE_FRAME} tail />
        )}

        {/* Typing then Dev reply */}
        {frame >= TYPING_START && frame < DEV_REPLY_FRAME && <TypingIndicator />}
        {frame >= DEV_REPLY_FRAME && (
          <ChatBubble from="them" text={DEV_REPLY} enterFrame={DEV_REPLY_FRAME} tail />
        )}
      </div>

      {/* Card hand */}
      <div style={{ marginTop: "auto", paddingBottom: 60 }}>
        <CardHand
          dealStart={CARD_DEAL_START}
          highlightFrame={CARD_HIGHLIGHT_FRAME}
          playFrame={CARD_PLAY_FRAME}
        />
      </div>
    </div>
  );
};

const ChatBubble: React.FC<{
  from: "them" | "you";
  text: string;
  enterFrame: number;
  tail?: boolean;
}> = ({ from, text, enterFrame, tail = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - enterFrame;
  if (local < 0) return null;
  const pop = spring({ frame: local, fps, config: { damping: 14, stiffness: 240 } });
  const opacity = interpolate(local, [0, 4], [0, 1], { extrapolateRight: "clamp" });
  const ty = interpolate(pop, [0, 1], [12, 0]);
  const scale = interpolate(pop, [0, 1], [0.85, 1]);
  const isYou = from === "you";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isYou ? "flex-end" : "flex-start",
        margin: "8px 0",
      }}
    >
      <div
        style={{
          background: isYou ? theme.bubbleYou : theme.bubbleThem,
          color: isYou ? "#fff" : theme.text,
          padding: "18px 28px",
          borderRadius: 38,
          maxWidth: "78%",
          fontSize: 32,
          lineHeight: 1.32,
          opacity,
          transform: `translateY(${ty}px) scale(${scale})`,
          transformOrigin: isYou ? "bottom right" : "bottom left",
          borderBottomRightRadius: isYou && tail ? 12 : 38,
          borderBottomLeftRadius: !isYou && tail ? 12 : 38,
          boxShadow: isYou
            ? "0 6px 24px -6px rgba(85, 96, 232, 0.6)"
            : "0 6px 18px -6px rgba(0,0,0,0.4)",
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
    <div style={{ display: "flex", justifyContent: "flex-start", margin: "8px 0" }}>
      <div
        style={{
          background: theme.bubbleThem,
          padding: "20px 28px",
          borderRadius: 38,
          borderBottomLeftRadius: 12,
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => {
          const t = (frame / fps) * 1.6 + i * 0.18;
          const y = Math.sin(t * Math.PI * 2) * 5;
          const op = 0.4 + (Math.sin(t * Math.PI * 2) + 1) * 0.3;
          return (
            <span
              key={i}
              style={{
                width: 16,
                height: 16,
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

/* ---------- Card hand (3 cards, middle one picked) ---------- */

type CardSpec = { vibe: "chill" | "bold" | "soft"; label: string };
const HAND: CardSpec[] = [
  { vibe: "chill", label: "it's been 2 days, breathe" },
  { vibe: "bold", label: "what does 'come over' actually mean" },
  { vibe: "soft", label: "what do you actually want here" },
];
const PICK_INDEX = 1;
const CARD_W = 280;
const CARD_H = 380;

const vibeColor: Record<CardSpec["vibe"], string> = {
  chill: theme.cardChill,
  bold: theme.cardBold,
  soft: theme.cardSoft,
};

const CardHand: React.FC<{
  dealStart: number;
  highlightFrame: number;
  playFrame: number;
}> = ({ dealStart, highlightFrame, playFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ position: "relative", height: CARD_H + 60, width: "100%" }}>
      {HAND.map((card, i) => {
        const dealLocal = frame - (dealStart + i * 5);
        const dealSpring = spring({
          frame: dealLocal,
          fps,
          config: { damping: 16, stiffness: 180 },
        });
        const dealOp = interpolate(dealLocal, [0, 8], [0, 1], { extrapolateRight: "clamp" });
        const dealY = interpolate(dealSpring, [0, 1], [180, 0]);
        const dealRot = interpolate(dealSpring, [0, 1], [-22, 0]);

        const isPick = i === PICK_INDEX;
        const center = (HAND.length - 1) / 2;
        const offset = i - center;
        const baseX = offset * 200;
        const baseY = Math.abs(offset) * 24;
        const baseRot = offset * 10;

        // Highlight: lift + scale the picked card
        const hlLocal = frame - highlightFrame;
        const hlSpring = spring({
          frame: hlLocal,
          fps,
          config: { damping: 18, stiffness: 200 },
        });
        const hlLift = isPick ? interpolate(hlSpring, [0, 1], [0, -50]) : 0;
        const hlScale = isPick ? interpolate(hlSpring, [0, 1], [1, 1.08]) : 1;
        const hlRotCorrect = isPick ? interpolate(hlSpring, [0, 1], [0, -baseRot]) : 0;

        // Play: card flies up & fades; others fade out
        let playY = 0;
        let playOp = 1;
        let playScale = 1;
        if (frame >= playFrame) {
          const pl = frame - playFrame;
          if (isPick) {
            const ps = spring({ frame: pl, fps, config: { damping: 18, stiffness: 130 } });
            playY = interpolate(ps, [0, 1], [0, -700]);
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
              borderRadius: 28,
              padding: 26,
              background: `linear-gradient(160deg, ${vibeColor[card.vibe]} 0%, ${vibeColor[card.vibe]}cc 100%)`,
              color: "#0f0a18",
              fontWeight: 700,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              boxShadow:
                isPick && frame >= highlightFrame && frame < playFrame
                  ? `0 24px 50px -10px ${vibeColor[card.vibe]}aa, 0 0 0 3px rgba(255,255,255,0.5)`
                  : "0 16px 32px -10px rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.25)",
              zIndex: isPick ? 5 : 1,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: 3,
                textTransform: "uppercase",
                opacity: 0.75,
              }}
            >
              {card.vibe}
            </div>
            <div style={{ fontSize: 24, lineHeight: 1.22 }}>{card.label}</div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- END CARD (6–11s) ---------- */

const EndSurface: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // CTA appears at local frame 90 (= absolute 270) — coincides with "Seconds 9-11"
  const ctaLocal = frame - 90;
  const ctaSpring = spring({ frame: ctaLocal, fps, config: { damping: 18, stiffness: 140 } });
  const ctaOp = interpolate(ctaLocal, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const ctaY = interpolate(ctaSpring, [0, 1], [40, 0]);

  // Everything fades in at start
  const inOp = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  // Question is "visible but not fully readable" during 6-9s -> apply subtle blur,
  // then resolve sharp at 9s (frame 90)
  const blur = interpolate(frame, [0, 80, 95], [3.5, 3, 0], { extrapolateRight: "clamp" });
  const questionOp = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  // Final-frame logo
  const logoOp = interpolate(frame, [120, 140], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: inOp }}>
      <div
        style={{
          position: "absolute",
          left: SCREEN_X,
          top: SCREEN_Y,
          width: SCREEN_W,
          height: SCREEN_H,
          background: theme.bg,
          borderRadius: 80,
          overflow: "hidden",
          boxShadow:
            "0 40px 100px -10px rgba(0,0,0,0.7), 0 0 0 8px #000, 0 0 0 9px rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
          padding: "80px 60px 60px",
        }}
      >
        {/* Amber glow */}
        <div
          style={{
            position: "absolute",
            top: -100,
            left: "50%",
            transform: "translateX(-50%)",
            width: 700,
            height: 700,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${theme.ito}33 0%, transparent 60%)`,
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            fontSize: 22,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: theme.textMuted,
            fontWeight: 700,
            marginBottom: 50,
          }}
        >
          end of round
        </div>

        {/* Avatar + offline */}
        <div style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 40 }}>
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: 999,
              overflow: "hidden",
              boxShadow: `0 0 0 3px ${theme.primary}`,
            }}
          >
            <img src={devAvatar} alt="dev" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div>
            <div style={{ fontSize: 30, color: theme.text, fontWeight: 600 }}>dev</div>
            <div style={{ fontSize: 24, color: theme.textMuted }}>went offline</div>
          </div>
        </div>

        {/* Recap paragraph (decorative, slightly muted) */}
        <p
          style={{
            fontSize: 30,
            lineHeight: 1.45,
            color: theme.text,
            opacity: 0.92,
            margin: 0,
            marginBottom: 60,
          }}
        >
          dev was spiraling about riley — the saturday night blackout, the vague "come over"
          text, the silence in between. you didn't try to fix it. you held the question with
          him.
        </p>

        {/* Worth sitting with */}
        <div style={{ paddingTop: 50, borderTop: `1px solid ${theme.border}` }}>
          <div
            style={{
              fontSize: 20,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: theme.textMuted,
              fontWeight: 700,
              marginBottom: 24,
            }}
          >
            worth sitting with
          </div>
          <div
            style={{
              fontSize: 44,
              lineHeight: 1.25,
              fontWeight: 600,
              color: theme.text,
              opacity: questionOp,
              filter: `blur(${blur}px)`,
            }}
          >
            what was he actually asking you to do — and what part of you wanted to fix it
            instead of feel it?
          </div>
        </div>

        {/* CTA pinned to bottom */}
        <div style={{ marginTop: "auto" }}>
          <div
            style={{
              opacity: ctaOp,
              transform: `translateY(${ctaY}px)`,
              padding: "32px",
              borderRadius: 32,
              background: `${theme.ito}26`,
              border: `2px solid ${theme.ito}66`,
              color: theme.ito,
              fontWeight: 700,
              fontSize: 34,
              textAlign: "center",
              letterSpacing: -0.5,
            }}
          >
            want to keep talking this through?
          </div>
          <div
            style={{
              opacity: ctaOp,
              transform: `translateY(${ctaY}px)`,
              textAlign: "center",
              marginTop: 32,
              color: theme.ito,
              fontSize: 38,
              fontWeight: 700,
              letterSpacing: -0.5,
            }}
          >
            gameboi.online
          </div>
          <div
            style={{
              opacity: logoOp,
              textAlign: "center",
              marginTop: 28,
              color: theme.text,
              fontSize: 20,
              letterSpacing: 6,
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            gameboi
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
