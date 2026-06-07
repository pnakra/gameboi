import React from "react";
import {
  AbsoluteFill,
  Sequence,
  Img,
  staticFile,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });
loadSpaceGrotesk("normal", { weights: ["600", "700"], subsets: ["latin"] });

/**
 * 1080x1920, 30fps, 360 frames = 12s.
 * Quiet, type-driven ad built ONLY from real gameboi screenshots.
 *
 * Beats:
 *  0-60    HOOK title on black
 *  60-150  Tense incoming message — slow zoom
 *  150-230 Three-card choice screen — sequential highlight + caption
 *  230-285 "Made it worse" outcome
 *  285-330 "Handled it well" outcome (caption spans both)
 *  330-360 End card
 */

const T = {
  HOOK: { start: 0, end: 60 },
  MSG: { start: 60, end: 150 },
  CHOICE: { start: 150, end: 230 },
  BAD: { start: 230, end: 285 },
  GOOD: { start: 285, end: 330 },
  END: { start: 330, end: 360 },
};

const BG = "#0b0710";
const INK = "#f5f0fa";
const MUTED = "rgba(245,240,250,0.55)";
const AMBER = "#ffb24a";
const ROSE = "#ff6878";
const MINT = "#5cd9a8";

export const QuietAdVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: "Inter, system-ui, sans-serif" }}>
      <Sequence from={T.HOOK.start} durationInFrames={T.HOOK.end - T.HOOK.start}>
        <Hook />
      </Sequence>
      <Sequence from={T.MSG.start} durationInFrames={T.MSG.end - T.MSG.start}>
        <TenseMessage />
      </Sequence>
      <Sequence from={T.CHOICE.start} durationInFrames={T.CHOICE.end - T.CHOICE.start}>
        <ChoiceScreen />
      </Sequence>
      <Sequence from={T.BAD.start} durationInFrames={T.BAD.end - T.BAD.start}>
        <Outcome
          image="screens/gameboi-08-midreview-ito.png"
          caption="one reply makes it worse."
          tint={ROSE}
        />
      </Sequence>
      <Sequence from={T.GOOD.start} durationInFrames={T.GOOD.end - T.GOOD.start}>
        <Outcome
          image="screens/gameboi-09-inline-beat.png"
          caption="one actually helps."
          tint={MINT}
        />
      </Sequence>
      {/* Caption that spans both outcome scenes */}
      <Sequence from={T.BAD.start + 20} durationInFrames={T.GOOD.end - T.BAD.start - 30}>
        <SpanningCaption />
      </Sequence>
      <Sequence from={T.END.start} durationInFrames={T.END.end - T.END.start}>
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};

/* ---------- Helpers ---------- */

/** Fits a 390x844 screenshot into a 1080-wide vertical frame with optional zoom/pan. */
const Screenshot: React.FC<{
  src: string;
  scale?: number;
  translateY?: number;
  translateX?: number;
  opacity?: number;
}> = ({ src, scale = 1, translateY = 0, translateX = 0, opacity = 1 }) => {
  // Base fit: scale so image width = 1080 → height ≈ 2337 (overflow top/bottom)
  // We center vertically and let extra scale crop further.
  return (
    <AbsoluteFill style={{ overflow: "hidden", opacity }}>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${scale})`,
          transformOrigin: "center center",
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

/* ---------- Hook ---------- */
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inS = spring({ frame: frame - 4, fps, config: { damping: 22, stiffness: 90 } });
  const opacity = interpolate(frame, [0, 10, 50, 60], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const y = interpolate(inS, [0, 1], [24, 0]);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 90 }}>
      <div
        style={{
          opacity,
          transform: `translateY(${y}px)`,
          color: INK,
          fontFamily: "Space Grotesk, system-ui, sans-serif",
          fontSize: 92,
          fontWeight: 600,
          lineHeight: 1.12,
          letterSpacing: -2.5,
          textAlign: "left",
          textWrap: "balance",
        }}
      >
        you read this text
        <br />
        and your stomach
        <br />
        <span style={{ color: AMBER }}>drops.</span>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Tense incoming message ---------- */
const TenseMessage: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // Slow zoom-in over the duration
  const scale = interpolate(frame, [0, durationInFrames], [1.05, 1.32], { extrapolateRight: "clamp" });
  // Drift up so the latest message sits near center
  const ty = interpolate(frame, [0, durationInFrames], [80, -80], { extrapolateRight: "clamp" });
  const opacity = interpolate(
    frame,
    [0, 12, durationInFrames - 12, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" },
  );
  const vignette = interpolate(frame, [0, durationInFrames], [0.25, 0.55]);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Screenshot
        src="screens/gameboi-07-deeper-convo.png"
        scale={scale}
        translateY={ty}
        opacity={opacity}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignette}) 100%)`,
          pointerEvents: "none",
          opacity,
        }}
      />
    </AbsoluteFill>
  );
};

