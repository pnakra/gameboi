export const MAX_EXCHANGES = 6;
export const FREETEXT_FROM = 3;
export const MID_REVIEW_EXCHANGES = [4, 6] as const;

export function canCompose(exchange: number, finished: boolean, reviewing: boolean, enabled = exchange >= FREETEXT_FROM) {
  return enabled && !finished && !reviewing;
}

export function reviewForExchange(exchange: number): 1 | 2 | null {
  if (exchange === MID_REVIEW_EXCHANGES[0]) return 1;
  if (exchange === MID_REVIEW_EXCHANGES[1]) return 2;
  return null;
}