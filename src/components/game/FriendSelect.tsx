import { useEffect, useState } from "react";
import { FRIENDS, type Friend } from "./friends";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

export function FriendSelect({ onPick }: { onPick: (f: Friend) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    track("friend_select_viewed");
  }, []);

  function pick(f: Friend) {
    if (leaving) return;
    track("friend_picked", { friend_id: f.id, friend_name: f.name });
    setSelectedId(f.id);
    setLeaving(true);
    // satisfying beat before transition
    window.setTimeout(() => onPick(f), 520);
  }

  return (
    <div className="relative min-h-[100dvh] max-w-[480px] mx-auto flex flex-col px-5 pt-8 pb-6 grain overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-primary/20 blur-[100px] pointer-events-none" />

      <div className="relative text-center mb-6 animate-float-in">
        <div className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
          tonight
        </div>
        <h1 className="display text-[34px] leading-[0.95] font-bold text-balance">
          pick your homeboi
        </h1>
      </div>

      <div className="relative flex-1 flex flex-col gap-3.5 justify-center">
        {FRIENDS.map((f, i) => (
          <FriendCard
            key={f.id}
            friend={f}
            index={i}
            selected={selectedId === f.id}
            dimmed={selectedId !== null && selectedId !== f.id}
            onPick={() => pick(f)}
          />
        ))}
      </div>

      <div className="relative text-center text-[11px] text-muted-foreground/60 mt-6">
        pick one. you can switch later.
      </div>
    </div>
  );
}

function FriendCard({
  friend,
  index,
  selected,
  dimmed,
  onPick,
}: {
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
        animationDelay: `${index * 90}ms`,
        backgroundImage: `linear-gradient(135deg, color-mix(in oklch, ${accentVar} 22%, transparent), color-mix(in oklch, ${accentVar} 4%, transparent))`,
        // selection ring color
        ...(selected ? { boxShadow: `0 0 0 2px ${accentVar}, 0 0 60px -10px ${accentVar}` } : {}),
      }}
    >
      <div className="flex items-stretch gap-4 p-3.5">
        {/* Avatar */}
        <div
          className="relative shrink-0 w-[96px] h-[96px] rounded-2xl overflow-hidden ring-1 ring-white/10"
          style={{ boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${accentVar} 40%, transparent)` }}
        >
          <img
            src={friend.avatar}
            alt={friend.name}
            width={384}
            height={384}
            loading={index === 0 ? "eager" : "lazy"}
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0 mix-blend-overlay opacity-50"
            style={{ background: `linear-gradient(160deg, transparent 50%, ${accentVar} 130%)` }}
          />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
          <h2 className="display text-[24px] font-bold leading-none">{friend.name}</h2>
          <p className="mt-2 text-[13.5px] leading-snug text-foreground/80 text-balance">
            {friend.sketch}
          </p>
        </div>
      </div>
    </button>
  );
}
