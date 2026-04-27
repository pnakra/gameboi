import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bubble, TypingBubble } from "@/components/game/Bubble";
import { AdviceCard, type Vibe } from "@/components/game/AdviceCard";
import type { Friend } from "@/components/game/friends";
import { cn } from "@/lib/utils";

type Card = { id: string; label: string; vibe: Vibe };
type ChatItem =
  | { kind: "them"; text: string; ts: number }
  | { kind: "you"; text: string; ts: number }
  | { kind: "stamp"; text: string };
type Turn = { role: "user" | "assistant"; content: string };

const TOTAL_TURNS = 4;

export function GameScreen({ friend, onExit }: { friend: Friend; onExit: () => void }) {
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [history, setHistory] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(true);
  // turnNum tracks which turn the AI will generate next: 1..4
  const [turnNum, setTurnNum] = useState(1);
  const [isFinished, setIsFinished] = useState(false);
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

  async function next(opts: { start?: boolean; chosenCard?: string; forTurn: number }) {
    setLoading(true);
    setCards([]);
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
      // stagger reveal — first message has a "thinking" pause, subsequent ones are quicker
      for (let i = 0; i < friendMsgs.length; i++) {
        await new Promise((r) => setTimeout(r, i === 0 ? 750 : 550));
        const ts = Date.now();
        setChat((c) => [...c, { kind: "them", text: friendMsgs[i], ts }]);
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

      if (data.isFinal) {
        setIsFinished(true);
        setCards([]);
      } else {
        setCards(data.cards ?? []);
      }
    } catch (e) {
      console.error(e);
      setChat((c) => [
        ...c,
        { kind: "them", text: "ugh wifi just died one sec", ts: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function pickCard(c: Card) {
    if (loading || isFinished) return;
    const ts = Date.now();
    setChat((prev) => [...prev, { kind: "you", text: c.label, ts }]);
    setCards([]);
    const nextTurn = turnNum + 1;
    setTurnNum(nextTurn);
    void next({ chosenCard: c.label, forTurn: nextTurn });
  }

  // Group consecutive bubbles from the same sender for tail/spacing
  const groupedChat = useMemo(() => groupBubbles(chat), [chat]);

  return (
    <div className="relative min-h-[100dvh] w-full bg-background flex items-stretch sm:items-center justify-center sm:py-6">
      {/* PHONE FRAME */}
      <div
        className={cn(
          "relative w-full sm:max-w-[400px] flex flex-col",
          // On desktop: render with phone bezel. On mobile: fill viewport.
          "sm:rounded-[44px] sm:border sm:border-white/10 sm:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]",
          "sm:bg-black sm:p-[10px] sm:h-[820px] sm:max-h-[90dvh]",
        )}
      >
        {/* SCREEN */}
        <div
          className={cn(
            "relative flex flex-col flex-1 overflow-hidden bg-background",
            "sm:rounded-[36px]",
            "h-[100dvh] sm:h-auto",
          )}
        >
          {/* iOS-style status bar (decorative) */}
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
                >
                  {item.text}
                </Bubble>
              );
            })}
            {loading && <TypingBubble />}
            {isFinished && !loading && <EndCap friendName={friend.name} />}
            <div className="h-3" />
          </div>

          {/* Card hand */}
          <div
            className={cn(
              "shrink-0 px-3 pt-2 safe-bottom",
              "bg-gradient-to-t from-background via-background to-background/0",
            )}
          >
            {cards.length > 0 ? (
              <>
                <div className="flex items-center justify-between px-1 pb-2">
                  <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                    your move
                  </span>
                  <span className="text-[11px] text-muted-foreground/60">
                    swipe →
                  </span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-3 -mx-3 px-3 snap-x snap-mandatory">
                  {cards.map((c, i) => (
                    <div
                      key={c.id}
                      className="snap-center animate-float-in"
                      style={{ animationDelay: `${i * 70}ms` }}
                    >
                      <AdviceCard
                        label={c.label}
                        vibe={c.vibe}
                        index={i}
                        onClick={() => pickCard(c)}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : isFinished && !loading ? (
              <div className="pb-4 pt-2 flex flex-col gap-2">
                <button
                  onClick={onExit}
                  className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold tracking-tight active:scale-[0.98] transition-transform"
                >
                  pick another friend
                </button>
              </div>
            ) : (
              <div className="h-[228px]" />
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
  | { kind: "bubble"; from: "them" | "you"; text: string; tight: boolean; last: boolean };

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
