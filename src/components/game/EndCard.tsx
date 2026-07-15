import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Friend } from "@/components/game/friends";
import type { Mode } from "@/components/game/modes";
import type { Vibe } from "@/components/game/AdviceCard";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { itoUrl } from "@/lib/ito";

const VIBE_LABEL: Record<Vibe, string> = {
  direct: "DIRECT",
  chill: "CHILL",
  bold: "BOLD",
  soft: "SOFT",
  chaos: "CHAOS",
  ito: "REAL TALK",
  ito_app: "REAL TALK",
};

const VIBE_TINT_VAR: Record<Vibe, string> = {
  direct: "--card-direct",
  chill: "--card-chill",
  bold: "--card-bold",
  soft: "--card-soft",
  chaos: "--card-chaos",
  ito: "--card-ito",
  ito_app: "--card-ito",
};

/** e.g. "mostly CHILL · 2 REAL TALK moves" — falls back gracefully at low N. */
function summarizeToneMix(counts: Partial<Record<Vibe, number>>): string | null {
  const entries = (Object.entries(counts) as [Vibe, number][]).filter(([, n]) => n > 0);
  if (entries.length === 0) return null;
  const total = entries.reduce((s, [, n]) => s + n, 0);
  entries.sort((a, b) => b[1] - a[1]);
  const [topVibe, topN] = entries[0];
  const topLabel = VIBE_LABEL[topVibe];
  const parts: string[] = [];
  // Only call it "mostly X" if that tone is a clear plurality.
  if (topN / total >= 0.5 && total >= 2) parts.push(`mostly ${topLabel}`);
  else parts.push(`${topN} ${topLabel}`);
  // Surface REAL TALK separately if it's not already the headline.
  const rt = (counts.ito ?? 0) + (counts.ito_app ?? 0);
  if (rt > 0 && topVibe !== "ito" && topVibe !== "ito_app") {
    parts.push(`${rt} REAL TALK`);
  }
  return parts.join(" · ");
}


const SHARE_BASE = "https://gameboi.online";

function shareUrlFor(friendId: string, modeId?: string): string {
  const params = new URLSearchParams({
    friend: friendId,
    utm_source: "share",
    utm_medium: "end_card",
    utm_campaign: "organic_share",
  });
  if (modeId) params.set("mode", modeId);
  return `${SHARE_BASE}/?${params.toString()}`;
}

type Props = {
  friend: Friend;
  mode: Mode;
  transcript: string;
  toneCounts?: Partial<Record<Vibe, number>>;
  onPlayAgain: () => void;
  onSwitchFriend: () => void;
};

