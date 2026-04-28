import { useEffect, useMemo, useState } from "react";
import { FRIENDS, type Friend, isUnlocked } from "./friends";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

export function FriendSelect({ onPick }: { onPick: (f: Friend) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    setUnlocked(isUnlocked());
    track("friend_select_viewed");
  }, []);

  const visible = useMemo(
    () => FRIENDS.filter((f) => !f.locked || unlocked),
    [unlocked],
  );
  const lockedPreview = useMemo(
    () => FRIENDS.filter((f) => f.locked && !unlocked),
    [unlocked],
  );

  function pick(f: Friend) {
    if (leaving) return;
    if (f.locked && !unlocked) {
      track("locked_friend_tapped", { friend_id: f.id });
      return;
    }
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
        {visible.map((f, i) => (
          <FriendCard
            key={f.id}
            friend={f}
            index={i}
            selected={selectedId === f.id}
            dimmed={selectedId !== null && selectedId !== f.id}
            onPick={() => pick(f)}
          />
        ))}

        {lockedPreview.map((f, i) => (
          <LockedFriendCard key={f.id} friend={f} index={visible.length + i} />
        ))}
      </div>

      <div className="relative text-center text-[11px] text-muted-foreground/60 mt-6">
        {lockedPreview.length > 0
          ? "play one round to unlock more"
          : "pick one. you can switch later."}
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

function LockedFriendCard({ friend, index }: { friend: Friend; index: number }) {
  const accentVar = `var(--${friend.accent})`;
  return (
    <div
      className={cn(
        "relative w-full text-left rounded-3xl overflow-hidden",
        "border border-white/[0.06] ring-1 ring-white/5",
        "animate-float-in opacity-70",
      )}
      style={{
        animationDelay: `${index * 90}ms`,
        backgroundImage: `linear-gradient(135deg, color-mix(in oklch, ${accentVar} 10%, transparent), color-mix(in oklch, ${accentVar} 2%, transparent))`,
      }}
      aria-disabled
    >
      <div className="flex items-stretch gap-4 p-3.5">
        <div
          className="relative shrink-0 w-[96px] h-[96px] rounded-2xl overflow-hidden ring-1 ring-white/10"
          style={{ boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${accentVar} 30%, transparent)` }}
        >
          <img
            src={friend.avatar}
            alt={friend.name}
            width={384}
            height={384}
            loading="lazy"
            className="w-full h-full object-cover blur-[6px] scale-110"
          />
          <div className="absolute inset-0 bg-background/40" />
          <div className="absolute inset-0 grid place-items-center">
            <LockIcon />
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
          <div className="flex items-center gap-2">
            <h2 className="display text-[20px] font-bold leading-none text-foreground/70">
              ???
            </h2>
            <span
              className="text-[9.5px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded-full"
              style={{
                color: accentVar,
                backgroundColor: `color-mix(in oklch, ${accentVar} 14%, transparent)`,
              }}
            >
              heavier
            </span>
          </div>
          <p className="mt-2 text-[12.5px] leading-snug text-muted-foreground text-balance italic">
            unlocks after your first round.
          </p>
        </div>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4.5"
        y="10.5"
        width="15"
        height="10"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
        className="text-foreground/80"
        fill="none"
      />
      <path
        d="M8 10.5V7.5a4 4 0 1 1 8 0v3"
        stroke="currentColor"
        strokeWidth="1.8"
        className="text-foreground/80"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
