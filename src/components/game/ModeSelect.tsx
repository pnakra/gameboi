import { useEffect, useState } from "react";
import { MODES, type Mode, type ModeId } from "./modes";
import { type Friend } from "./friends";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

export function ModeSelect({
  friend,
  onPick,
  onBack,
}: {
  friend: Friend;
  onPick: (mode: Mode) => void;
  onBack: () => void;
}) {
  const [selectedId, setSelectedId] = useState<ModeId | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    track("mode_select_viewed", { friend_id: friend.id });
  }, [friend.id]);

  function pick(m: Mode) {
    if (leaving) return;
    setSelectedId(m.id);
    setLeaving(true);
    track("mode_picked", {
      friend_id: friend.id,
      mode_id: m.id,
      harder: !!m.harder,
    });
    window.setTimeout(() => onPick(m), 420);
  }

  function back() {
    if (leaving) return;
    track("mode_select_back_clicked", { friend_id: friend.id });
    onBack();
  }

  return (
    <div className="relative min-h-[100dvh] max-w-[480px] mx-auto flex flex-col px-5 pt-4 pb-6 grain overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-primary/20 blur-[100px] pointer-events-none" />

      <div className="relative flex items-center mb-3">
        <button
          onClick={back}
          aria-label="Back"
          className="text-accent text-[28px] leading-none w-10 h-10 grid place-items-center -ml-2 active:opacity-60"
        >
          ‹
        </button>
      </div>

      <div className="relative text-center mb-6 animate-float-in">
        <div className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
          {friend.name.toLowerCase()} — pick the room
        </div>
        <h1 className="display text-[34px] leading-[0.95] font-bold text-balance">
          how are you in this?
        </h1>
      </div>

      <div className="relative flex-1 flex flex-col gap-3 justify-center">
        {MODES.map((m, i) => (
          <ModeCard
            key={m.id}
            mode={m}
            friend={friend}
            index={i}
            selected={selectedId === m.id}
            dimmed={selectedId !== null && selectedId !== m.id}
            onPick={() => pick(m)}
          />
        ))}
      </div>

      <div className="relative text-center text-[11px] text-muted-foreground/60 mt-6">
        you can switch later.
      </div>
    </div>
  );
}

function ModeCard({
  mode,
  friend,
  index,
  selected,
  dimmed,
  onPick,
}: {
  mode: Mode;
  friend: Friend;
  index: number;
  selected: boolean;
  dimmed: boolean;
  onPick: () => void;
}) {
  const accentVar = `var(--${friend.accent})`;
  return (
    <button
      onClick={onPick}
      disabled={dimmed || selected}
      className={cn(
        "group relative w-full text-left rounded-3xl overflow-hidden",
        "border border-white/10 ring-1 ring-white/5",
        "transition-all duration-500 ease-out animate-float-in",
        "active:scale-[0.98]",
        selected && "scale-[1.03] ring-2 z-10 animate-pulse-glow",
        dimmed && "opacity-30 scale-[0.97] blur-[1px]",
        !selected && !dimmed && "hover:-translate-y-1 hover:shadow-card",
      )}
      style={{
        animationDelay: `${index * 80}ms`,
        backgroundImage: `linear-gradient(135deg, color-mix(in oklch, ${accentVar} 18%, transparent), color-mix(in oklch, ${accentVar} 3%, transparent))`,
        ...(selected ? { boxShadow: `0 0 0 2px ${accentVar}, 0 0 60px -10px ${accentVar}` } : {}),
      }}
    >
      <div className="flex items-stretch gap-4 p-3.5">
        {/* Glyph */}
        <div
          className="relative shrink-0 w-[88px] h-[88px] rounded-2xl overflow-hidden ring-1 ring-white/10 grid place-items-center"
          style={{
            background: `linear-gradient(160deg, color-mix(in oklch, ${accentVar} 30%, transparent), transparent 80%)`,
            boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${accentVar} 40%, transparent)`,
          }}
        >
          <ModeGlyph modeId={mode.id} accentVar={accentVar} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
          <div className="flex items-center gap-2">
            <h2 className="display text-[20px] font-bold leading-none">
              {mode.label}
            </h2>
            {mode.harder && (
              <span
                className="text-[9.5px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded-full"
                style={{
                  color: accentVar,
                  backgroundColor: `color-mix(in oklch, ${accentVar} 14%, transparent)`,
                }}
              >
                harder
              </span>
            )}
          </div>
          <p className="mt-2 text-[13px] leading-snug text-foreground/80 text-balance">
            {mode.sub}
          </p>
        </div>
      </div>
    </button>
  );
}

/**
 * Abstract chat-bubble glyph for each mode.
 * - solo_guy: single bubble, neutral foreground
 * - solo_girl: single bubble, accent-tinted (the friend voice is hers)
 * - group_guys: two stacked bubbles, both neutral
 * - group_mixed: two stacked bubbles, one accent-tinted (mixed reads)
 */
function ModeGlyph({ modeId, accentVar }: { modeId: ModeId; accentVar: string }) {
  const neutral = "color-mix(in oklch, white 75%, transparent)";
  const accent = accentVar;
  if (modeId === "solo_guy") {
    return (
      <svg width="46" height="40" viewBox="0 0 46 40" fill="none" aria-hidden>
        <BubbleShape x={4} y={4} w={38} h={26} fill={neutral} tail="left" />
      </svg>
    );
  }
  if (modeId === "solo_girl") {
    return (
      <svg width="46" height="40" viewBox="0 0 46 40" fill="none" aria-hidden>
        <BubbleShape x={4} y={4} w={38} h={26} fill={accent} tail="left" />
      </svg>
    );
  }
  if (modeId === "group_guys") {
    return (
      <svg width="50" height="44" viewBox="0 0 50 44" fill="none" aria-hidden>
        <BubbleShape x={2} y={2} w={32} h={20} fill={neutral} tail="left" />
        <BubbleShape x={16} y={20} w={32} h={20} fill={neutral} tail="right" opacity={0.85} />
      </svg>
    );
  }
  // group_mixed
  return (
    <svg width="50" height="44" viewBox="0 0 50 44" fill="none" aria-hidden>
      <BubbleShape x={2} y={2} w={32} h={20} fill={neutral} tail="left" />
      <BubbleShape x={16} y={20} w={32} h={20} fill={accent} tail="right" />
    </svg>
  );
}

function BubbleShape({
  x,
  y,
  w,
  h,
  fill,
  tail,
  opacity = 1,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  tail: "left" | "right";
  opacity?: number;
}) {
  const r = 8;
  return (
    <g opacity={opacity}>
      <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} />
      {tail === "left" ? (
        <path
          d={`M ${x + 3} ${y + h} Q ${x} ${y + h + 5} ${x - 1} ${y + h + 4} L ${x + 8} ${y + h - 2} Z`}
          fill={fill}
        />
      ) : (
        <path
          d={`M ${x + w - 3} ${y + h} Q ${x + w} ${y + h + 5} ${x + w + 1} ${y + h + 4} L ${x + w - 8} ${y + h - 2} Z`}
          fill={fill}
        />
      )}
    </g>
  );
}
