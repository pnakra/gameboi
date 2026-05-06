import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Friend } from "./friends";
import type { Mode } from "./modes";
import { track } from "@/lib/analytics";

export type AdvisePayload = any;

export function prefetchFirstTurn(friend: Friend, mode: Mode): Promise<AdvisePayload> {
  return supabase.functions
    .invoke("advise", {
      body: {
        start: true,
        history: [],
        friendContext: friend.context,
        friendName: friend.name,
        mode: mode.id,
        modeDirective: mode.promptDirective,
        exchange: 1,
      },
    })
    .then(({ data, error }) => {
      if (error) throw error;
      return data;
    });
}

function briefingCopy(friend: Friend, mode: Mode): { eyebrow: string; line: string } {
  const name = friend.name;
  if (mode.id === "group_guys") {
    return {
      eyebrow: "the boys chat",
      line: `you're entering a group chat with ${name} and two of his guys. ${name}'s about to bring up a situation he's stuck on. you're all weighing in.`,
    };
  }
  if (mode.id === "group_mixed") {
    return {
      eyebrow: "guys and girls",
      line: `you're entering a group chat with ${name} and a few of his friends — guys and girls. ${name} needs a read on something. different perspectives in the room.`,
    };
  }
  return {
    eyebrow: "just you and him",
    line: `${name}'s about to text you about something he can't figure out. your job: help him think it through.`,
  };
}

export function Briefing({
  friend,
  mode,
  onContinue,
}: {
  friend: Friend;
  mode: Mode;
  onContinue: (firstTurn: Promise<AdvisePayload>) => void;
}) {
  const { eyebrow, line } = useMemo(() => briefingCopy(friend, mode), [friend, mode]);
  const [ready, setReady] = useState(false);
  const promiseRef = useRef<Promise<AdvisePayload> | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    startedAtRef.current = Date.now();
    track("briefing_viewed", { friend_id: friend.id, mode_id: mode.id });
    // Kick off the prefetch immediately so the first message is ready by the
    // time the user taps "got it".
    promiseRef.current = prefetchFirstTurn(friend, mode).catch((e) => {
      console.error("prefetch failed", e);
      // Re-throw inside the promise so GameScreen can fall back to a fresh call.
      throw e;
    });
    // Minimum read time so it doesn't feel skippable in 0.2s
    const t = window.setTimeout(() => setReady(true), 900);
    return () => window.clearTimeout(t);
  }, [friend, mode]);

  function handleContinue() {
    if (!ready || !promiseRef.current) return;
    track("briefing_continue_clicked", {
      friend_id: friend.id,
      mode_id: mode.id,
      dwell_ms: Date.now() - startedAtRef.current,
    });
    onContinue(promiseRef.current);
  }

  return (
    <div className="relative min-h-[100dvh] w-full bg-background flex items-center justify-center px-6 grain overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--primary)/0.18,transparent_60%)] pointer-events-none" />
      <div className="relative w-full max-w-[400px] flex flex-col items-center text-center animate-float-in">
        <div className="text-[11px] uppercase tracking-[0.3em] text-primary/80 mb-6">
          {eyebrow}
        </div>
        <p className="display text-[24px] leading-[1.3] font-bold text-balance text-foreground">
          {line}
        </p>
        <button
          onClick={handleContinue}
          disabled={!ready}
          className="mt-12 w-full h-13 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold tracking-tight transition-all disabled:opacity-40 active:scale-[0.98]"
        >
          {ready ? "got it" : "..."}
        </button>
      </div>
    </div>
  );
}
