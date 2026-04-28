import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Friend } from "@/components/game/friends";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

type Props = {
  friend: Friend;
  transcript: string;
  onPlayAgain: () => void;
  onSwitchFriend: () => void;
};

export function EndCard({ friend, transcript, onPlayAgain, onSwitchFriend }: Props) {
  const [recap, setRecap] = useState<string | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [handoffLoading, setHandoffLoading] = useState(false);

  useEffect(() => {
    track("end_card_viewed", { friend_id: friend.id, friend_name: friend.name });
  }, [friend.id, friend.name]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("advise", {
          body: { mode: "recap", transcript, friendContext: friend.context },
        });
        if (error) throw error;
        if (cancelled) return;
        setRecap(data?.recap ?? "the conversation ended.");
        setQuestion(data?.question ?? "what's actually going on under the surface here?");
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        setRecap("the conversation ended.");
        setQuestion("what's actually going on under the surface here?");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [transcript, friend.context]);

  async function handoffToIto() {
    if (handoffLoading) return;
    track("handoff_clicked", { source: "end_card", friend_id: friend.id });
    setHandoffLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("advise", {
        body: {
          mode: "handoff",
          transcript,
          friendContext: friend.context,
          friendName: friend.name,
        },
      });
      if (error) throw error;
      const situation: string =
        data?.situation ||
        `${friend.name.toLowerCase()} is working through something and wants to think it through.`;
      window.location.href = `https://isthisok.app/check-in?situation=${encodeURIComponent(situation)}`;
    } catch (e) {
      console.error(e);
      window.location.href = "https://isthisok.app/check-in";
    }
  }

  return (
    <div className="relative min-h-[100dvh] w-full bg-background flex items-stretch sm:items-center justify-center sm:py-6 grain overflow-hidden">
      {/* Ambient amber-leaning glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-[var(--ito)]/20 blur-[110px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-primary/15 blur-[100px] pointer-events-none" />

      <div className="relative w-full sm:max-w-[400px] flex flex-col px-6 py-10 animate-float-in">
        <div className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-8">
          end of round
        </div>

        <RecapFirstLayout
          friend={friend}
          recap={recap}
          question={question}
          loading={loading}
        />

        <div className="mt-auto pt-10 space-y-3">
          <button
            onClick={handoffToIto}
            disabled={handoffLoading || loading}
            className="w-full h-13 py-3.5 rounded-2xl bg-[var(--ito)]/15 border border-[var(--ito)]/40 text-[var(--ito)] font-bold tracking-tight active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {handoffLoading ? "one sec..." : "want to keep talking this through?"}
          </button>
          <button
            onClick={onPlayAgain}
            className="w-full h-13 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold tracking-tight active:scale-[0.98] transition-transform"
          >
            play again with {friend.name.toLowerCase()}
          </button>
          <button
            onClick={onSwitchFriend}
            className="w-full h-12 rounded-2xl bg-surface text-foreground/80 font-semibold tracking-tight active:scale-[0.98] transition-transform border border-white/[0.06]"
          >
            switch friends
          </button>
        </div>
      </div>
    </div>
  );
}

function RecapFirstLayout({
  friend,
  recap,
  question,
  loading,
}: {
  friend: Friend;
  recap: string | null;
  question: string | null;
  loading: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-12 h-12 rounded-full overflow-hidden ring-1 ring-white/10"
          style={{ boxShadow: `0 0 0 1.5px var(--${friend.accent})` }}
        >
          <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
        </div>
        <div>
          <div className="text-[15px] font-semibold lowercase">{friend.name}</div>
          <div className="text-[12px] text-muted-foreground lowercase">went offline</div>
        </div>
      </div>

      <p
        className={cn(
          "text-[17px] leading-[1.45] text-foreground/95 text-balance",
          loading && "opacity-40",
        )}
      >
        {loading ? "..." : recap}
      </p>

      <div className="mt-8 pt-8 border-t border-white/[0.06]">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
          worth sitting with
        </div>
        <p
          className={cn(
            "display text-[22px] leading-[1.25] font-semibold text-balance",
            loading && "opacity-40",
          )}
        >
          {loading ? "..." : question}
        </p>
      </div>
    </>
  );
}
