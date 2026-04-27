import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bubble, TypingBubble } from "@/components/game/Bubble";
import { AdviceCard, type Vibe } from "@/components/game/AdviceCard";
import type { Friend } from "@/components/game/friends";
import { cn } from "@/lib/utils";

type Card = { id: string; label: string; vibe: Vibe; entering?: boolean };
type ChatItem =
  | { kind: "them"; text: string; ts: number; pop?: boolean }
  | { kind: "you"; text: string; ts: number; pop?: boolean }
  | { kind: "stamp"; text: string };
type ApiTurn = { role: "user" | "assistant"; content: string };

const TOTAL_TURNS = 4;
const HAND_SIZE = 4;

export function GameScreen({ friend, onExit }: { friend: Friend; onExit: () => void }) {
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [hand, setHand] = useState<Card[]>([]);
  const [history, setHistory] = useState<ApiTurn[]>([]);
  const [loading, setLoading] = useState(true);
  const [turnNum, setTurnNum] = useState(1);
  const [isFinished, setIsFinished] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [playingCardId, setPlayingCardId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const openTime = useMemo(() => formatTime(new Date()), []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setChat([{ kind: "stamp", text: `today ${openTime}` }]);
    void next({ start: true, forTurn: 1 });
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

  async function next(opts: { start?: boolean; chosenCard?: string; forTurn: number }) {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("advise", {
        body: {
          start: opts.start ?? false,
          chosenCard: opts.chosenCard,
          history,
          friendContext: friend.context,
          turn: opts.forTurn,
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
        ...(opts.chosenCard
          ? [{ role: "user" as const, content: `The player texted: "${opts.chosenCard}".` }]
          : opts.start
          ? [{ role: "user" as const, content: "Open the convo." }]
          : []),
        {
          role: "assistant",
          content:
            data.assistantRaw ?? JSON.stringify({ friend: friendMsgs, cards: data.cards }),
        },
      ]);

      setLoading(false);

      if (data.isFinal) {
        setIsFinished(true);
        setHand([]);
      } else {
        const incoming: Card[] = (data.cards ?? []).slice(0, HAND_SIZE);
        await dealCards(incoming);
      }
    } catch (e) {
      console.error(e);
      setChat((c) => [...c, { kind: "them", text: "ugh wifi just died one sec", ts: Date.now(), pop: true }]);
      setLoading(false);
    }
  }

  function pickCard(c: Card) {
    if (loading || isFinished || playingCardId) return;
    setActiveCardId(null);
    setPlayingCardId(c.id);

    // After the card's fly-up animation completes, push the bubble + clear hand + request next turn
    window.setTimeout(() => {
      const ts = Date.now();
      setChat((prev) => [...prev, { kind: "you", text: c.label, ts, pop: true }]);
      setHand([]);
      setPlayingCardId(null);
      const nextTurn = turnNum + 1;
      setTurnNum(nextTurn);
      void next({ chosenCard: c.label, forTurn: nextTurn });
    }, 480);
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
              onClick={onExit}
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
              {Math.min(turnNum, TOTAL_TURNS)}/{TOTAL_TURNS}
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

          {/* HAND */}
          <div className="shrink-0 safe-bottom px-2 pt-2">
            {!isFinished ? (
              <div
                className={cn(
                  "relative h-[260px] mx-auto",
                  // Subtle ambient glow under the hand
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
                      onClick={() => pickCard(c)}
                      disabled={loading || !!playingCardId}
                      // Hover-to-lift on desktop
                      style={{}}
                      // Use pointer events for active feedback
                      {...{
                        onMouseEnter: () => !playingCardId && setActiveCardId(c.id),
                        onMouseLeave: () =>
                          activeCardId === c.id && setActiveCardId(null),
                        onTouchStart: () => !playingCardId && setActiveCardId(c.id),
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="pb-4 pt-2">
                <button
                  onClick={onExit}
                  className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold tracking-tight active:scale-[0.98] transition-transform"
                >
                  pick another friend
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
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
