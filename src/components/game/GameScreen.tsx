import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bubble, TypingBubble } from "@/components/game/Bubble";
import { AdviceCard, type Vibe } from "@/components/game/AdviceCard";
import { MidReview } from "@/components/game/MidReview";
import { type Friend, markUnlocked } from "@/components/game/friends";
import type { Mode } from "@/components/game/modes";
import { avatarFor, type Gender } from "@/components/game/avatars";
import { cn } from "@/lib/utils";
import { track, logExchange, isDeepLinkSession } from "@/lib/analytics";

type RosterEntry = { name: string; gender: Gender; avatar: string; isMain?: boolean };

type Card = { id: string; label: string; say: string; vibe: Vibe; entering?: boolean };
type ChatItem =
  | { kind: "them"; text: string; ts: number; pop?: boolean; speaker?: string; transcriptSpeaker?: string }
  | { kind: "you"; text: string; ts: number; pop?: boolean }
  | { kind: "stamp"; text: string };
type ApiTurn = { role: "user" | "assistant"; content: string };

const MIN_EXCHANGES = 4;
const MAX_EXCHANGES = 8;
const MID_REVIEW_EXCHANGES = [4, 6] as const;
const FREETEXT_FROM = 3;
const HAND_SIZE = 3;
const WILDCARD_ID = "__wildcard_ito__";
const ITO_CHECKIN_URL = "https://gameboi.isthisok.app/check-in";

// Wildcard advice: each entry pairs the LABEL (what the card says — advice
// about the friend) with the SAY (what the player actually texts the friend).
const WILDCARD_CARDS: { label: string; say: string }[] = [
  {
    label: "tell him to just sit with this one",
    say: "honestly just sit with it for a bit before u do anything",
  },
  {
    label: "maybe he needs to think it through more",
    say: "i think u need to think this through a little more man",
  },
  {
    label: "honestly might be worth slowing down on this",
    say: "slow down a sec. doesn't have to be figured out tonight",
  },
  {
    label: "tell him to just take a beat before replying",
    say: "take a beat before u reply. no rush on this",
  },
];

// (Real-talk wildcard no longer ends the round, so it has no closer pool.)

// (isthisok.app card removed — surface the tool via the persistent footer link instead.)

function pickFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export type EndPayload = {
  transcript: string;
};

