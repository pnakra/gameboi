import React from "react";
import { AbsoluteFill } from "remotion";
import { theme } from "../theme";

/**
 * Animated brand background — soft radial gradient + drifting magenta glow.
 * Static colors; subtle only — never fights the phone in foreground.
 */
export const BrandBackdrop: React.FC<{ progress?: number }> = ({ progress = 0 }) => {
  // progress 0..1 over the whole composition for slow drift
  const x = 50 + Math.sin(progress * Math.PI * 2) * 8;
  const y = 30 + Math.cos(progress * Math.PI * 2) * 6;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at ${x}% ${y}%, ${theme.bgGradTop} 0%, ${theme.bg} 55%, ${theme.bgDeep} 100%)`,
      }}
    >
      {/* Drifting glow */}
      <div
        style={{
          position: "absolute",
          left: `${20 + Math.sin(progress * Math.PI * 2) * 10}%`,
          top: `${60 + Math.cos(progress * Math.PI * 2) * 8}%`,
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${theme.primaryGlow} 0%, transparent 60%)`,
          filter: "blur(20px)",
          opacity: 0.7,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: `${15 + Math.cos(progress * Math.PI * 2) * 6}%`,
          top: `${25 + Math.sin(progress * Math.PI * 2 + 1) * 6}%`,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(55, 214, 224, 0.35) 0%, transparent 60%)`,
          filter: "blur(20px)",
          opacity: 0.6,
          transform: "translate(50%, -50%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
