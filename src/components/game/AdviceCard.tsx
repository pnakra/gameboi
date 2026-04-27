import { cn } from "@/lib/utils";

export type Vibe = "direct" | "chill" | "bold" | "soft" | "chaos";

const vibeStyles: Record<Vibe, { bg: string; ring: string; tag: string }> = {
  direct: { bg: "from-card-direct/30 to-card-direct/5", ring: "ring-card-direct/40", tag: "text-card-direct" },
  chill:  { bg: "from-card-chill/30 to-card-chill/5",   ring: "ring-card-chill/40",  tag: "text-card-chill" },
  bold:   { bg: "from-card-bold/30 to-card-bold/5",     ring: "ring-card-bold/40",   tag: "text-card-bold" },
  soft:   { bg: "from-card-soft/30 to-card-soft/5",     ring: "ring-card-soft/40",   tag: "text-card-soft" },
  chaos:  { bg: "from-card-chaos/30 to-card-chaos/5",   ring: "ring-card-chaos/40",  tag: "text-card-chaos" },
};

export function AdviceCard({
  label,
  vibe,
  onClick,
  disabled,
  index = 0,
}: {
  label: string;
  vibe: Vibe;
  onClick: () => void;
  disabled?: boolean;
  index?: number;
}) {
  const s = vibeStyles[vibe];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative shrink-0 w-[150px] h-[200px] rounded-2xl p-3 text-left",
        "bg-gradient-to-br border border-white/10 ring-1",
        "transition-all duration-200 ease-out",
        "active:scale-95 active:translate-y-1",
        "hover:-translate-y-2 hover:shadow-card",
        "disabled:opacity-40 disabled:pointer-events-none",
        s.bg,
        s.ring,
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={cn("text-[10px] font-bold uppercase tracking-widest", s.tag)}>
        {vibe}
      </div>
      <div className="absolute inset-x-3 bottom-3 text-[15px] font-semibold leading-tight text-balance">
        {label}
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/5 blur-xl" />
    </button>
  );
}
