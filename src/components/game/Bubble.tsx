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
  delay = 0,
}: {
  from: "them" | "you";
  children: React.ReactNode;
  tight?: boolean;
  last?: boolean;
  delay?: number;
}) {
  const isYou = from === "you";
  return (
    <div
      className={cn(
        "flex w-full animate-float-in",
        isYou ? "justify-end" : "justify-start",
        tight ? "mt-[3px]" : "mt-2",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={cn(
          // iOS bubble proportions: ~17px text, ~75% max width, ~18px radius
          "relative max-w-[75%] px-[14px] py-[7px] text-[16.5px] leading-[1.25] tracking-[-0.01em]",
          "rounded-[20px] whitespace-pre-wrap break-words",
          isYou
            ? "bg-bubble-you text-bubble-you-foreground"
            : "bg-bubble-them text-bubble-them-foreground",
          // Pin the corner closest to the tail when this is the last bubble in the group
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
