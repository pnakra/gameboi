import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type Mode } from "@/components/game/modes";
import { type Friend } from "@/components/game/friends";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function MidReview({
  friend,
  mode,
  transcript,
  exchange,
  onContinue,
}: {
  friend: Friend;
  mode: Mode;
  transcript: string;
  exchange: number;
  onContinue: () => void;
}) {
  const [review, setReview] = useState<string>("");
  const [question, setQuestion] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const startedRef = useRef(false);
  const startMsRef = useRef(Date.now());

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    track("mid_review_viewed", {
      friend_id: friend.id,
      mode_id: mode.id,
      exchange,
    });

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("advise", {
          body: {
            mode: "review",
            sessionMode: mode.id,
            modeDirective: mode.promptDirective,
            friendContext: friend.context,
            transcript,
          },
        });
        if (error) throw error;
        setReview(String(data?.review || "").trim());
        setQuestion(String(data?.question || "").trim());
      } catch (e) {
        console.error(e);
        setErrored(true);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleContinue() {
    track("mid_review_continued", {
      friend_id: friend.id,
      mode_id: mode.id,
      exchange,
      had_review: !!review,
      dwell_ms: Date.now() - startMsRef.current,
    });
    onContinue();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/85 backdrop-blur-md p-5 animate-fade-in">
      <div
        className={cn(
          "relative w-full max-w-[420px] rounded-3xl border border-white/10",
          "bg-surface/95 px-6 pt-6 pb-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]",
        )}
      >
        <div
          className="absolute -inset-12 -z-10 opacity-40 blur-3xl pointer-events-none rounded-full"
          style={{ background: `radial-gradient(closest-side, var(--${friend.accent}) 0%, transparent 70%)` }}
        />
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/80 font-semibold mb-2">
          quick check-in
        </div>
        <h2 className="text-[20px] leading-tight font-bold tracking-tight mb-4 lowercase">
          where you at right now
        </h2>

        {loading && (
          <div className="space-y-2">
            <div className="h-3 rounded bg-white/[0.06] animate-pulse w-[90%]" />
            <div className="h-3 rounded bg-white/[0.06] animate-pulse w-[78%]" />
            <div className="h-3 rounded bg-white/[0.06] animate-pulse w-[60%]" />
          </div>
        )}

        {!loading && !errored && (
          <div className="space-y-3">
            {review && (
              <p className="text-[14.5px] leading-[1.55] text-foreground/90 lowercase">
                {review}
              </p>
            )}
            {question && (
              <p
                className="text-[14.5px] leading-[1.55] italic text-foreground/95 lowercase"
                style={{ color: `var(--${friend.accent})` }}
              >
                {question}
              </p>
            )}
          </div>
        )}

        {!loading && errored && (
          <p className="text-[14px] leading-[1.55] text-muted-foreground/90 lowercase">
            take a beat. notice what you're feeling. then keep going.
          </p>
        )}

        <button
          onClick={handleContinue}
          disabled={loading}
          className={cn(
            "mt-6 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold tracking-tight",
            "active:scale-[0.98] transition-transform disabled:opacity-50",
          )}
        >
          keep going
        </button>
      </div>
    </div>
  );
}
