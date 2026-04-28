import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bubble, TypingBubble } from "@/components/game/Bubble";
import { AdviceCard, type Vibe } from "@/components/game/AdviceCard";
import type { Friend } from "@/components/game/friends";
import { cn } from "@/lib/utils";
import { track, logExchange } from "@/lib/analytics";

type Card = { id: string; label: string; vibe: Vibe; entering?: boolean };
type ChatItem =
  | { kind: "them"; text: string; ts: number; pop?: boolean }
  | { kind: "you"; text: string; ts: number; pop?: boolean }
  | { kind: "stamp"; text: string };
type ApiTurn = { role: "user" | "assistant"; content: string };

const MIN_EXCHANGES = 4;
const MAX_EXCHANGES = 6;
const FREETEXT_FROM = 3;
const HAND_SIZE = 3;

export type EndPayload = {
  transcript: string;
};

export function GameScreen({
  friend,
  onExit,
  onEnd,
}: {
  friend: Friend;
  onExit: () => void;
  onEnd: (payload: EndPayload) => void;
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const chatRef = useRef<ChatItem[]>([]);
  useEffect(() => {
    chatRef.current = chat;
  }, [chat]);

  const openTime = useMemo(() => formatTime(new Date()), []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    track("round_started", { friend_id: friend.id, friend_name: friend.name });
    setChat([{ kind: "stamp", text: `today ${openTime}` }]);
    void next({ start: true, forExchange: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          exchange: opts.forExchange,
        },
      });
      if (error) throw error;

      const friendMsgs: string[] = data.friend ?? [];
      // Stagger reveal — first message has a "thinking" pause, subsequent ones are quicker
      for (let i = 0; i < friendMsgs.length; i++) {
        await new Promise((r) => setTimeout(r, i === 0 ? 750 : 550));
        const ts = Date.now();
        setChat((c) => [...c, { kind: "them", text: friendMsgs[i], ts, pop: true }]);
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
        // No auto-advance — user taps "continue" when they're ready (see button below).
      } else {
        const incoming: Card[] = (data.cards ?? []).slice(0, HAND_SIZE).map((c: any) => ({
          id: c.id,
          label: c.label,
          vibe: c.vibe,
        }));
        await dealCards(incoming);
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
      setChat((prev) => [...prev, { kind: "you", text: c.label, ts, pop: true }]);
      setHand([]);
      setPlayingCardId(null);

      const nextEx = exchange + 1;
      setExchange(nextEx);
      void next({ chosenReply: c.label, replySource: "card", forExchange: nextEx });
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

  const [handoffLoading, setHandoffLoading] = useState(false);
  async function handoffToIto() {
    if (handoffLoading) return;
    track("handoff_clicked", {
      source: "game_screen",
      friend_id: friend.id,
      exchange,
      finished: isFinished,
    });
    setHandoffLoading(true);
    try {
      const transcript = buildTranscript(chatRef.current);
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
      const url = `https://isthisok.app/check-in?situation=${encodeURIComponent(situation)}`;
      window.location.href = url;
    } catch (e) {
      console.error(e);
      // Fail-safe: still send them over with no prefill.
      window.location.href = "https://isthisok.app/check-in";
    } finally {
      setHandoffLoading(false);
    }
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
          <header className="relative flex items-center px-3 pt-2 pb-2.5 border-b border-white/[0.06] bg-background">
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
            <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 max-w-[200px]">
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
            </div>
            <div className="ml-auto text-[11px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
              {Math.min(exchange, MAX_EXCHANGES)}/{MAX_EXCHANGES}
            </div>
          </header>

          {/* Thread */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 pt-3 pb-2">
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
                >
                  {item.text}
                </Bubble>
              );
            })}
            {loading && <TypingBubble />}
            {isFinished && !loading && <EndCap friendName={friend.name} />}
            <div className="h-3" />
          </div>

          {/* INPUT AREA */}
          <div className="shrink-0 safe-bottom px-2 pt-2">
            {!isFinished && (
              // Fanned hand of cards — used throughout the entire arc.
              <div
                className={cn(
                  "relative h-[260px] mx-auto",
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

            {/* From FREETEXT_FROM onward, the player can also type their own reply
                instead of (or in addition to) tapping a card. */}
            {!isFinished && exchange >= FREETEXT_FROM && (
              <div className="px-1 pt-1 animate-fade-in">
                <ComposeBar
                  value={draft}
                  onChange={setDraft}
                  onSend={sendDraft}
                  disabled={loading || !!playingCardId}
                />
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

            {/* Handoff CTA — appears once the complication has landed, plus on end */}
            {(exchange >= FREETEXT_FROM || isFinished) ? (
              <button
                onClick={handoffToIto}
                disabled={handoffLoading}
                className="block w-full text-center text-[12px] text-[var(--ito)]/85 hover:text-[var(--ito)] py-2 lowercase tracking-tight disabled:opacity-50"
              >
                {handoffLoading ? "one sec..." : "want to keep talking this through?"}
              </button>
            ) : (
              <a
                href="https://isthisok.app/check-in"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  track("isthisok_link_clicked", {
                    source: "game_screen_inline",
                    friend_id: friend.id,
                    exchange,
                  })
                }
                className="block text-center text-[12px] text-[var(--ito)]/85 hover:text-[var(--ito)] py-2 lowercase tracking-tight"
              >
                got your own situation? isthisok.app
              </a>
            )}
          </div>
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
    const samePrev = prev && prev.kind === c.kind;
    const sameNext = nextC && nextC.kind === c.kind;
    out.push({
      kind: "bubble",
      from: c.kind,
      text: c.text,
      tight: !!samePrev,
      last: !sameNext,
      pop: c.pop,
    });
  }
  return out;
}

function buildTranscript(chat: ChatItem[]): string {
  return chat
    .filter((c) => c.kind !== "stamp")
    .map((c) => {
      if (c.kind === "them") return `friend: ${c.text}`;
      if (c.kind === "you") return `player advice: ${c.text}`;
      return "";
    })
    .filter(Boolean)
    .join("\n");
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
