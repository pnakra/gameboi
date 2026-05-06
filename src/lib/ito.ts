// Centralized ito link builder — every handoff goes through here so we get
// consistent ?source / ?friend / ?mode attribution params on the ito side.
// You added a `gameboi=true` flag to the ito DB; these extras let you slice
// by which surface converted (footer vs end card vs interstitial vs review).

const ITO_BASE = "https://gameboi.isthisok.app/check-in";

export type ItoSurface =
  | "game_footer"
  | "game_inline_beat"
  | "mid_review_1"
  | "mid_review_2"
  | "interstitial"
  | "end_card";

export function itoUrl(opts: {
  surface: ItoSurface;
  friendId?: string;
  modeId?: string;
  exchange?: number;
}): string {
  const params = new URLSearchParams();
  params.set("source", "gameboi");
  params.set("surface", opts.surface);
  if (opts.friendId) params.set("friend", opts.friendId);
  if (opts.modeId) params.set("mode", opts.modeId);
  if (typeof opts.exchange === "number") params.set("exchange", String(opts.exchange));
  return `${ITO_BASE}?${params.toString()}`;
}
