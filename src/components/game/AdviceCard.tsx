import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export type Vibe = "direct" | "chill" | "bold" | "soft" | "chaos" | "ito" | "ito_app";

const vibeStyles: Record<Vibe, { tag: string; tintVar: string }> = {
  direct:  { tag: "direct",       tintVar: "--card-direct" },
  chill:   { tag: "chill",        tintVar: "--card-chill" },
  bold:    { tag: "bold",         tintVar: "--card-bold" },
  soft:    { tag: "soft",         tintVar: "--card-soft" },
  chaos:   { tag: "chaos",        tintVar: "--card-chaos" },
  ito:     { tag: "real talk",    tintVar: "--card-ito" },
  ito_app: { tag: "isthisok.app", tintVar: "--card-ito" },
};

type Props = {
  label: string;
  vibe: Vibe;
  disabled?: boolean;
  /** -1, 0, 1, 2 etc — used for fan rotation/translation */
  fanIndex?: number;
  /** total cards in the hand, for fan math */
  fanTotal?: number;
  /** Visually highlight (the card under the user's finger / hover / peek) */
  active?: boolean;
  /** Animation state for play-out */
  playing?: boolean;
  /** Animation state for entering the hand */
  entering?: boolean;
  /** Live drag state — while true, transform follows dragX/dragY without transition */
  dragging?: boolean;
  dragX?: number;
  dragY?: number;
  className?: string;
  style?: React.CSSProperties;
  onPointerDown?: React.PointerEventHandler<HTMLButtonElement>;
  onPointerMove?: React.PointerEventHandler<HTMLButtonElement>;
  onPointerUp?: React.PointerEventHandler<HTMLButtonElement>;
  onPointerCancel?: React.PointerEventHandler<HTMLButtonElement>;
};

const CARD_WIDTH = 115; // px; narrow enough that 4 cards fit on a mobile screen

export const AdviceCard = forwardRef<HTMLButtonElement, Props>(function AdviceCard(
  {
    label,
    vibe,
    disabled,
    fanIndex = 0,
    fanTotal = 1,
    active,
    playing,
    entering,
    dragging,
    dragX = 0,
    dragY = 0,
    className,
    style,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  },
  ref,
) {
  const s = vibeStyles[vibe];
  const tint = `var(${s.tintVar})`;

  // Fan math: gentle, readable arc.
  const center = (fanTotal - 1) / 2;
  const offset = fanIndex - center;
  const maxRotate = 5;
  const rotateDeg = fanTotal > 1 ? (offset / center) * maxRotate : 0;
  const visibleRatio = 0.65;
  const translateX = offset * (CARD_WIDTH * (1 - visibleRatio));
  const translateY = Math.abs(offset) * 4;

  const fanTransform = `translate(calc(-50% + ${translateX}px), calc(${translateY}px + var(--card-float, 0px))) rotate(${rotateDeg}deg)`;
  // Peek / active (tap-to-peek fallback): lifted, enlarged, centered.
  const peekTransform = `translate(-50%, -56px) rotate(0deg) scale(1.08)`;
  // Drag: follow the finger from the peek anchor, no rotation, slightly larger.
  const dragTransform = `translate(calc(-50% + ${dragX}px), calc(-56px + ${dragY}px)) rotate(0deg) scale(1.12)`;
  const playTransform = `translate(-50%, -120vh) rotate(0deg) scale(0.9)`;

  const lifted = active || dragging;
  const idle = !lifted && !playing && !entering;

  return (
    <button
      ref={ref}
      disabled={disabled}
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={cn(
        "absolute left-1/2 bottom-0",
        "w-[115px] rounded-[22px] p-3.5 text-left select-none",
        "border border-white/10 ring-1 ring-white/5",
        "transition-[transform,box-shadow,opacity,height] duration-300 ease-out",
        "will-change-transform origin-bottom",
        "disabled:pointer-events-none",
        lifted && "z-30",
        playing && "pointer-events-none",
        entering && "animate-card-deal",
        className,
      )}
      style={{
        touchAction: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
        height: lifted ? 250 : 196,
        transform: playing
          ? playTransform
          : dragging
          ? dragTransform
          : active
          ? peekTransform
          : fanTransform,
        opacity: playing ? 0 : 1,
        zIndex: lifted ? 30 : 10 + fanIndex,
        backgroundImage: `
          radial-gradient(120% 80% at 30% 0%, color-mix(in oklch, ${tint} 28%, transparent) 0%, transparent 55%),
          linear-gradient(160deg, color-mix(in oklch, ${tint} 22%, var(--surface-2)) 0%, var(--surface) 100%)
        `,
        boxShadow: dragging
          ? `0 40px 90px -20px color-mix(in oklch, ${tint} 80%, transparent),
             0 0 42px 4px color-mix(in oklch, ${tint} 55%, transparent),
             0 0 0 2px color-mix(in oklch, ${tint} 90%, transparent),
             inset 0 1px 0 rgba(255,255,255,0.14)`
          : active
          ? `0 30px 60px -16px color-mix(in oklch, ${tint} 55%, transparent),
             0 0 0 1.5px color-mix(in oklch, ${tint} 75%, transparent),
             inset 0 1px 0 rgba(255,255,255,0.1)`
          : `0 12px 24px -16px rgb(0 0 0 / 0.7),
             0 4px 10px -8px rgb(0 0 0 / 0.5),
             0 0 0 1.25px color-mix(in oklch, ${tint} 55%, transparent),
             0 0 14px -2px color-mix(in oklch, ${tint} 42%, transparent),
             0 0 26px -6px color-mix(in oklch, ${tint} 30%, transparent),
             inset 0 0 0 1px color-mix(in oklch, ${tint} 22%, transparent),
             inset 0 1px 0 rgba(255,255,255,0.06)`,
        // While dragging, kill the transition so it tracks the finger.
        transition: dragging ? "none" : undefined,
        transitionDuration: playing ? "550ms" : undefined,
        ...style,
      }}
    >
      {/* Vibe tag — pinned to the visible top-left edge of a fanned card.
          The card's border glow already carries the tone; the label just names it. */}
      <div className="flex items-center gap-1.5" style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}>
        <span
          className="text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: tint }}
        >
          {s.tag}
        </span>
      </div>

      {/* Label — short punchy move name, top-left, readable while fanned */}
      <div
        className={cn(
          "absolute inset-x-3.5 top-9 flex items-start overflow-hidden",
          "font-semibold text-foreground/95 text-balance",
        )}
        style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}
      >
        <span
          className={cn(
            "block w-full transition-all duration-200",
            lifted
              ? "text-[15px] leading-[1.32]"
              : "text-[13px] leading-[1.28] line-clamp-4",
          )}
          style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}
        >
          {label}
        </span>
      </div>

      {/* Subtle inner sheen */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[22px] opacity-60"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.15) 100%)",
        }}
      />
    </button>
  );
});
