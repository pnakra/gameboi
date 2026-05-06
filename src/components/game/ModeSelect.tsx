import { useEffect, useState } from "react";
import { MODES, type Mode } from "./modes";
import type { Friend } from "./friends";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    track("mode_select_viewed", { friend_id: friend.id });
  }, [friend.id]);

  function pick(m: Mode) {
    if (leaving) return;
    track("mode_picked", { friend_id: friend.id, mode_id: m.id });
    setSelectedId(m.id);
    setLeaving(true);
    window.setTimeout(() => onPick(m), 420);
  }

  return (
    <div className="relative min-h-[100dvh] max-w-[480px] mx-auto flex flex-col px-5 pt-6 pb-6 grain overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-primary/15 blur-[100px] pointer-events-none" />

      {/* Back */}
      <button
        onClick={() => {
          if (leaving) return;
          track("mode_select_back_clicked", { friend_id: friend.id });
          onBack();
        }}
        aria-label="Back"
        className="relative self-start text-accent text-[26px] leading-none w-9 h-9 grid place-items-center -ml-1 active:opacity-60"
      >
        ‹
      </button>

      <div className="relative text-center mb-6 mt-2 animate-float-in">
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
            index={i}
            selected={selectedId === m.id}
            dimmed={selectedId !== null && selectedId !== m.id}
            onPick={() => pick(m)}
          />
        ))}
      </div>

      <div className="relative text-center text-[11px] text-muted-foreground/60 mt-6">
        you can switch mode next round.
      </div>
    </div>
  );
}

function ModeCard({
  mode,
  index,
  selected,
  dimmed,
  onPick,
}: {
  mode: Mode;
  index: number;
  selected: boolean;
  dimmed: boolean;
  onPick: () => void;
}) {
  return (
    <button
      onClick={onPick}
      disabled={dimmed || selected}
      className={cn(
        "group relative w-full text-left rounded-3xl overflow-hidden",
        "border border-white/10 ring-1 ring-white/5 bg-surface",
        "transition-all duration-500 ease-out animate-float-in",
        "active:scale-[0.98]",
        selected && "scale-[1.02] ring-2 z-10 ring-primary/60 shadow-[0_0_60px_-10px_var(--primary)]",
        dimmed && "opacity-30 scale-[0.97] blur-[1px]",
        !selected && !dimmed && "hover:-translate-y-0.5 hover:bg-surface-2",
      )}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex items-center gap-3 p-4">
        <ModeGlyph id={mode.id} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="display text-[20px] font-bold leading-none">
              {mode.label}
            </h2>
            {mode.harder && (
              <span
                className="text-[9.5px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded-full"
                style={{
                  color: "var(--card-direct)",
                  backgroundColor: "color-mix(in oklch, var(--card-direct) 14%, transparent)",
                }}
              >
                harder
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground lowercase">
            {mode.sub}
          </p>
        </div>
      </div>
    </button>
  );
}

function ModeGlyph({ id }: { id: string }) {
  // Tiny abstract chat-window glyphs that hint at the mode's social shape.
  const base =
    "shrink-0 w-12 h-12 rounded-2xl grid place-items-center bg-surface-2 ring-1 ring-white/5";
  if (id === "solo_guy") {
    // Two-bubble back-and-forth — you + him.
    return (
      <div className={base}>
        <svg width="32" height="22" viewBox="0 0 32 22" fill="none" aria-hidden>
          <Bubble x={2} y={3} w={18} h={7} />
          <Bubble x={12} y={12} w={18} h={7} />
        </svg>
      </div>
    );
  }
  if (id === "group_guys") {
    // Same shape as mixed group, but all-blue (no pink tint).
    return (
      <div className={base}>
        <svg width="32" height="22" viewBox="0 0 32 22" fill="none" aria-hidden>
          <Bubble x={2} y={2} w={14} h={6} />
          <Bubble x={14} y={9} w={16} h={6} />
          <Bubble x={2} y={15} w={18} h={6} />
        </svg>
      </div>
    );
  }
  // group_mixed
  return (
    <div
      className={base}
      style={{
        background:
          "linear-gradient(135deg, color-mix(in oklch, var(--card-bold) 22%, var(--surface-2)), color-mix(in oklch, var(--card-chill) 14%, var(--surface-2)))",
      }}
    >
      <svg width="32" height="22" viewBox="0 0 32 22" fill="none" aria-hidden>
        <Bubble x={2} y={2} w={14} h={6} fill="var(--card-bold)" />
        <Bubble x={14} y={9} w={16} h={6} />
        <Bubble x={2} y={15} w={18} h={6} fill="var(--card-chill)" />
      </svg>
    </div>
  );
}

function Bubble({
  x,
  y,
  w,
  h,
  fill = "currentColor",
  fillOpacity = 0.85,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
  fillOpacity?: number;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={Math.min(h, w) / 2}
      fill={fill}
      fillOpacity={fillOpacity}
      className="text-foreground/85"
    />
  );
}
