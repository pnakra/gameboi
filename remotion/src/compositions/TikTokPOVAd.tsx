import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

/**
 * TikTok POV ad — 1080x1920, 30fps, 225 frames (7.5s).
 * Zero branding. Cold open. Phone-POV of a group chat going dead silent
 * after a vulnerable message lands. Friend = Jordan, mode = group_mixed.
 *
 * Beat sheet:
 *  0–30   (0–1s)    POV title fades in over moody dim phone glow
 *  30–90  (1–3s)    Jordan's vulnerable message lands ("ok i think i'm done")
 *  90–135 (3–4.5s)  "Read" stamps pop in one-by-one. No replies.
 *  135–180 (4.5–6s) Typing indicator appears... then disappears. Nobody answers.
 *  180–225 (6–7.5s) Hold on the silence. Subtle subtext line fades in.
 */

// Sandbox-friendly muted palette — feels like 2am bedroom light, not a brand video.
const C = {
  bg: "#0a0612",
  bgGlow: "#1a1029",
  text: "#ece6f5",
  textDim: "#7a6f8a",
  bubbleThem: "#2a2237",
  read: "#6a5f7a",
};

const SCREEN_W = 920;
const SCREEN_H = 1680;
const SCREEN_X = (1080 - SCREEN_W) / 2;
const SCREEN_Y = (1920 - SCREEN_H) / 2;

export const TikTokPOVAd: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slow ambient breathing on the whole frame
  const breath = Math.sin((frame / fps) * 0.6) * 6;

  // POV title: in 0-25, hold, fade to subtle by 60
  const titleIn = interpolate(frame, [4, 22], [0, 1], { extrapolateRight: "clamp" });
  const titleOut = interpolate(frame, [55, 80], [1, 0.35], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleOpacity = titleIn * titleOut;
  const titleY = interpolate(frame, [4, 22], [12, 0], { extrapolateRight: "clamp" });

  // Subtext that lands at the end ("they all saw it")
  const subOpacity = interpolate(frame, [185, 205], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(frame, [185, 205], [10, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: C.bg,
        fontFamily: "Inter, system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Ambient bedroom-light glow */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 1600,
          height: 1600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.bgGlow} 0%, transparent 60%)`,
          filter: "blur(60px)",
          transform: `translate(-50%, ${-50 + breath * 0.3}%)`,
          opacity: 0.9,
        }}
      />

      {/* Phone shell — slightly tilted POV */}
      <div
        style={{
          position: "absolute",
          left: SCREEN_X,
          top: SCREEN_Y,
          width: SCREEN_W,
          height: SCREEN_H,
          background: "#0d0818",
          borderRadius: 90,
          overflow: "hidden",
          boxShadow: `0 0 0 10px #000, 0 60px 120px -10px rgba(0,0,0,0.85), inset 0 0 200px rgba(0,0,0,0.5)`,
          display: "flex",
          flexDirection: "column",
          transform: `translateY(${breath}px) rotate(${breath * 0.05}deg)`,
        }}
      >
        <StatusBar />
        <ChatHeader />
        <Thread />
      </div>

      {/* POV title — top of screen */}
      <div
        style={{
          position: "absolute",
          top: 110,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "inline-block",
            color: C.text,
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: -1,
            textShadow: "0 4px 20px rgba(0,0,0,0.9)",
            padding: "0 60px",
          }}
        >
          POV: thinking about why
          <br />
          the groupchat went quiet
        </div>
      </div>

      {/* End-beat subtext — bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 140,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: subOpacity,
          transform: `translateY(${subY}px)`,
          zIndex: 10,
        }}
      >
        <div
          style={{
            color: C.textDim,
            fontSize: 38,
            fontWeight: 500,
            letterSpacing: -0.3,
            textShadow: "0 4px 20px rgba(0,0,0,0.9)",
          }}
        >
          they all saw it
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Phone chrome ---------- */

const StatusBar: React.FC = () => (
  <div
    style={{
      height: 64,
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 60px",
      color: C.text,
      fontSize: 26,
      fontWeight: 600,
      position: "relative",
    }}
  >
    <span>2:14</span>
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 14,
        transform: "translateX(-50%)",
        width: 200,
        height: 44,
        background: "#000",
        borderRadius: 999,
      }}
    />
    <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <span style={{ width: 28, height: 18, background: C.text, borderRadius: 3, opacity: 0.85 }} />
      <span
        style={{
          width: 44,
          height: 20,
          border: `2px solid ${C.text}`,
          borderRadius: 5,
          opacity: 0.85,
        }}
      />
    </span>
  </div>
);

