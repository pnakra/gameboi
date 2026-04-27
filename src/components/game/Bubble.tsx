import { cn } from "@/lib/utils";

export function Bubble({
  from,
  children,
  delay = 0,
}: {
  from: "them" | "you";
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className={cn(
        "flex w-full animate-float-in",
        from === "you" ? "justify-end" : "justify-start",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={cn(
          "max-w-[78%] rounded-3xl px-4 py-2.5 text-[15px] leading-snug shadow-sm",
          from === "them"
            ? "bg-bubble-them text-bubble-them-foreground rounded-bl-md"
            : "bg-bubble-you text-bubble-you-foreground rounded-br-md",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function TypingBubble() {
  return (
    <div className="flex justify-start animate-float-in">
      <div className="bg-bubble-them rounded-3xl rounded-bl-md px-5 py-3 flex gap-1.5">
        <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
        <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
        <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
