import React from "react";
import {
  AbsoluteFill,
  Img,
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
 * No branding. POV title sits ABOVE the phone in clear space.
 * Phone is shrunk to leave proper top/bottom margin.
 */

const C = {
  bg: "#0a0612",
  bgGlow: "#1a1029",
  text: "#ece6f5",
  textDim: "#7a6f8a",
  bubbleThem: "#2a2237",
  read: "#6a5f7a",
};

// Phone dims — leave generous bottom safe area for TikTok caption / CTA chrome.
const SCREEN_W = 790;
const SCREEN_H = 1280;
const SCREEN_X = (1080 - SCREEN_W) / 2;
const SCREEN_Y = 240;

export const TikTokPOVAd: React.FC = () => {
  const frame = useCurrentFrame();

  // POV title — fades in once, stays the whole video
  const titleOp = interpolate(frame, [4, 22], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [4, 22], [10, 0], { extrapolateRight: "clamp" });

  // Bottom subtext — appears at the silence beat
  const subOp = interpolate(frame, [185, 210], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(frame, [185, 210], [10, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: C.bg,
        fontFamily: "Inter, system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Static background only — no blur/compositor-heavy effects that can shimmer between frames */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: [
            `radial-gradient(circle at 50% 18%, ${C.bgGlow} 0%, rgba(26,16,41,0.7) 24%, rgba(10,6,18,0.96) 56%)`,
            "linear-gradient(180deg, #120a1f 0%, #0b0714 42%, #08050f 100%)",
          ].join(", "),
        }}
      />

      {/* POV title — sits cleanly above the phone */}
      <div
        style={{
          position: "absolute",
          top: 90,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleOp,
          transform: `translateY(${titleY}px)`,
          padding: "0 80px",
        }}
      >
        <div
          style={{
            color: C.text,
            fontSize: 60,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: -1.5,
          }}
        >
          POV: thinking about why
          <br />
          the groupchat went quiet
        </div>
      </div>

      {/* Phone — fully static, no wobble */}
      <div
        style={{
          position: "absolute",
          left: SCREEN_X,
          top: SCREEN_Y,
          width: SCREEN_W,
          height: SCREEN_H,
          background: "#0d0818",
          borderRadius: 80,
          overflow: "hidden",
          boxShadow: `0 0 0 8px #000, 0 28px 60px -20px rgba(0,0,0,0.82)`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <StatusBar />
        <ChatHeader />
        <Thread />
      </div>

      {/* Bottom subtext */}
      <div
        style={{
          position: "absolute",
          top: SCREEN_Y + SCREEN_H + 54,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: subOp,
          transform: `translateY(${subY}px)`,
        }}
      >
        <div
          style={{
            color: C.textDim,
            fontSize: 42,
            fontWeight: 500,
            letterSpacing: -0.3,
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
      height: 56,
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 50px",
      color: C.text,
      fontSize: 24,
      fontWeight: 600,
      position: "relative",
    }}
  >
    <span>2:14</span>
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 12,
        transform: "translateX(-50%)",
        width: 180,
        height: 38,
        background: "#000",
        borderRadius: 999,
      }}
    />
    <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <span style={{ width: 26, height: 16, background: C.text, borderRadius: 3, opacity: 0.85 }} />
      <span
        style={{
          width: 40,
          height: 18,
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
    <div style={{ color: "#37d6e0", fontSize: 44, lineHeight: 1, width: 48, opacity: 0.7 }}>‹</div>
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <div style={{ display: "flex" }}>
        {[
          staticFile("images/friend-jordan.jpg"),
          staticFile("images/avatar-guy-1.jpg"),
          staticFile("images/avatar-girl-2.jpg"),
        ].map((src, i) => (
          <div
            key={i}
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              overflow: "hidden",
              boxShadow: `0 0 0 3px #0d0818`,
              marginLeft: i === 0 ? 0 : -16,
              zIndex: 3 - i,
            }}
          >
             <Img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ))}
      </div>
      <div style={{ fontSize: 20, color: C.textDim, fontWeight: 500 }}>jordan, tyler, mara</div>
    </div>
    <div style={{ width: 48 }} />
  </div>
);

/* ---------- Thread ---------- */

const Thread: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const msgFrame = 35;
  const msgLocal = frame - msgFrame;
  const msgPop = spring({ frame: msgLocal, fps, config: { damping: 14, stiffness: 220 } });
  const msgOp = interpolate(msgLocal, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  const msgY = interpolate(msgPop, [0, 1], [16, 0]);
  const msgScale = interpolate(msgPop, [0, 1], [0.9, 1]);

  const read1Op = interpolate(frame, [95, 108], [0, 1], { extrapolateRight: "clamp" });
  const read2Op = interpolate(frame, [110, 123], [0, 1], { extrapolateRight: "clamp" });

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
        padding: "60px 28px 0",
      }}
    >
      <div
        style={{
          textAlign: "center",
          color: C.textDim,
          fontSize: 20,
          fontWeight: 500,
          margin: "0 0 30px",
          opacity: 0.7,
        }}
      >
        today 2:11 am
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 12,
          marginBottom: 8,
          opacity: msgOp,
          transform: `translateY(${msgY}px) scale(${msgScale})`,
          transformOrigin: "bottom left",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            overflow: "hidden",
            flexShrink: 0,
            opacity: 0.9,
          }}
        >
          <Img
            src={staticFile("images/friend-jordan.jpg")}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 18, color: C.textDim, fontWeight: 500, marginLeft: 12 }}>
            jordan
          </div>
          <div
            style={{
              background: C.bubbleThem,
              color: C.text,
              padding: "20px 28px",
              borderRadius: 34,
              borderBottomLeftRadius: 12,
              maxWidth: 580,
              fontSize: 30,
              lineHeight: 1.32,
              boxShadow: "0 6px 20px -6px rgba(0,0,0,0.5)",
            }}
          >
            ok i think i'm actually done with alex this time
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 6,
          marginTop: 16,
          marginRight: 12,
        }}
      >
        <div style={{ opacity: read1Op, color: C.read, fontSize: 20, fontWeight: 500 }}>
          read by tyler · 2:11 am
        </div>
        <div style={{ opacity: read2Op, color: C.read, fontSize: 20, fontWeight: 500 }}>
          read by mara · 2:12 am
        </div>
      </div>

      <div style={{ marginTop: 30, opacity: typingOp, height: 70 }}>
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
        gap: 10,
        alignItems: "center",
        background: C.bubbleThem,
        padding: "20px 26px",
        borderRadius: 34,
        borderBottomLeftRadius: 12,
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
              width: 13,
              height: 13,
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
