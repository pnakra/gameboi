import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

export type CardData = {
  label: string;
  vibe: "chill" | "bold" | "soft" | "chaos" | "direct";
};

const vibeColor: Record<CardData["vibe"], string> = {
  chill: theme.cardChill,
  bold: theme.cardBold,
  soft: theme.cardSoft,
  chaos: theme.cardChaos,
  direct: theme.cardDirect,
};

type FanProps = {
  cards: CardData[];
  dealStart: number;
  highlightIndex?: number; // which card the player "picks"
  pickFrame?: number; // when to fly the card up & out
};

/**
 * A fanned hand of advice cards that deal in one-by-one, then on `pickFrame`
 * the highlighted card flies up and the rest fade.
 */
export const CardFan: React.FC<FanProps> = ({ cards, dealStart, highlightIndex, pickFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const total = cards.length;

  return (
    <div style={{ position: "relative", height: 280, width: "100%" }}>
      {cards.map((card, i) => {
        const myDeal = dealStart + i * 4;
        const local = frame - myDeal;
        const dealAnim = spring({ frame: local, fps, config: { damping: 16, stiffness: 180 } });
        const dealOpacity = interpolate(local, [0, 8], [0, 1], { extrapolateRight: "clamp" });

        // Fan position
        const center = (total - 1) / 2;
        const offset = i - center;
        const baseRotate = offset * 8;
        const baseX = offset * 60;
        const baseY = Math.abs(offset) * 12;

        // Highlight lift
        const isHighlight = highlightIndex === i;
        const liftStart = pickFrame !== undefined ? pickFrame - 10 : -1;
        const liftLocal = frame - liftStart;
        const lift =
          liftStart > 0
            ? interpolate(liftLocal, [0, 10], [0, isHighlight ? -20 : 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            : 0;

        // Card play (fly up & out)
        let playY = 0;
        let playOpacity = 1;
        let playScale = 1;
        if (pickFrame !== undefined && frame >= pickFrame) {
          const playLocal = frame - pickFrame;
          if (isHighlight) {
            const playSpring = spring({
              frame: playLocal,
              fps,
              config: { damping: 18, stiffness: 140 },
            });
            playY = interpolate(playSpring, [0, 1], [0, -340]);
            playOpacity = interpolate(playLocal, [0, 12, 18], [1, 1, 0], {
              extrapolateRight: "clamp",
            });
            playScale = interpolate(playSpring, [0, 1], [1, 0.85]);
          } else {
            playOpacity = interpolate(playLocal, [0, 8], [1, 0], { extrapolateRight: "clamp" });
          }
        }

        const dealY = interpolate(dealAnim, [0, 1], [120, 0]);
        const dealRotate = interpolate(dealAnim, [0, 1], [-18, 0]);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              bottom: 0,
              width: 200,
              height: 240,
              marginLeft: -100,
              transform: `translate(${baseX}px, ${baseY + dealY + lift + playY}px) rotate(${
                baseRotate + dealRotate
              }deg) scale(${playScale})`,
              opacity: dealOpacity * playOpacity,
              transformOrigin: "bottom center",
              borderRadius: 22,
              padding: 16,
              background: `linear-gradient(160deg, ${vibeColor[card.vibe]} 0%, ${
                vibeColor[card.vibe]
              }cc 100%)`,
              color: "#0f0a18",
              fontFamily: "Inter, system-ui, sans-serif",
              fontWeight: 700,
              fontSize: 18,
              lineHeight: 1.25,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: isHighlight
                ? `0 20px 40px -10px ${vibeColor[card.vibe]}80, 0 0 0 2px rgba(255,255,255,0.4)`
                : "0 12px 28px -8px rgba(0,0,0,0.55)",
              border: "1px solid rgba(255,255,255,0.25)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", opacity: 0.7 }}>
              {card.vibe}
            </div>
            <div style={{ fontSize: 18 }}>{card.label}</div>
          </div>
        );
      })}
    </div>
  );
};