const ChatHeader: React.FC = () => (
  <div
    style={{
      padding: "16px 28px 22px",
      borderBottom: `1px solid rgba(255,255,255,0.06)`,
      display: "flex",
      alignItems: "center",
      flexShrink: 0,
    }}
  >
    <div style={{ color: "#37d6e0", fontSize: 48, lineHeight: 1, width: 48, opacity: 0.7 }}>‹</div>
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      {/* Stack of 3 avatars — group chat */}
      <div style={{ display: "flex", marginLeft: -12 }}>
        {[
          staticFile("images/friend-jordan.jpg"),
          staticFile("images/avatar-guy-1.jpg"),
          staticFile("images/avatar-girl-2.jpg"),
        ].map((src, i) => (
          <div
            key={i}
            style={{
              width: 60,
              height: 60,
              borderRadius: 999,
              overflow: "hidden",
              boxShadow: `0 0 0 3px #0d0818`,
              marginLeft: i === 0 ? 0 : -18,
              zIndex: 3 - i,
            }}
          >
            <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ))}
      </div>
      <div style={{ fontSize: 22, color: C.textDim, fontWeight: 500 }}>jordan, tyler, mara</div>
    </div>
    <div style={{ width: 48 }} />
  </div>
);

/* ---------- Thread ---------- */

const Thread: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Jordan's vulnerable message lands at frame 35
  const msgFrame = 35;
  const msgLocal = frame - msgFrame;
  const msgPop = spring({ frame: msgLocal, fps, config: { damping: 14, stiffness: 220 } });
  const msgOp = interpolate(msgLocal, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  const msgY = interpolate(msgPop, [0, 1], [16, 0]);
  const msgScale = interpolate(msgPop, [0, 1], [0.9, 1]);

  // Read receipts: "Read by tyler" at 95, "Read by mara" at 110
  const read1Op = interpolate(frame, [95, 108], [0, 1], { extrapolateRight: "clamp" });
  const read2Op = interpolate(frame, [110, 123], [0, 1], { extrapolateRight: "clamp" });

  // Typing indicator: appears at 145, disappears at 175
  const typingOp =
    frame < 145
      ? 0
      : frame < 168
        ? interpolate(frame, [145, 152], [0, 1], { extrapolateRight: "clamp" })
        : interpolate(frame, [168, 178], [1, 0], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "260px 30px 0",
      }}
    >
      {/* Day stamp */}
      <div
        style={{
          textAlign: "center",
          color: C.textDim,
          fontSize: 22,
          fontWeight: 500,
          margin: "0 0 30px",
          opacity: 0.7,
        }}
      >
        today 2:11 am
      </div>

      {/* Jordan's message */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 14,
          marginBottom: 8,
          opacity: msgOp,
          transform: `translateY(${msgY}px) scale(${msgScale})`,
          transformOrigin: "bottom left",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 999,
            overflow: "hidden",
            flexShrink: 0,
            opacity: 0.9,
          }}
        >
          <img
            src={staticFile("images/friend-jordan.jpg")}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              fontSize: 20,
              color: C.textDim,
              fontWeight: 500,
              marginLeft: 12,
            }}
          >
            jordan
          </div>
          <div
            style={{
              background: C.bubbleThem,
              color: C.text,
              padding: "22px 30px",
              borderRadius: 38,
              borderBottomLeftRadius: 12,
              maxWidth: 620,
              fontSize: 34,
              lineHeight: 1.32,
              boxShadow: "0 6px 20px -6px rgba(0,0,0,0.5)",
            }}
          >
            ok i think i'm actually done with alex this time
          </div>
        </div>
      </div>

      {/* Read receipts */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
          marginTop: 18,
          marginRight: 16,
        }}
      >
        <div
          style={{
            opacity: read1Op,
            color: C.read,
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: 0.2,
          }}
        >
          read by tyler · 2:11 am
        </div>
        <div
          style={{
            opacity: read2Op,
            color: C.read,
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: 0.2,
          }}
        >
          read by mara · 2:12 am
        </div>
      </div>

      {/* Typing indicator (appears then vanishes — never resolves) */}
      <div style={{ marginTop: 40, opacity: typingOp, height: 80 }}>
        {typingOp > 0.01 && <TypingDots />}
      </div>
    </div>
  );
};

const TypingDots: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        display: "inline-flex",
        gap: 12,
        alignItems: "center",
        background: C.bubbleThem,
        padding: "22px 30px",
        borderRadius: 38,
        borderBottomLeftRadius: 12,
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
              width: 14,
              height: 14,
              borderRadius: 999,
              background: C.text,
              opacity: op,
              transform: `translateY(${y}px)`,
              display: "inline-block",
            }}
          />
        );
      })}
    </div>
  );
};
