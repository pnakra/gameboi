// Lightweight, fire-and-forget analytics helper.
// - One anonymous session id per browser tab (sessionStorage), stable across the round.
// - track(): logs a meaningful UI event to the `analytics_events` table.
// - logExchange(): logs one full input/output round-trip to `exchange_logs`.
// All inserts are best-effort; failures are swallowed so they never block UX.

import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "gameboi_session_id";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uuid();
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}

export function track(eventName: string, properties: Record<string, unknown> = {}): void {
  const session_id = getSessionId();
  // Fire and forget — never await, never throw.
  void supabase
    .from("analytics_events")
    .insert({ session_id, event_name: eventName, properties: properties as never })
    .then(({ error }) => {
      if (error) console.warn("[analytics] track failed:", eventName, error.message);
    });
}

export type ExchangeLog = {
  friend_id?: string;
  friend_name?: string;
  exchange_number: number;
  phase?: string;
  chosen_reply?: string | null;
  reply_source?: "card" | "freetext" | null;
  friend_messages: string[];
  cards: Array<{ id: string; label: string; vibe: string }>;
  is_final: boolean;
  raw_response?: string;
};

export function logExchange(payload: ExchangeLog): void {
  const session_id = getSessionId();
  void supabase
    .from("exchange_logs")
    .insert({
      session_id,
      friend_id: payload.friend_id,
      friend_name: payload.friend_name,
      exchange_number: payload.exchange_number,
      phase: payload.phase,
      chosen_reply: payload.chosen_reply ?? null,
      reply_source: payload.reply_source ?? null,
      friend_messages: payload.friend_messages as never,
      cards: payload.cards as never,
      is_final: payload.is_final,
      raw_response: payload.raw_response,
    })
    .then(({ error }) => {
      if (error) console.warn("[analytics] logExchange failed:", error.message);
    });
}