export function EndCard({ friend, mode, transcript, toneCounts, onPlayAgain, onSwitchFriend }: Props) {
  const [recap, setRecap] = useState<string | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");

  const toneMix = useMemo(() => summarizeToneMix(toneCounts ?? {}), [toneCounts]);
  const toneChips = useMemo(() => {
    const entries = Object.entries(toneCounts ?? {}) as [Vibe, number][];
    return entries.filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  }, [toneCounts]);

  useEffect(() => {
    track("end_card_viewed", {
      friend_id: friend.id,
      friend_name: friend.name,
      mode_id: mode.id,
    });
  }, [friend.id, friend.name, mode.id]);

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

  function handoffToIto() {
    if (handoffLoading) return;
    track("handoff_clicked", { source: "end_card", friend_id: friend.id, mode_id: mode.id });
    track("ito_link_clicked", { source: "end_card", friend_id: friend.id, mode_id: mode.id });
    setHandoffLoading(true);
    const url = itoUrl({ surface: "end_card", friendId: friend.id, modeId: mode.id });
    const w = window.open(url, "_blank", "noopener,noreferrer");
    // Fall back to same-tab nav if the popup was blocked (rare in webviews).
    if (!w) window.location.href = url;
    setHandoffLoading(false);
  }

  async function handleShare() {
    const url = shareUrlFor(friend.id, mode.id);
    const shareText = question
      ? `${question}\n\nplayed this on gameboi — ${friend.name}'s scenario:`
      : `played this scenario w/ ${friend.name} on gameboi:`;
    track("share_clicked", { source: "end_card", friend_id: friend.id, mode_id: mode.id, has_question: !!question });

    const nav = typeof navigator !== "undefined" ? navigator : null;
    if (nav && typeof nav.share === "function") {
      try {
        await nav.share({ title: "gameboi", text: shareText, url });
        track("share_completed", { source: "end_card", friend_id: friend.id, mode_id: mode.id, method: "web_share" });
        return;
      } catch (e) {
        const name = (e as { name?: string })?.name;
        if (name === "AbortError") {
          track("share_cancelled", { source: "end_card", friend_id: friend.id, mode_id: mode.id, method: "web_share" });
          return;
        }
        // fall through to clipboard
      }
    }
    try {
      await nav?.clipboard?.writeText(`${shareText} ${url}`);
      setShareState("copied");
      track("share_completed", { source: "end_card", friend_id: friend.id, mode_id: mode.id, method: "clipboard" });
      window.setTimeout(() => setShareState("idle"), 1800);
    } catch {
      track("share_failed", { source: "end_card", friend_id: friend.id, mode_id: mode.id });
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

        <div className="mt-auto pt-10">
          <p className="text-[13px] leading-[1.5] text-foreground/70 lowercase mb-3 text-balance">
            got a real version of this sitting w/ you? isthisok is a private 2-min check-in. anonymous, no account, no one on the other end — you write it, it reflects it back.
          </p>
          <button
            onClick={handoffToIto}
            disabled={handoffLoading || loading}
            className="w-full h-[60px] py-4 rounded-2xl bg-[var(--ito)] text-background font-bold text-[16px] tracking-tight active:scale-[0.98] transition-transform disabled:opacity-50 shadow-[0_18px_40px_-18px_var(--ito)]"
          >
            {handoffLoading ? "one sec..." : "try a check-in →"}
          </button>
          <button
            onClick={handleShare}
            disabled={loading}
            className="mt-3 w-full h-[48px] grid place-items-center rounded-2xl border border-foreground/15 text-foreground/85 font-medium text-[14px] tracking-tight active:scale-[0.98] transition-transform disabled:opacity-40 lowercase"
          >
            {shareState === "copied" ? "link copied ✓" : "send this to a friend"}
          </button>
          <div className="flex items-center justify-center gap-5 pt-5 text-[13px] text-muted-foreground/70 lowercase">
            <button
              onClick={() => {
                track("play_again_clicked", { friend_id: friend.id });
                onPlayAgain();
              }}
              className="active:opacity-60 transition-opacity"
            >
              play again
            </button>
            <span className="text-foreground/15">·</span>
            <button
              onClick={() => {
                track("switch_friend_clicked", { friend_id: friend.id });
                onSwitchFriend();
              }}
              className="active:opacity-60 transition-opacity"
            >
              switch friends
            </button>
          </div>
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
        )}
        aria-live="polite"
      >
        {loading ? (
          <span className="block space-y-2">
            <span className="block h-4 rounded-md bg-foreground/10 animate-pulse w-[92%]" />
            <span className="block h-4 rounded-md bg-foreground/10 animate-pulse w-[88%]" />
            <span className="block h-4 rounded-md bg-foreground/10 animate-pulse w-[70%]" />
            <span className="block h-4 rounded-md bg-foreground/10 animate-pulse w-[80%]" />
            <span className="block text-[12px] text-muted-foreground/80 lowercase pt-2 not-italic">
              putting it together…
            </span>
          </span>
        ) : (
          recap
        )}
      </p>

      <div className="mt-8 pt-8 border-t border-white/[0.06]">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
          worth sitting with
        </div>
        {loading ? (
          <div className="space-y-2.5">
            <div className="h-5 rounded-md bg-foreground/10 animate-pulse w-[90%]" />
            <div className="h-5 rounded-md bg-foreground/10 animate-pulse w-[75%]" />
          </div>
        ) : (
          <p className="display text-[22px] leading-[1.25] font-semibold text-balance">
            {question}
          </p>
        )}
      </div>
    </>
  );
}
