import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GameScreen } from "@/components/game/GameScreen";
import { FriendSelect } from "@/components/game/FriendSelect";
import type { Friend } from "@/components/game/friends";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "moves with friends" },
      { name: "description", content: "your friend just texted. play your move." },
      { property: "og:title", content: "moves with friends" },
      { property: "og:description", content: "your friend just texted. play your move." },
    ],
  }),
  component: Index,
});

type Stage = "landing" | "select" | "play";

function Index() {
  const [stage, setStage] = useState<Stage>("landing");
  const [friend, setFriend] = useState<Friend | null>(null);

  if (stage === "play" && friend) {
    return (
      <GameScreen
        friend={friend}
        onExit={() => {
          setFriend(null);
          setStage("select");
        }}
      />
    );
  }

  if (stage === "select") {
    return (
      <FriendSelect
        onPick={(f) => {
          setFriend(f);
          setStage("play");
        }}
      />
    );
  }

  return (
    <div className="relative min-h-[100dvh] max-w-[480px] mx-auto flex flex-col items-center justify-between px-6 py-10 grain overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-primary/30 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-accent/20 blur-[100px] pointer-events-none" />

      {/* Top label */}
      <div className="relative text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
        a texting game
      </div>

      {/* Hero stack of floating cards */}
      <div className="relative flex-1 w-full grid place-items-center">
        <div className="relative w-[260px] h-[280px]">
          <FloatingCard rotate={-14} translate="-translate-x-20 -translate-y-2" vibe="card-chill" label="leave him on read" tag="chill" delay={0} />
          <FloatingCard rotate={6} translate="translate-x-2 -translate-y-6" vibe="card-bold" label="just say it 😤" tag="bold" delay={120} />
          <FloatingCard rotate={18} translate="translate-x-20 translate-y-4" vibe="card-direct" label="ask her friend" tag="direct" delay={240} />
        </div>
      </div>

      {/* Title */}
      <div className="relative text-center space-y-3 mb-8">
        <h1 className="display text-[44px] leading-[0.95] font-bold text-balance">
          moves with<br />friends
        </h1>
        <p className="text-muted-foreground text-[15px] max-w-[280px] mx-auto text-balance">
          your friend just texted. something happened. play your move.
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={() => setStage("select")}
        className="relative w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-lg tracking-tight active:scale-[0.98] transition-transform animate-pulse-glow"
      >
        tap in
      </button>
    </div>
  );
}

function FloatingCard({
  rotate,
  translate,
  vibe,
  label,
  tag,
  delay,
}: {
  rotate: number;
  translate: string;
  vibe: string;
  label: string;
  tag: string;
  delay: number;
}) {
  return (
    <div
      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${translate} animate-float-in`}
      style={{ transform: `translate(-50%,-50%) rotate(${rotate}deg)`, animationDelay: `${delay}ms` }}
    >
      <div
        className={`w-[150px] h-[200px] rounded-2xl p-3 border border-white/10 ring-1 shadow-card bg-gradient-to-br`}
        style={{
          backgroundImage: `linear-gradient(135deg, var(--${vibe}) / 0.3, transparent)`,
          // fallback solid tint via box-shadow inset:
          boxShadow: `inset 0 0 0 9999px color-mix(in oklch, var(--${vibe}) 18%, transparent), 0 20px 40px -20px rgb(0 0 0 / 0.6)`,
        }}
      >
        <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `var(--${vibe})` }}>
          {tag}
        </div>
        <div className="absolute inset-x-3 bottom-3 text-[15px] font-semibold leading-tight">
          {label}
        </div>
      </div>
    </div>
  );
}
