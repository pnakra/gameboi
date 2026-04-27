import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bubble, TypingBubble } from "@/components/game/Bubble";
import { AdviceCard, type Vibe } from "@/components/game/AdviceCard";
import type { Friend } from "@/components/game/friends";
import { cn } from "@/lib/utils";

type Card = { id: string; label: string; vibe: Vibe };
type ChatItem =
  | { kind: "them"; text: string }
  | { kind: "you"; text: string };
type Turn = { role: "user" | "assistant"; content: string };

export function GameScreen({ friend, onExit }: { friend: Friend; onExit: () => void }) {
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [history, setHistory] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(true);
  const [turn, setTurn] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void next({ start: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat, loading]);

  async function next(opts: { start?: boolean; chosenCard?: string }) {
    setLoading(true);
    setCards([]);
    try {
      const { data, error } = await supabase.functions.invoke("advise", {
        body: {
          start: opts.start ?? false,
          chosenCard: opts.chosenCard,
          history,
        },
      });
      if (error) throw error;

      const friendMsgs: string[] = data.friend ?? [];
      // stagger reveal
      for (let i = 0; i < friendMsgs.length; i++) {
        await new Promise((r) => setTimeout(r, 650));
        setChat((c) => [...c, { kind: "them", text: friendMsgs[i] }]);
      }

      setCards(data.cards ?? []);
      setHistory((h) => [
        ...h,
        ...(opts.chosenCard
          ? [{ role: "user" as const, content: `The player picked: "${opts.chosenCard}". Continue.` }]
          : opts.start
          ? [{ role: "user" as const, content: "Start a brand new scene." }]
          : []),
        { role: "assistant", content: data.assistantRaw ?? JSON.stringify({ friend: friendMsgs, cards: data.cards }) },
      ]);
    } catch (e) {
      console.error(e);
      setChat((c) => [...c, { kind: "them", text: "ugh my wifi just died, one sec" }]);
    } finally {
      setLoading(false);
    }
  }

  function pickCard(c: Card) {
    setChat((prev) => [...prev, { kind: "you", text: c.label }]);
    setCards([]);
    setTurn((t) => t + 1);
    void next({ chosenCard: c.label });
  }

  return (
    <div className="relative flex flex-col h-[100dvh] max-w-[480px] mx-auto bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-background/80 backdrop-blur sticky top-0 z-10">
        <button
          onClick={onExit}
          className="text-muted-foreground hover:text-foreground text-xl leading-none w-8 h-8 grid place-items-center -ml-2"
          aria-label="Back"
        >
          ←
        </button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-lg font-bold text-primary-foreground">
          M
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[15px] truncate">maya</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            online · texting you
          </div>
        </div>
      </header>

      {/* Chat */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-2">
        {chat.map((m, i) => (
          <Bubble key={i} from={m.kind === "them" ? "them" : "you"}>
            {m.text}
          </Bubble>
        ))}
        {loading && <TypingBubble />}
        <div className="h-2" />
      </div>

      {/* Card hand */}
      <div
        className={cn(
          "shrink-0 px-3 pt-3 safe-bottom transition-all duration-300",
          "bg-gradient-to-t from-background via-background to-background/0",
        )}
      >
        {cards.length > 0 ? (
          <>
            <div className="px-2 pb-2 text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
              your move
            </div>
            <div className="flex gap-3 overflow-x-auto pb-3 -mx-3 px-3 snap-x snap-mandatory">
              {cards.map((c, i) => (
                <div key={c.id} className="snap-center animate-float-in" style={{ animationDelay: `${i * 70}ms` }}>
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
        ) : (
          <div className="h-[228px] grid place-items-center text-muted-foreground text-sm">
            {loading ? "…" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
