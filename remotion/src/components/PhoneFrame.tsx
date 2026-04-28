import React from "react";
import { theme } from "../theme";

type Props = {
  width?: number;
  height?: number;
  contactName?: string;
  avatar?: string;
  exchange?: number;
  total?: number;
  children: React.ReactNode;
};

/**
 * iPhone-ish frame with notch + iMessage header, scaled to fit the comp.
 * Children render inside the inner screen — typically the chat thread
 * stack and a hand of cards / CTA at bottom.
 */
export const PhoneFrame: React.FC<Props> = ({
  width = 540,
  height = 1100,
  contactName,
  avatar,
  exchange,
  total,
  children,
}) => {
  return (
    <div
      style={{
        width,
        height,
        background: "#000",
        borderRadius: 64,
        padding: 14,
        boxShadow:
          "0 60px 120px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06), 0 0 80px -20px rgba(255, 58, 163, 0.4)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          background: theme.bg,
          borderRadius: 50,
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Status bar */}
        <div
          style={{
            position: "relative",
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 36px",
            color: theme.text,
            fontSize: 16,
            fontWeight: 600,
            fontFamily: "Inter, system-ui, sans-serif",
            zIndex: 2,
          }}
        >
          <span>9:41</span>
          {/* Notch */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 8,
              transform: "translateX(-50%)",
              width: 130,
              height: 32,
              background: "#000",
              borderRadius: 999,
            }}
          />
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-block", width: 18, height: 12, background: theme.text, borderRadius: 2, opacity: 0.85 }} />
            <span style={{ display: "inline-block", width: 28, height: 13, border: `1.5px solid ${theme.text}`, borderRadius: 4, opacity: 0.85, padding: 1 }}>
              <span style={{ display: "block", width: "100%", height: "100%", background: theme.text, borderRadius: 1.5 }} />
            </span>
          </span>
        </div>

        {/* Conversation header */}
        {contactName && (
          <div
            style={{
              position: "relative",
              padding: "8px 18px 12px",
              borderBottom: `1px solid ${theme.border}`,
              display: "flex",
              alignItems: "center",
            }}
          >
            <div style={{ color: theme.accent, fontSize: 32, lineHeight: 1, width: 36 }}>‹</div>
            <div
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              {avatar && (
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 999,
                    overflow: "hidden",
                    border: `2px solid ${theme.primary}`,
                  }}
                >
                  <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
              <div
                style={{
                  fontSize: 14,
                  color: theme.text,
                  fontFamily: "Inter, system-ui, sans-serif",
                  textTransform: "lowercase",
                }}
              >
                {contactName.toLowerCase()}
              </div>
            </div>
            {typeof exchange === "number" && typeof total === "number" && (
              <div
                style={{
                  marginLeft: "auto",
                  fontSize: 12,
                  letterSpacing: 2,
                  color: theme.textMuted,
                  textTransform: "uppercase",
                  fontWeight: 700,
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                {Math.min(exchange, total)}/{total}
              </div>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
};
