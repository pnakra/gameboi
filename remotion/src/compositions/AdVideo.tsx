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
import { Bubble } from "../components/Bubble";
import { CardFan, type CardData } from "../components/CardFan";
import { theme } from "../theme";
import devAvatar from "../../public/images/friend-dev.jpg";

/**
 * 1080x1920, 30fps, 255 frames = 8.5 seconds.
 *
 * Shot list (editorial, designed for thumb-stop):
 *  0-45    HOOK: full-screen text "your friend is texting you about something."
 *  45-120  TEXTS POPPING: 3 group-chat-style bubbles tumble in over backdrop
 *  120-195 CARD FAN HERO: cards deal in big, one is highlighted/picked
 *  195-255 CTA: gameboi logo + gameboi.online
 */

const T = {
  HOOK: { start: 0, end: 60 },
  TEXTS: { start: 50, end: 130 },
  CARDS: { start: 125, end: 200 },
  CTA: { start: 195, end: 255 },
};

export const AdVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <BrandBackdrop progress={frame / durationInFrames} />

      <Sequence from={T.HOOK.start} durationInFrames={T.HOOK.end - T.HOOK.start}>
        <Hook />
      </Sequence>

      <Sequence from={T.TEXTS.start} durationInFrames={T.TEXTS.end - T.TEXTS.start}>
        <Texts />
      </Sequence>

      <Sequence from={T.CARDS.start} durationInFrames={T.CARDS.end - T.CARDS.start}>
        <CardsHero />
      </Sequence>

      <Sequence from={T.CTA.start} durationInFrames={T.CTA.end - T.CTA.start}>
        <CTA />
      </Sequence>
    </AbsoluteFill>
  );
};

/* ---- Hook ---- */
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inS = spring({ frame, fps, config: { damping: 20, stiffness: 120 } });
  const opacity = interpolate(frame, [0, 8, 50, 60], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const y = interpolate(inS, [0, 1], [60, 0]);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ textAlign: "center", opacity, transform: `translateY(${y}px)` }}>
        <div
          style={{
            fontFamily: "Space Grotesk, system-ui, sans-serif",
            fontSize: 130,
            fontWeight: 700,
            color: theme.text,
            lineHeight: 1.02,
            letterSpacing: -4,
          }}
        >
          your friend
          <br />
          just{" "}
          <span style={{ color: theme.primary, textShadow: `0 0 40px ${theme.primaryGlow}` }}>
            texted
          </span>
          .
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---- Texts popping ---- */
const TEXT_BEATS = [
  { from: "them" as const, text: "ok so riley just texted me 😭", at: 0 },
  { from: "them" as const, text: "she's like 'wanna come over later'", at: 22 },
  { from: "them" as const, text: "i don't even know what i want bro", at: 48 },
];

const Texts: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [0, 8, durationInFrames - 12, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ padding: "180px 60px 0", opacity }}>
      {/* Avatar header lite */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          marginBottom: 40,
        }}
      >
        <div
          style={{
            width: 90,
            height: 90,
            borderRadius: 999,
            overflow: "hidden",
            border: `3px solid ${theme.primary}`,
          }}
        >
          <img src={devAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div>
          <div style={{ fontSize: 36, color: theme.text, fontWeight: 700 }}>dev</div>
          <div style={{ fontSize: 24, color: theme.textMuted }}>active now</div>
        </div>
      </div>
      <div style={{ fontSize: 28 /* scale up bubbles for vertical */ }}>
        <div style={{ transform: "scale(1.4)", transformOrigin: "left center" }}>
          {TEXT_BEATS.map((b, i) => (
            <Bubble key={i} from={b.from} text={b.text} enterFrame={b.at} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---- Cards hero ---- */
const CARDS: CardData[] = [
  { vibe: "chill", label: "it's been 2 days, breathe" },
  { vibe: "bold", label: "what does 'come over' actually mean" },
  { vibe: "soft", label: "what do you actually want here" },
];

const CardsHero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [0, 8, durationInFrames - 12, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" },
  );

  // Title prompt
  const titleS = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const titleY = interpolate(titleS, [0, 1], [20, 0]);

  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          position: "absolute",
          top: 200,
          left: 0,
          right: 0,
          textAlign: "center",
          transform: `translateY(${titleY}px)`,
        }}
      >
        <div
          style={{
            fontSize: 32,
            color: theme.textMuted,
            letterSpacing: 6,
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          what do you say?
        </div>
        <div
          style={{
            fontFamily: "Space Grotesk, system-ui, sans-serif",
            fontSize: 96,
            color: theme.text,
            fontWeight: 700,
            letterSpacing: -3,
            lineHeight: 1,
          }}
        >
          play your move.
        </div>
      </div>

      {/* Cards centered lower; scaled up for vertical */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 280,
          transform: "translateX(-50%) scale(1.7)",
          transformOrigin: "bottom center",
          width: 800,
        }}
      >
        <CardFan cards={CARDS} dealStart={10} highlightIndex={1} pickFrame={50} />
      </div>
    </AbsoluteFill>
  );
};

/* ---- CTA ---- */
const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoS = spring({ frame, fps, config: { damping: 16, stiffness: 130 } });
  const ctaS = spring({ frame: frame - 14, fps, config: { damping: 18, stiffness: 110 } });

  const logoY = interpolate(logoS, [0, 1], [40, 0]);
  const logoOp = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const ctaY = interpolate(ctaS, [0, 1], [30, 0]);
  const ctaOp = interpolate(frame, [10, 22], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            opacity: logoOp,
            transform: `translateY(${logoY}px)`,
            fontFamily: "Space Grotesk, system-ui, sans-serif",
            fontSize: 200,
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
            opacity: ctaOp,
            transform: `translateY(${ctaY}px)`,
            marginTop: 60,
            display: "inline-block",
            background: theme.primary,
            color: "#0f0a18",
            fontWeight: 800,
            fontSize: 44,
            padding: "28px 56px",
            borderRadius: 999,
            boxShadow: `0 0 60px ${theme.primaryGlow}`,
          }}
        >
          play it now
        </div>
        <div
          style={{
            opacity: ctaOp,
            marginTop: 40,
            color: theme.ito,
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: -0.5,
          }}
        >
          gameboi.online
        </div>
      </div>
    </AbsoluteFill>
  );
};
