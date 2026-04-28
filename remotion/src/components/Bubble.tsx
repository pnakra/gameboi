import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

type BubbleProps = {
  from: "them" | "you";
  text: string;
  enterFrame: number; // frame at which bubble appears
  tail?: boolean;
};

export const Bubble: React.FC<BubbleProps> = ({ from, text, enterFrame, tail = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - enterFrame;
  if (local < 0) return null;

  const pop = spring({ frame: local, fps, config: { damping: 14, stiffness: 220 } });
  const opacity = interpolate(local, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  const translateY = interpolate(pop, [0, 1], [16, 0]);
  const scale = interpolate(pop, [0, 1], [0.7, 1]);

  const isYou = from === "you";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isYou ? "flex-end" : "flex-start",
        margin: "4px 8px",
      }}
    >
      <div
        style={{
          background: isYou ? theme.bubbleYou : theme.bubbleThem,
          color: isYou ? "#fff" : theme.text,
          padding: "10px 16px",
          borderRadius: 22,
          maxWidth: "75%",
          fontSize: 19,
          lineHeight: 1.32,
          fontFamily: "Inter, system-ui, sans-serif",
          opacity,
          transform: `translateY(${translateY}px) scale(${scale})`,
          transformOrigin: isYou ? "bottom right" : "bottom left",
          boxShadow: isYou
            ? "0 4px 16px -4px rgba(85, 96, 232, 0.5)"
            : "0 4px 12px -4px rgba(0,0,0,0.3)",
          borderBottomRightRadius: isYou && tail ? 6 : 22,
          borderBottomLeftRadius: !isYou && tail ? 6 : 22,
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const TypingBubble: React.FC<{ enterFrame: number; exitFrame?: number }> = ({
  enterFrame,
  exitFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - enterFrame;
  if (local < 0) return null;
  if (exitFrame !== undefined && frame >= exitFrame) return null;

  const pop = spring({ frame: local, fps, config: { damping: 14, stiffness: 220 } });
  const opacity = interpolate(local, [0, 6], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ display: "flex", justifyContent: "flex-start", margin: "4px 8px" }}>
      <div
        style={{
          background: theme.bubbleThem,
          padding: "12px 18px",
          borderRadius: 22,
          opacity,
          transform: `scale(${pop})`,
          transformOrigin: "bottom left",
          display: "flex",
          gap: 6,
          alignItems: "center",
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
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: 999,
                background: theme.text,
                opacity: op,
                transform: `translateY(${y}px)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
