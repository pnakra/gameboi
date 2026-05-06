import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { itoUrl } from "@/lib/ito";

export function Interstitial({ onContinue }: { onContinue: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    track("interstitial_viewed");
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
        <p className="mt-4 text-[14px] text-muted-foreground/85 lowercase text-balance">
          a 2-minute check-in. anonymous. nothing to download.
        </p>

        <a
          href={itoUrl({ surface: "interstitial" })}
          onClick={() => {
            track("isthisok_link_clicked", { source: "interstitial" });
            track("ito_link_clicked", { source: "interstitial" });
          }}
          className="mt-9 w-full h-[60px] grid place-items-center rounded-2xl bg-[var(--ito)] text-background font-bold text-[16px] tracking-tight active:scale-[0.98] transition-transform shadow-[0_18px_40px_-18px_var(--ito)]"
        >
          start a check-in →
        </a>

        <button
          onClick={ready ? () => { track("interstitial_continue_clicked"); onContinue(); } : undefined}
          disabled={!ready}
          className="mt-5 text-[13px] text-muted-foreground/70 lowercase tracking-tight active:opacity-60 transition-opacity disabled:opacity-30"
        >
          {ready ? "or keep playing" : "..."}
        </button>
      </div>
    </div>
  );
}