/* ---------- Choice screen ---------- */
const ChoiceScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [0, 10, durationInFrames - 12, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" },
  );
  // Subtle continuous push-in
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.08]);
  // Cards live in lower portion of the screenshot — bias view downward
  const ty = interpolate(frame, [0, durationInFrames], [-60, -120]);

  // Three sequential highlight glows positioned over the three card slots.
  // Screenshot is 390x844; we render it filling 1080 wide at center. With ty offset,
  // the card row sits ~near bottom third of frame. We approximate with percentages.
  const highlights = [
    { delay: 8, color: "#37d6e0", x: "18%" },
    { delay: 26, color: ROSE, x: "50%" },
    { delay: 44, color: MINT, x: "82%" },
  ];

  return (
    <AbsoluteFill style={{ background: "#000", opacity }}>
      <Screenshot
        src="screens/gameboi-04-game-cards.png"
        scale={scale}
        translateY={ty}
      />
      {highlights.map((h, i) => {
        const local = frame - h.delay;
        const a = interpolate(local, [0, 8, 22, 32], [0, 0.55, 0.55, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: h.x,
              bottom: "22%",
              transform: "translate(-50%, 50%)",
              width: 360,
              height: 360,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${h.color} 0%, transparent 60%)`,
              opacity: a,
              filter: "blur(8px)",
              pointerEvents: "none",
              mixBlendMode: "screen",
            }}
          />
        );
      })}

      {/* Caption */}
      <CaptionBlock
        frame={frame}
        enterAt={56}
        text={
          <>
            one reply makes it worse.
            <br />
            <span style={{ color: MINT }}>one actually helps.</span>
          </>
        }
        position="top"
      />
    </AbsoluteFill>
  );
};

/* ---------- Outcome scene ---------- */
const Outcome: React.FC<{ image: string; caption: string; tint: string }> = ({
  image,
  caption,
  tint,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [0, 10, durationInFrames - 10, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" },
  );
  const scale = interpolate(frame, [0, durationInFrames], [1.04, 1.12]);
  return (
    <AbsoluteFill style={{ background: "#000", opacity }}>
      <Screenshot src={image} scale={scale} />
      {/* Tint wash */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${tint}14 0%, transparent 40%, transparent 60%, ${tint}1f 100%)`,
          pointerEvents: "none",
        }}
      />
      {/* Small label corner */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 60,
          color: tint,
          fontSize: 28,
          letterSpacing: 4,
          textTransform: "uppercase",
          fontWeight: 700,
          opacity: interpolate(frame, [4, 14], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        {caption}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Caption that spans both outcomes ---------- */
const SpanningCaption: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [0, 14, durationInFrames - 12, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "flex-end",
        paddingBottom: 220,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          opacity,
          padding: "28px 36px",
          background: "rgba(11,7,16,0.78)",
          backdropFilter: "blur(6px)",
          borderRadius: 24,
          color: INK,
          fontFamily: "Space Grotesk, system-ui, sans-serif",
          fontSize: 56,
          fontWeight: 600,
          lineHeight: 1.15,
          letterSpacing: -1.5,
          textAlign: "center",
          maxWidth: 920,
        }}
      >
        gameboi lets you practice this
        <br />
        before it's real.
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Caption block helper ---------- */
const CaptionBlock: React.FC<{
  frame: number;
  enterAt: number;
  text: React.ReactNode;
  position: "top" | "bottom";
}> = ({ frame, enterAt, text, position }) => {
  const local = frame - enterAt;
  const op = interpolate(local, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(local, [0, 14], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: position === "top" ? "flex-start" : "flex-end",
        paddingTop: position === "top" ? 140 : 0,
        paddingBottom: position === "bottom" ? 200 : 0,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          opacity: op,
          transform: `translateY(${y}px)`,
          padding: "22px 32px",
          background: "rgba(11,7,16,0.78)",
          borderRadius: 22,
          color: INK,
          fontFamily: "Space Grotesk, system-ui, sans-serif",
          fontSize: 52,
          fontWeight: 600,
          lineHeight: 1.18,
          letterSpacing: -1.2,
          textAlign: "center",
          maxWidth: 920,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- End card ---------- */
const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoS = spring({ frame, fps, config: { damping: 22, stiffness: 120 } });
  const logoY = interpolate(logoS, [0, 1], [20, 0]);
  const lineOp = interpolate(frame, [10, 22], [0, 1], { extrapolateRight: "clamp" });
  const op = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ textAlign: "center", opacity: op }}>
        <div
          style={{
            transform: `translateY(${logoY}px)`,
            fontFamily: "Space Grotesk, system-ui, sans-serif",
            fontSize: 170,
            fontWeight: 700,
            color: INK,
            letterSpacing: -7,
            lineHeight: 1,
          }}
        >
          gameboi
        </div>
        <div
          style={{
            marginTop: 40,
            opacity: lineOp,
            color: MUTED,
            fontSize: 38,
            fontWeight: 500,
            lineHeight: 1.35,
            letterSpacing: -0.5,
          }}
        >
          quiet game. high-stakes choices.
        </div>
        <div
          style={{
            marginTop: 22,
            opacity: lineOp,
            color: AMBER,
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: -0.3,
          }}
        >
          search "gameboi consent"
        </div>
      </div>
    </AbsoluteFill>
  );
};
