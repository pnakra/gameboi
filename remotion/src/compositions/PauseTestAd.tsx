import React from "react";
import {
  AbsoluteFill,
  Sequence,
  Img,
  staticFile,
  interpolate,
  useCurrentFrame,
  random,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
loadInter("normal", { weights: ["400", "500"], subsets: ["latin"] });

/**
 * 1080x1920, 30fps, 360 frames = 12s.
 * The "pause test" ad — feels like a person made it on their phone.
 *
 * Rules:
 *  - No mograph transitions, no springs, no gradients, no glows
 *  - Hard cuts. Optional 1-2 frame black between scenes.
 *  - Subtle handheld drift on every frame
 *  - Subtle film grain overlay
 *  - System-feeling type, lowercase, slightly off-center
 *  - Silent (no music — the silence is the hook)
 *  - No logo. Just a URL at the end.
 *
 * Beats:
 *   0-60     A real incoming message fills the screen. Silence.
 *   60-150   Text appears on black: "if you took longer than 3 seconds
 *            to think about this... this game is for you."
 *   150-225  Cut: the three choice cards. Held. No animation.
 *   225-315  Cut: an outcome screen, held.
 *   315-360  Black. "gameboi.online" lowercase, bottom-left.
 */

const BG = "#000";
const INK = "#ffffff";

/* ----- handheld drift wrapper ----- */
const Handheld: React.FC<{ seed: number; children: React.ReactNode; amp?: number }> = ({
  seed,
  children,
  amp = 3,
}) => {
  const frame = useCurrentFrame();
  // smooth pseudo-random drift via interpolated noise
  const tx = (random(`x${seed}`) - 0.5) * amp + Math.sin(frame / 22 + seed) * amp * 0.6;
  const ty = (random(`y${seed}`) - 0.5) * amp + Math.cos(frame / 19 + seed * 1.3) * amp * 0.6;
  const rot = Math.sin(frame / 40 + seed) * 0.15;
  return (
    <AbsoluteFill style={{ transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)` }}>
      {children}
    </AbsoluteFill>
  );
};

/* ----- film grain overlay ----- */
const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  // cycle a few grain seeds so it shimmers
  const seed = frame % 8;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        opacity: 0.14,
        mixBlendMode: "overlay",
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${seed}'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
        backgroundSize: "400px 400px",
      }}
    />
  );
};

/* ----- screenshot displayed like a phone-recorded screen ----- */
const Screen: React.FC<{ src: string; zoom?: number; offsetY?: number }> = ({
  src,
  zoom = 1,
  offsetY = 0,
}) => {
  // base: scale image so width = 1080. Image is 390x844 → scaled height ≈ 2337.
  return (
    <AbsoluteFill style={{ background: BG }}>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) translateY(${offsetY}px) scale(${zoom})`,
          width: 1080,
          height: (1080 * 844) / 390,
        }}
      >
        <Img
          src={staticFile(src)}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ----- typed-on-black text card ----- */
const TextCard: React.FC<{
  lines: { text: string; appearAt: number }[];
  align?: "left" | "center";
}> = ({ lines, align = "left" }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: BG,
        padding: "0 90px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: align === "center" ? "center" : "flex-start",
      }}
    >
      {lines.map((line, i) => {
        const visible = frame >= line.appearAt;
        if (!visible) return <div key={i} style={{ height: 0 }} />;
        return (
          <div
            key={i}
            style={{
              color: INK,
              fontFamily: "Inter, -apple-system, system-ui, sans-serif",
              fontSize: 64,
              fontWeight: 400,
              lineHeight: 1.25,
              letterSpacing: -1,
              marginBottom: 16,
              textAlign: align,
              maxWidth: 900,
              // slight nudge to feel hand-placed
              transform: `translateX(${(random(`tx-${i}`) - 0.5) * 8}px)`,
            }}
          >
            {line.text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ===== Main ===== */
export const PauseTestAd: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* Beat 1: the incoming text (0-60) */}
      <Sequence from={0} durationInFrames={60}>
        <Handheld seed={1} amp={4}>
          <Screen src="screens/gameboi-07-deeper-convo.png" zoom={1.18} offsetY={120} />
        </Handheld>
      </Sequence>

      {/* Beat 2: the line, on black (60-150) */}
      <Sequence from={60} durationInFrames={90}>
        <Handheld seed={2} amp={2}>
          <TextCard
            lines={[
              { text: "if you took longer than", appearAt: 0 },
              { text: "3 seconds to figure out", appearAt: 10 },
              { text: "what to say here...", appearAt: 20 },
              { text: "", appearAt: 22 },
              { text: "this game is for you.", appearAt: 50 },
            ]}
          />
        </Handheld>
      </Sequence>

      {/* Beat 3: the three options (150-225) — held, almost no movement */}
      <Sequence from={150} durationInFrames={75}>
        <Handheld seed={3} amp={2}>
          <Screen src="screens/gameboi-04-game-cards.png" zoom={1.1} offsetY={-80} />
        </Handheld>
      </Sequence>

      {/* Beat 4: outcome (225-315) */}
      <Sequence from={225} durationInFrames={90}>
        <Handheld seed={4} amp={3}>
          <Screen src="screens/gameboi-08-midreview-ito.png" zoom={1.12} offsetY={20} />
        </Handheld>
      </Sequence>

      {/* Beat 5: URL on black (315-360) */}
      <Sequence from={315} durationInFrames={45}>
        <Handheld seed={5} amp={1.5}>
          <AbsoluteFill
            style={{
              background: BG,
              padding: "0 90px 180px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                color: INK,
                fontFamily: "Inter, -apple-system, system-ui, sans-serif",
                fontSize: 72,
                fontWeight: 500,
                letterSpacing: -1.5,
              }}
            >
              gameboi.online
            </div>
          </AbsoluteFill>
        </Handheld>
      </Sequence>

      {/* Hard-cut "shutter" black flashes between scenes (1 frame each) */}
      {[60, 150, 225, 315].map((f) => (
        <Sequence key={f} from={f - 1} durationInFrames={2}>
          <AbsoluteFill style={{ background: BG }} />
        </Sequence>
      ))}

      {/* Persistent grain on top of everything */}
      <Grain />
    </AbsoluteFill>
  );
};