export function GameScreen({
  friend,
  mode,
  onExit,
  onEnd,
  prefetchedFirstTurn,
}: {
  friend: Friend;
  mode: Mode;
  onExit: () => void;
  onEnd: (payload: EndPayload) => void;
  prefetchedFirstTurn?: Promise<any> | null;
}) {
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [hand, setHand] = useState<Card[]>([]);
  const [history, setHistory] = useState<ApiTurn[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchange, setExchange] = useState(1);
  const [isFinished, setIsFinished] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [playingCardId, setPlayingCardId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [showMidReview, setShowMidReview] = useState(false);
  const [pendingHand, setPendingHand] = useState<Card[] | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [reviewIndex, setReviewIndex] = useState<1 | 2>(1);
  const [previousObservation, setPreviousObservation] = useState<string | null>(null);
  const midReviewsShownRef = useRef<Set<number>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const chatRef = useRef<ChatItem[]>([]);
  useEffect(() => {
    chatRef.current = chat;
  }, [chat]);

  // Deep-link instrumentation refs
  const roundStartMsRef = useRef<number>(0);
  const firstMessageTrackedRef = useRef(false);
  const friendMessagesSeenRef = useRef(0);
  const exitTrackedRef = useRef(false);
  const itoViewedRef = useRef(false);
  const itoLinkRef = useRef<HTMLAnchorElement>(null);

  const openTime = useMemo(() => formatTime(new Date()), []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    roundStartMsRef.current = Date.now();
    track("round_started", {
      friend_id: friend.id,
      friend_name: friend.name,
      is_deep_link: isDeepLinkSession(),
    });
    setChat([{ kind: "stamp", text: `today ${openTime}` }]);
    void next({ start: true, forExchange: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track early-exit signals (tab close, backgrounded, navigated away) so we
  // can see how many friend messages a deep-linked user actually read before
  // bouncing. Fires at most once per round.
  useEffect(() => {
    function trackExit(reason: string) {
      if (exitTrackedRef.current) return;
      exitTrackedRef.current = true;
      const elapsed = roundStartMsRef.current ? Date.now() - roundStartMsRef.current : 0;
      track("round_exited_early", {
        reason,
        friend_id: friend.id,
        is_deep_link: isDeepLinkSession(),
        messages_read_before_exit: friendMessagesSeenRef.current,
        ito_link_viewed: itoViewedRef.current,
        finished: isFinished,
        elapsed_ms: elapsed,
        exchange,
      });
    }
    const onVis = () => {
      if (document.visibilityState === "hidden") trackExit("visibility_hidden");
    };
    const onPageHide = () => trackExit("pagehide");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [friend.id, exchange, isFinished]);

  // Fire once when the ito link actually scrolls into view — separates
  // "saw the CTA but didn't tap" from "never saw it" for deep-linked sessions.
  useEffect(() => {
    const el = itoLinkRef.current;
    if (!el || itoViewedRef.current || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !itoViewedRef.current) {
            itoViewedRef.current = true;
            track("ito_link_viewed", {
              friend_id: friend.id,
              exchange,
              is_deep_link: isDeepLinkSession(),
              messages_read_when_viewed: friendMessagesSeenRef.current,
            });
            obs.disconnect();
          }
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [friend.id, exchange, isFinished]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat, loading]);

  /** Stream new cards into the hand one-by-one (deal animation). */
  async function dealCards(newCards: Card[]) {
    // Clear any leftover (e.g. after first turn there is nothing to clear)
    setHand([]);
    for (let i = 0; i < newCards.length; i++) {
      await new Promise((r) => setTimeout(r, 90));
      setHand((h) => [...h, { ...newCards[i], entering: true }]);
    }
    // After entry animation, drop the entering flag
    window.setTimeout(() => {
      setHand((h) => h.map((c) => ({ ...c, entering: false })));
    }, 600);
  }

  async function next(opts: {
    start?: boolean;
    chosenReply?: string;
    replySource?: "card" | "freetext";
    forExchange: number;
  }) {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("advise", {
        body: {
          start: opts.start ?? false,
          chosenReply: opts.chosenReply,
          history,
          friendContext: friend.context,
          friendName: friend.name,
          mode: mode.id,
          modeDirective: mode.promptDirective,
          exchange: opts.forExchange,
        },
      });
      if (error) throw error;

      const friendMsgs: string[] = data.friend ?? [];
      const isGroupMode = mode.id === "group_guys" || mode.id === "group_mixed";
      const mainName = friend.name.toLowerCase();

      // Merge any returned roster (group modes) into our session-wide roster.
      // Always make sure the main friend is in the roster as `isMain` with their avatar.
      if (isGroupMode) {
        const incoming: { name: string; gender: "m" | "f" }[] = Array.isArray(data.roster)
          ? data.roster
          : [];
        setRoster((prev) => {
          const map = new Map<string, RosterEntry>();
          // seed with main friend
          map.set(mainName, {
            name: mainName,
            gender: "m",
            avatar: friend.avatar,
            isMain: true,
          });
          for (const r of prev) map.set(r.name, r);
          for (const r of incoming) {
            const name = r.name.toLowerCase();
            if (!name) continue;
            if (name === mainName) continue; // never overwrite main
            if (!map.has(name)) {
              const gender: Gender = r.gender === "f" ? "f" : "m";
              map.set(name, { name, gender, avatar: avatarFor(name, gender) });
            }
          }
          return Array.from(map.values());
        });
      }

      // Stagger reveal — first message has a "thinking" pause, subsequent ones are quicker
      for (let i = 0; i < friendMsgs.length; i++) {
        await new Promise((r) => setTimeout(r, i === 0 ? 220 : 480));
        const ts = Date.now();
        const parsed = parseSpeaker(friendMsgs[i]);
        // In group modes, surface the speaker label for EVERY voice — including
        // the main friend — so it's clear who's talking. The Bubble component
        // only renders the label on the first bubble of a group anyway.
        const visibleSpeaker =
          isGroupMode
            ? (parsed.speaker?.toLowerCase() ?? mainName)
            : undefined;
        // Transcript speaker — kept on the item so buildTranscript can attribute lines accurately
        // even when no UI label is shown (e.g. solo modes).
        const transcriptSpeaker = isGroupMode
          ? (parsed.speaker?.toLowerCase() ?? mainName)
          : undefined;
        setChat((c) => [
          ...c,
          {
            kind: "them",
            text: parsed.text,
            ts,
            pop: true,
            speaker: visibleSpeaker,
            transcriptSpeaker,
          } as ChatItem,
        ]);
        friendMessagesSeenRef.current += 1;
        if (!firstMessageTrackedRef.current) {
          firstMessageTrackedRef.current = true;
          track("first_message_rendered", {
            friend_id: friend.id,
            is_deep_link: isDeepLinkSession(),
            time_to_first_message_ms: Date.now() - roundStartMsRef.current,
          });
        }
      }

      setHistory((h) => [
        ...h,
        ...(opts.chosenReply
          ? [{ role: "user" as const, content: `The player texted: "${opts.chosenReply}".` }]
          : opts.start
          ? [{ role: "user" as const, content: "Open the convo." }]
          : []),
        {
          role: "assistant",
          content:
            data.assistantRaw ?? JSON.stringify({ friend: friendMsgs, cards: data.cards }),
        },
      ]);

      // Persist this exchange (input + output) for the round.
      logExchange({
        friend_id: friend.id,
        friend_name: friend.name,
        exchange_number: opts.forExchange,
        phase: data.phase,
        chosen_reply: opts.chosenReply ?? null,
        reply_source: opts.replySource ?? null,
        friend_messages: friendMsgs,
        cards: data.cards ?? [],
        is_final: !!data.isFinal,
        raw_response: data.assistantRaw,
      });

      setLoading(false);

      if (data.isFinal) {
        setIsFinished(true);
        setHand([]);
        track("round_ended", {
          friend_id: friend.id,
          friend_name: friend.name,
          exchanges: opts.forExchange,
        });
        markUnlocked();
        // No auto-advance — user taps "continue" when they're ready (see button below).
      } else {
        const incoming: Card[] = (data.cards ?? []).slice(0, HAND_SIZE).map((c: any) => ({
          id: c.id,
          label: c.label,
          // Fallback to label if the model didn't return a "say" (defensive — the
          // edge function already does this, but belt-and-suspenders for old caches).
          say: c.say || c.label,
          vibe: c.vibe,
        }));
        // Append the "real talk" wildcard as the final card.
        const wild = pickFrom(WILDCARD_CARDS);
        incoming.push({
          id: `${WILDCARD_ID}-${opts.forExchange}`,
          label: wild.label,
          say: wild.say,
          vibe: "ito",
        });
        // Mid-round review beats: trigger when we're about to deal cards for
        // exchange 4 (first review) and exchange 6 (second review). Stash the
        // hand so it deals once the player chooses "keep going".
        const isReviewExchange = (MID_REVIEW_EXCHANGES as readonly number[]).includes(opts.forExchange);
        if (isReviewExchange && !midReviewsShownRef.current.has(opts.forExchange)) {
          midReviewsShownRef.current.add(opts.forExchange);
          setReviewIndex(opts.forExchange === MID_REVIEW_EXCHANGES[0] ? 1 : 2);
          setPendingHand(incoming);
          setHand([]);
          setShowMidReview(true);
        } else {
          await dealCards(incoming);
        }
      }
    } catch (e) {
      console.error(e);
      track("advise_error", { message: e instanceof Error ? e.message : "unknown" });
      setChat((c) => [...c, { kind: "them", text: "ugh wifi just died one sec", ts: Date.now(), pop: true }]);
      setLoading(false);
    }
  }

  function pickCard(c: Card) {
    if (loading || isFinished || playingCardId) return;

    if (c.id.startsWith(WILDCARD_ID)) {
      pickWildcard(c);
      return;
    }

    setActiveCardId(null);
    setPlayingCardId(c.id);
    track("card_played", {
      friend_id: friend.id,
      exchange,
      vibe: c.vibe,
      label: c.label,
    });

    // After the card's fly-up animation completes, push the bubble + clear hand + request next exchange
    window.setTimeout(() => {
      const ts = Date.now();
      setChat((prev) => [...prev, { kind: "you", text: c.say, ts, pop: true }]);
      setHand([]);
      setPlayingCardId(null);

      const nextEx = exchange + 1;
      setExchange(nextEx);
      void next({ chosenReply: c.say, replySource: "card", forExchange: nextEx });
    }, 480);
  }

  function pickWildcard(c: Card) {
    setActiveCardId(null);
    setPlayingCardId(c.id);
    track("wildcard_played", {
      friend_id: friend.id,
      exchange,
      label: c.label,
    });

    // Real-talk now plays like a normal advice card: push the bubble, clear hand,
    // and request the next exchange so the friend reacts in voice and the arc continues.
    window.setTimeout(() => {
      const ts = Date.now();
      setChat((prev) => [...prev, { kind: "you", text: c.say, ts, pop: true }]);
      setHand([]);
      setPlayingCardId(null);

      const nextEx = exchange + 1;
      setExchange(nextEx);
      void next({ chosenReply: c.say, replySource: "card", forExchange: nextEx });
    }, 480);
  }

  function sendDraft() {
    const text = draft.trim();
    if (!text || loading || isFinished || playingCardId) return;
    track("freetext_sent", {
      friend_id: friend.id,
      exchange,
      length: text.length,
    });
    setDraft("");
    setActiveCardId(null);
    const ts = Date.now();
    setChat((prev) => [...prev, { kind: "you", text, ts, pop: true }]);
    setHand([]);
    const nextEx = exchange + 1;
    setExchange(nextEx);
    void next({ chosenReply: text, replySource: "freetext", forExchange: nextEx });
  }

  function handoffToIto() {
    track("handoff_clicked", {
      source: "game_screen",
      friend_id: friend.id,
      exchange,
      finished: isFinished,
    });
    window.location.href = "https://gameboi.isthisok.app/check-in";
  }

  const groupedChat = useMemo(() => groupBubbles(chat), [chat]);

  return (
    <div className="relative min-h-[100dvh] w-full bg-background flex items-stretch sm:items-center justify-center sm:py-6">
      <div
        className={cn(
          "relative w-full sm:max-w-[400px] flex flex-col",
          "sm:rounded-[44px] sm:border sm:border-white/10 sm:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]",
          "sm:bg-black sm:p-[10px] sm:h-[820px] sm:max-h-[90dvh]",
        )}
      >
        <div
          className={cn(
            "relative flex flex-col flex-1 overflow-hidden bg-background",
            "sm:rounded-[36px]",
            "h-[100dvh] sm:h-auto",
          )}
        >
          {/* iOS status bar (decorative, desktop only) */}
          <div className="hidden sm:flex items-center justify-between px-7 pt-3 pb-1 text-[12px] font-semibold text-foreground/90 select-none">
            <span>{openTime}</span>
            <span className="absolute left-1/2 -translate-x-1/2 top-2 w-[110px] h-[28px] bg-black rounded-full" />
            <span className="flex items-center gap-1.5">
              <SignalIcon />
              <BatteryIcon />
            </span>
          </div>

          {/* Conversation header */}
          <header className="relative flex items-center px-3 pt-2 pb-3 border-b border-white/[0.06] bg-background min-h-[72px] shrink-0">
            <button
              onClick={() => {
                track("exit_clicked", { friend_id: friend.id, exchange, finished: isFinished });
                onExit();
              }}
              aria-label="Back"
              className="text-accent text-[26px] leading-none w-9 h-9 grid place-items-center -ml-1 active:opacity-60"
            >
              ‹
            </button>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 w-[260px] max-w-[calc(100%-88px)] pointer-events-none">
              {(() => {
                const isGroupMode = mode.id === "group_guys" || mode.id === "group_mixed";
                // Build display roster: main friend first, then any side characters in stable order.
                const displayRoster: RosterEntry[] = isGroupMode
                  ? (() => {
                      const main: RosterEntry = {
                        name: friend.name.toLowerCase(),
                        gender: "m",
                        avatar: friend.avatar,
                        isMain: true,
                      };
                      const others = roster.filter((r) => !r.isMain);
                      return [main, ...others];
                    })()
                  : [];

                if (isGroupMode && displayRoster.length > 1) {
                  return (
                    <>
                      <div className="flex items-center -space-x-2">
                        {displayRoster.slice(0, 4).map((r) => (
                          <div
                            key={r.name}
                            className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-background"
                            style={
                              r.isMain
                                ? { boxShadow: `0 0 0 1.5px var(--${friend.accent})` }
                                : undefined
                            }
                            title={r.name}
                          >
                            <img
                              src={r.avatar}
                              alt={r.name}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="text-[11px] text-foreground/85 lowercase truncate">
                        you + {displayRoster.length}
                      </div>
                    </>
                  );
                }

                return (
                  <>
                    <div
                      className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-white/10"
                      style={{ boxShadow: `0 0 0 1.5px var(--${friend.accent})` }}
                    >
                      <img
                        src={friend.avatar}
                        alt={friend.name}
                        width={72}
                        height={72}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-[11px] text-foreground/85 lowercase truncate">
                      {friend.name.toLowerCase()}
                    </div>
                  </>
                );
              })()}
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold truncate max-w-full">
                {mode.label}
              </div>
            </div>
            <div className="ml-auto text-[11px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
              {Math.min(exchange, MAX_EXCHANGES)}/{MAX_EXCHANGES}
            </div>
          </header>

          {/* Thread — sizes to its content so on short threads (early turns)
              the cards float right below the last bubble instead of being
              pushed to the bottom of the screen. Once the thread overflows
              the available space it scrolls and the cards stay anchored. */}
          <div
            ref={scrollRef}
            className="min-h-0 overflow-y-auto px-3 pt-3 pb-0"
            style={{ flex: "0 1 auto" }}
          >
            {groupedChat.map((item, i) => {
              if (item.kind === "stamp") {
                return (
                  <div
                    key={`s-${i}`}
                    className="text-center text-[11px] text-muted-foreground/70 my-3 font-semibold lowercase"
                  >
                    {item.text}
                  </div>
                );
              }
              return (
                <Bubble
                  key={`b-${i}`}
                  from={item.from}
                  tight={item.tight}
                  last={item.last}
                  pop={item.pop}
                  speaker={item.speaker}
                >
                  {item.text}
                </Bubble>
              );
            })}
            {loading && <TypingBubble />}
            {isFinished && !loading && <EndCap friendName={friend.name} />}
            <div className="h-3" />
          </div>

          {/* CARD HAND / CONTINUE — sits directly below the thread so on
              early turns it floats up to meet the last bubble. */}
          <div className="shrink-0 px-2 pt-2">
            {isFinished && (
              <div className="px-2 py-3 animate-fade-in">
                <button
                  onClick={() => {
                    track("continue_to_recap_clicked", {
                      friend_id: friend.id,
                      exchanges: exchange,
                    });
                    onEnd({ transcript: buildTranscript([...chatRef.current]) });
                  }}
                  className="w-full h-13 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold tracking-tight active:scale-[0.98] transition-transform"
                >
                  continue
                </button>
              </div>
            )}

            {!isFinished && (
              // Fanned hand of cards — used throughout the entire arc.
              <div
                className={cn(
                  "relative h-[200px] mx-auto",
                  "before:content-[''] before:absolute before:left-1/2 before:bottom-2 before:-translate-x-1/2",
                  "before:w-[340px] before:h-[40px] before:rounded-full before:bg-primary/10 before:blur-2xl before:pointer-events-none",
                )}
              >
                {hand.map((c, i) => {
                  const active = activeCardId === c.id && playingCardId == null;
                  const playing = playingCardId === c.id;
                  return (
                    <AdviceCard
                      key={c.id}
                      label={c.label}
                      vibe={c.vibe}
                      fanIndex={i}
                      fanTotal={hand.length}
                      active={active}
                      playing={playing}
                      entering={c.entering}
                      onClick={() => {
                        if (active) pickCard(c);
                        else setActiveCardId(c.id);
                      }}
                      disabled={loading || !!playingCardId}
                      style={{}}
                      {...{
                        onMouseEnter: () => !playingCardId && setActiveCardId(c.id),
                        onMouseLeave: () =>
                          activeCardId === c.id && setActiveCardId(null),
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* Tap-outside dismisses the preview on mobile */}
            {activeCardId && !playingCardId && (
              <div
                onClick={() => setActiveCardId(null)}
                className="fixed inset-0 z-20"
                aria-hidden
              />
            )}
          </div>

          {/* Bottom-anchored handoff link — mt-auto pins it to the bottom even
              when the cards have floated up to meet a short thread. */}
          <div className="shrink-0 mt-auto safe-bottom px-2">
            <a
              ref={itoLinkRef}
              href={ITO_CHECKIN_URL}
              onClick={() => {
                track("ito_link_clicked", {
                  source: "game_screen_inline",
                  friend_id: friend.id,
                  exchange,
                  is_deep_link: isDeepLinkSession(),
                  messages_read_before_click: friendMessagesSeenRef.current,
                  elapsed_ms: roundStartMsRef.current
                    ? Date.now() - roundStartMsRef.current
                    : 0,
                });
                track("handoff_clicked", {
                  source: "game_screen",
                  friend_id: friend.id,
                  exchange,
                  finished: isFinished,
                });
              }}
              className="flex items-center justify-center min-h-[44px] py-3 text-center text-[14px] text-[var(--ito)]/90 hover:text-[var(--ito)] lowercase tracking-tight underline underline-offset-4 decoration-[var(--ito)]/50 font-semibold"
            >
              have your own situation to talk through?
            </a>
          </div>

          {/* Mid-round review overlay — sits inside the phone frame, fades in
              over the thread, hides the cards, awaits "keep going". */}
          {showMidReview && (
            <MidReview
              friend={friend}
              mode={mode}
              transcript={buildTranscript([...chatRef.current])}
              reviewIndex={reviewIndex}
              previousObservation={previousObservation}
              onObservation={(obs) => setPreviousObservation(obs)}
              onContinue={() => {
                setShowMidReview(false);
                const stash = pendingHand;
                setPendingHand(null);
                if (stash) void dealCards(stash);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- input components ---------- */

function ComposeBar({
  value,
  onChange,
  onSend,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
}) {
  const canSend = value.trim().length > 0 && !disabled;
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1 min-h-[44px] rounded-[22px] bg-surface border border-white/[0.08] px-4 py-2.5 focus-within:border-white/20 transition-colors">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
          placeholder="iMessage"
          rows={1}
          className="w-full resize-none bg-transparent outline-none text-[15px] leading-[1.35] placeholder:text-muted-foreground/60 max-h-[120px]"
          style={{ fieldSizing: "content" } as React.CSSProperties}
        />
      </div>
      <button
        onClick={onSend}
        disabled={!canSend}
        aria-label="Send"
        className={cn(
          "shrink-0 w-10 h-10 rounded-full grid place-items-center transition-all",
          canSend
            ? "bg-primary text-primary-foreground active:scale-90"
            : "bg-surface text-muted-foreground/40 cursor-not-allowed",
        )}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 12h14M13 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}


/* ---------- helpers ---------- */

type GroupedItem =
  | { kind: "stamp"; text: string }
  | {
      kind: "bubble";
      from: "them" | "you";
      text: string;
      tight: boolean;
      last: boolean;
      pop?: boolean;
      speaker?: string;
    };

function groupBubbles(chat: ChatItem[]): GroupedItem[] {
  const out: GroupedItem[] = [];
  for (let i = 0; i < chat.length; i++) {
    const c = chat[i];
    if (c.kind === "stamp") {
      out.push({ kind: "stamp", text: c.text });
      continue;
    }
    const prev = chat[i - 1];
    const nextC = chat[i + 1];
    const prevSpeaker = prev && prev.kind === "them" ? prev.speaker : undefined;
    const nextSpeaker = nextC && nextC.kind === "them" ? nextC.speaker : undefined;
    const thisSpeaker = c.kind === "them" ? c.speaker : undefined;
    // Two bubbles from the same sender group together only if they're from the
    // same kind AND (in the case of "them" bubbles in group mode) from the same
    // speaker. Different speakers in a group chat always start a new visual group.
    const samePrev =
      prev && prev.kind === c.kind && prevSpeaker === thisSpeaker;
    const sameNext =
      nextC && nextC.kind === c.kind && nextSpeaker === thisSpeaker;
    out.push({
      kind: "bubble",
      from: c.kind,
      text: c.text,
      tight: !!samePrev,
      last: !sameNext,
      pop: c.pop,
      speaker: thisSpeaker,
    });
  }
  return out;
}

function buildTranscript(chat: ChatItem[]): string {
  return chat
    .filter((c) => c.kind !== "stamp")
    .map((c) => {
      if (c.kind === "them") {
        // Prefer the explicit transcriptSpeaker (set in group modes), then any
        // visible label, then a generic "friend" for legacy solo lines.
        const name = c.transcriptSpeaker || c.speaker || "friend";
        return `${name}: ${c.text}`;
      }
      if (c.kind === "you") return `player advice: ${c.text}`;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

/** Parse a "name: text" prefix (used by group-chat AI output). */
function parseSpeaker(raw: string): { speaker?: string; text: string } {
  const m = /^\s*([a-z][a-z0-9_-]{1,14})\s*:\s*([\s\S]+)$/i.exec(raw);
  if (!m) return { text: raw.trim() };
  return { speaker: m[1].trim(), text: m[2].trim() };
}

function formatTime(d: Date) {
  return d
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    .toLowerCase()
    .replace(/\s/g, " ");
}

function EndCap({ friendName }: { friendName: string }) {
  return (
    <div className="text-center text-[11px] text-muted-foreground/70 mt-4 mb-2 lowercase">
      {friendName.toLowerCase()} is offline
    </div>
  );
}

function SignalIcon() {
  return (
    <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden>
      <rect x="0" y="7" width="3" height="4" rx="0.5" />
      <rect x="4.5" y="5" width="3" height="6" rx="0.5" />
      <rect x="9" y="2.5" width="3" height="8.5" rx="0.5" />
      <rect x="13.5" y="0" width="3" height="11" rx="0.5" />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg width="25" height="12" viewBox="0 0 25 12" aria-hidden>
      <rect
        x="0.5"
        y="0.5"
        width="21"
        height="11"
        rx="2.5"
        stroke="currentColor"
        strokeOpacity="0.6"
        fill="none"
      />
      <rect x="2" y="2" width="18" height="8" rx="1.5" fill="currentColor" />
      <rect x="22.5" y="3.5" width="1.5" height="5" rx="0.75" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
