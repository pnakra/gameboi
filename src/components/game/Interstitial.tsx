import { useEffect, useState } from "react";

export function Interstitial({ onContinue }: { onContinue: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 1000);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full bg-background flex items-center justify-center px-6 grain overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--ito)/0.18,transparent_60%)] pointer-events-none" />
      <div className="relative w-full max-w-[400px] flex flex-col items-center text-center animate-float-in">
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--ito)]/80 mb-6">
          before the next round
        </div>
        <p className="display text-[26px] leading-[1.25] font-bold text-balance text-foreground">
          if any of that hit close to home, the real thing has a real tool for it.
        </p>
        <a
          href="https://isthisok.app"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 text-[var(--ito)] text-[20px] font-bold underline underline-offset-4 decoration-[var(--ito)]/40"
        >
          isthisok.app →
        </a>

        <button
          onClick={ready ? onContinue : undefined}
          disabled={!ready}
          className="mt-12 w-full h-13 py-3.5 rounded-2xl bg-surface border border-white/[0.08] text-foreground/90 font-semibold tracking-tight transition-all disabled:opacity-30 active:scale-[0.98]"
        >
          {ready ? "keep playing" : "..."}
        </button>
      </div>
    </div>
  );
}
