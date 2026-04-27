import { cn } from "@/lib/utils";

/**
 * iOS-style message bubble.
 * - tight = previous bubble in this group from same sender (no tail, less spacing)
 * - last  = the final bubble in a group from this sender (gets the tail)
 */
export function Bubble({
  from,
  children,
  tight = false,
  last = true,
  pop = false,
  delay = 0,
}: {
  from: "them" | "you";
  children: React.ReactNode;
  tight?: boolean;
  last?: boolean;
  /** When true, use the punchy bubble-pop entrance (real-time arrival). */
  pop?: boolean;
  delay?: number;
}) {
  const isYou = from === "you";
  return (
    <div
      className={cn(
        "flex w-full",
        isYou ? "justify-end" : "justify-start",
        tight ? "mt-[3px]" : "mt-2",
        pop ? "animate-bubble-pop" : "animate-float-in",
      )}
      style={{ animationDelay: `${delay}ms`, transformOrigin: isYou ? "bottom right" : "bottom left" }}
    >
      <div
        className={cn(
          // iOS bubble proportions: ~16.5px text, ~75% max width, ~20px radius
          "relative max-w-[75%] px-[14px] py-[7px] text-[16.5px] leading-[1.25] tracking-[-0.01em]",
          "rounded-[20px] whitespace-pre-wrap break-words",
          isYou
            ? "bg-bubble-you text-bubble-you-foreground"
            : "bg-bubble-them text-bubble-them-foreground",
          last && (isYou ? "rounded-br-[6px]" : "rounded-bl-[6px]"),
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function TypingBubble() {
  return (
    <div className="flex justify-start mt-2 animate-float-in">
      <div className="bg-bubble-them rounded-[20px] rounded-bl-[6px] px-4 py-[10px] flex gap-1.5 items-center">
        <span
          className="typing-dot w-[7px] h-[7px] rounded-full bg-muted-foreground"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="typing-dot w-[7px] h-[7px] rounded-full bg-muted-foreground"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="typing-dot w-[7px] h-[7px] rounded-full bg-muted-foreground"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
