import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export type Vibe = "direct" | "chill" | "bold" | "soft" | "chaos" | "ito";

const vibeStyles: Record<Vibe, { tag: string; tintVar: string }> = {
  direct: { tag: "direct", tintVar: "--card-direct" },
  chill:  { tag: "chill",  tintVar: "--card-chill" },
  bold:   { tag: "bold",   tintVar: "--card-bold" },
  soft:   { tag: "soft",   tintVar: "--card-soft" },
  chaos:  { tag: "chaos",  tintVar: "--card-chaos" },
  ito:    { tag: "isthisok.app", tintVar: "--card-ito" },
};

type Props = {
  label: string;
  vibe: Vibe;
  onClick?: () => void;
  disabled?: boolean;
  /** -1, 0, 1, 2 etc — used for fan rotation/translation */
  fanIndex?: number;
  /** total cards in the hand, for fan math */
  fanTotal?: number;
  /** Visually highlight (the card under the user's finger / hover) */
  active?: boolean;
  /** Animation state for play-out */
  playing?: boolean;
  /** Animation state for entering the hand */
  entering?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export const AdviceCard = forwardRef<HTMLButtonElement, Props>(function AdviceCard(
  { label, vibe, onClick, disabled, fanIndex = 0, fanTotal = 1, active, playing, entering, className, style },
  ref,
) {
  const s = vibeStyles[vibe];
  const tint = `var(${s.tintVar})`;

  // Fan math: spread cards in an arc.
  // Center index sits at the middle.
  const center = (fanTotal - 1) / 2;
  const offset = fanIndex - center; // -1.5 ... +1.5 for 4 cards
  const rotateDeg = offset * 6; // ±9° max
  const translateX = offset * 56; // px horizontal spread
  const translateY = Math.abs(offset) * 8; // arc dip (further from center = lower)

  const fanTransform = `translate(calc(-50% + ${translateX}px), ${translateY}px) rotate(${rotateDeg}deg)`;

  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "absolute left-1/2 bottom-0",
        "w-[180px] rounded-[22px] p-3.5 text-left select-none",
        "border border-white/10 ring-1 ring-white/5",
        "transition-[transform,box-shadow,opacity,height] duration-300 ease-out",
        "will-change-transform origin-bottom",
        "disabled:pointer-events-none",
        active && "z-30",
        playing && "pointer-events-none",
        entering && "animate-card-deal",
        className,
      )}
      style={{
        height: active ? 290 : 230,
        transform: playing
          ? `translate(-50%, -120vh) rotate(0deg) scale(0.9)`
          : active
          ? // Lift higher so the taller card stays in view
            `translate(-50%, -56px) rotate(0deg) scale(1.08)`
          : fanTransform,
        opacity: playing ? 0 : 1,
        zIndex: active ? 30 : 10 + fanIndex,
        backgroundImage: `
          radial-gradient(120% 80% at 30% 0%, color-mix(in oklch, ${tint} 28%, transparent) 0%, transparent 55%),
          linear-gradient(160deg, color-mix(in oklch, ${tint} 22%, var(--surface-2)) 0%, var(--surface) 100%)
        `,
        boxShadow: active
          ? `0 30px 60px -16px color-mix(in oklch, ${tint} 55%, transparent),
             0 0 0 1.5px color-mix(in oklch, ${tint} 75%, transparent),
             inset 0 1px 0 rgba(255,255,255,0.1)`
          : `0 12px 24px -16px rgb(0 0 0 / 0.7),
             0 4px 10px -8px rgb(0 0 0 / 0.5),
             inset 0 1px 0 rgba(255,255,255,0.06)`,
        transitionDuration: playing ? "550ms" : undefined,
        ...style,
      }}
    >
      {/* Vibe tag */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: tint }}
        >
          {s.tag}
        </span>
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: tint, boxShadow: `0 0 12px ${tint}` }}
        />
      </div>

      {/* Label — fills card. Clamped when fanned; full text when active. */}
      <div
        className={cn(
          "absolute inset-x-3.5 top-9 bottom-3.5 flex items-end",
          "text-[14px] font-semibold leading-[1.3] text-foreground/95 text-balance",
        )}
      >
        <span
          className={cn(
            "block w-full transition-all duration-200",
            active ? "text-[15px] leading-[1.32]" : "line-clamp-5",
          )}
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
