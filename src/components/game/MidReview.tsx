import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Friend } from "@/components/game/friends";
import type { Mode } from "@/components/game/modes";
import { track } from "@/lib/analytics";
import { itoUrl } from "@/lib/ito";

type Props = {
  friend: Friend;
  mode: Mode;
  transcript: string;
  reviewIndex?: 1 | 2;
  previousObservation?: string | null;
  onObservation?: (observation: string) => void;
  onContinue: () => void;
};

export function MidReview({
  friend,
  mode,
  transcript,
  reviewIndex = 1,
  previousObservation = null,
  onObservation,
  onContinue,
}: Props) {
  const [observation, setObservation] = useState<string | null>(null);
  const [kind, setKind] = useState<"skipped" | "dropped" | "positive" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    track("mid_review_viewed", {
      friend_id: friend.id,
      friend_name: friend.name,
      review_index: reviewIndex,
    });
  }, [friend.id, friend.name, reviewIndex]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("advise", {
          body: {
            mode: "review",
            transcript,
            friendName: friend.name,
            friendContext: friend.context,
            sessionMode: mode.id,
            modeDirective: mode.promptDirective,
            reviewIndex,
            previousObservation,
          },
        });
        if (error) throw error;
        if (cancelled) return;
        const obs =
          data?.observation ??
          `something in what ${friend.name.toLowerCase()} said is still sitting there unaddressed.`;
        setObservation(obs);
        setKind(data?.kind ?? "skipped");
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        setObservation(
          `something in what ${friend.name.toLowerCase()} said is still sitting there unaddressed.`,
        );
        setKind("skipped");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally only run once per mount. `previousObservation` and `transcript`
    // are captured at mount time — re-running the fetch when the parent updates
    // them mid-render causes the observation to swap to a different generated
    // option ("most players miss that" → "most people would've brushed past
    // that…"), making the card look like it's cycling through variants.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleKeepGoing() {
    track("mid_review_continue_clicked", {
      friend_id: friend.id,
      kind,
    });
    // Hand the observation up to the parent now (not during the fetch) so the
    // second review can build on it without re-triggering this component's
    // effect mid-display.
    if (observation) onObservation?.(observation);
    onContinue();
  }

  function handleHandoff() {
    track("mid_review_handoff_clicked", {
      friend_id: friend.id,
      kind,
      review_index: reviewIndex,
    });
    track("ito_link_clicked", {
      source: reviewIndex === 2 ? "mid_review_2" : "mid_review_1",
      friend_id: friend.id,
      kind,
    });
    window.open(
      itoUrl({
        surface: reviewIndex === 2 ? "mid_review_2" : "mid_review_1",
        friendId: friend.id,
        modeId: mode.id,
      }),
      "_self",
    );
  }

  // On review #2, when the AI flagged the player as skipping/dropping the
  // hard part, the moment is unusually high-conviction for ito. Sharpen the
  // CTA copy so it reads as a direct offer, not a footer afterthought.
  const showSharperItoCta =
    reviewIndex === 2 && (kind === "skipped" || kind === "dropped");
  const itoCtaLabel = showSharperItoCta
    ? "if a real version of this is sitting with you →"
    : "have your own situation to talk through?";

  return (
    <div className="absolute inset-0 z-30 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full sm:max-w-[360px] mx-2 mb-2 sm:mb-0 rounded-[28px] p-6 pt-7 animate-slide-up"
        style={{
          background:
            "linear-gradient(160deg, color-mix(in oklab, var(--ito) 14%, var(--surface)) 0%, var(--surface) 70%)",
          border: "1px solid color-mix(in oklab, var(--ito) 35%, transparent)",
          boxShadow:
            "0 24px 60px -20px color-mix(in oklab, var(--ito) 40%, transparent), 0 0 0 1px color-mix(in oklab, var(--ito) 18%, transparent) inset",
        }}
      >
        {/* Amber tag */}
        <div
          className="text-[10px] uppercase tracking-[0.3em] mb-4 font-semibold"
          style={{ color: "var(--ito)" }}
        >
          a beat
        </div>

        {/* Observation */}
        <p
          className="text-[17px] leading-[1.45] text-foreground/95 text-balance min-h-[60px]"
          aria-live="polite"
        >
          {loading ? (
            <span className="block space-y-2">
              <span className="block h-4 rounded-md bg-foreground/10 animate-pulse w-[92%]" />
              <span className="block h-4 rounded-md bg-foreground/10 animate-pulse w-[78%]" />
              <span className="block h-4 rounded-md bg-foreground/10 animate-pulse w-[55%]" />
            </span>
          ) : (
            observation
          )}
        </p>

        {/* Buttons */}
        <div className="mt-7 space-y-2.5">
          <button
            onClick={handleKeepGoing}
            disabled={loading}
            className="w-full h-12 rounded-2xl font-bold tracking-tight active:scale-[0.98] transition-transform disabled:opacity-50"
            style={{
              background: "var(--ito)",
              color: "var(--background)",
              boxShadow:
                "0 14px 32px -14px color-mix(in oklab, var(--ito) 70%, transparent)",
            }}
          >
            keep going
          </button>
          <button
            onClick={handleHandoff}
            disabled={loading}
            className="w-full h-12 rounded-2xl font-medium tracking-tight active:scale-[0.98] transition-transform disabled:opacity-50"
            style={{
              background: "transparent",
              color: "var(--ito)",
              border: "1px solid color-mix(in oklab, var(--ito) 45%, transparent)",
            }}
          >
            have your own situation to talk through?
          </button>
        </div>
      </div>
    </div>
  );
}
