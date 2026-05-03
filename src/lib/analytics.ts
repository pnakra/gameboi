// Lightweight, fire-and-forget analytics helper.
// - One anonymous session id per browser tab (sessionStorage), stable across the round.
// - Captures attribution (utm_*, referrer, landing path) once per session and
//   stamps it onto every event so even single-event bounced sessions are attributable.
// - track(): logs a meaningful UI event to the `analytics_events` table.
// - logExchange(): logs one full input/output round-trip to `exchange_logs`.
// All inserts are best-effort; failures are swallowed so they never block UX.

import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "gameboi_session_id";
const ATTRIBUTION_KEY = "gameboi_attribution";

type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  referrer_host?: string;
  landing_path?: string;
  landing_search?: string;
  // Inferred bucket: "tiktok" | "instagram" | "twitter" | "google" | "direct" | "other"
  source_bucket?: string;
};

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
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

function bucketFor(utmSource?: string, referrerHost?: string): string {
  const s = (utmSource || "").toLowerCase();
  const r = (referrerHost || "").toLowerCase();
  const hay = `${s} ${r}`;
  if (/(^|[\s.])tiktok\.com|(^|\s)tiktok(\s|$)/.test(hay)) return "tiktok";
  if (/(^|[\s.])reddit\.com|(^|\s)reddit(\s|$)/.test(hay)) return "reddit";
  if (/(^|[\s.])instagram\.com|(^|[\s.])ig\.me|(^|\s)instagram(\s|$)/.test(hay)) return "instagram";
  if (/(^|[\s.])twitter\.com|(^|[\s.])t\.co|(^|[\s.])x\.com|(^|\s)twitter(\s|$)/.test(hay)) return "twitter";
  if (/(^|[\s.])facebook\.com|(^|[\s.])fb\.com|(^|[\s.])fb\.me|(^|\s)facebook(\s|$)/.test(hay)) return "facebook";
  if (/(^|[\s.])google\.com|(^|[\s.])googleads|(^|[\s.])doubleclick|(^|\s)google(\s|$)/.test(hay)) return "google";
  if (/(^|[\s.])youtube\.com|(^|[\s.])youtu\.be|(^|\s)youtube(\s|$)/.test(hay)) return "youtube";
  if (!s && !r) return "direct";
  return "other";
}

/** Capture attribution from the URL + referrer once per session. Idempotent. */
function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const cached = window.sessionStorage.getItem(ATTRIBUTION_KEY);
    if (cached) return JSON.parse(cached) as Attribution;

    const url = new URL(window.location.href);
    const params = url.searchParams;
    const referrer = document.referrer || undefined;
    let referrer_host: string | undefined;
    if (referrer) {
      try {
        referrer_host = new URL(referrer).host;
      } catch {
        // ignore
      }
    }

    const attribution: Attribution = {
      utm_source: params.get("utm_source") || undefined,
      utm_medium: params.get("utm_medium") || undefined,
      utm_campaign: params.get("utm_campaign") || undefined,
      utm_content: params.get("utm_content") || undefined,
      utm_term: params.get("utm_term") || undefined,
      referrer,
      referrer_host,
      landing_path: url.pathname || undefined,
      landing_search: url.search || undefined,
    };
    attribution.source_bucket = bucketFor(attribution.utm_source, referrer_host);
    // Mark deep-link sessions (ad traffic landing directly into a scenario via ?friend=).
    const isDeepLink = !!params.get("friend");
    (attribution as Record<string, unknown>).is_deep_link = isDeepLink;
    (attribution as Record<string, unknown>).deep_link_friend = params.get("friend") || undefined;

    // Drop undefined keys so the JSON stays clean
    const clean: Attribution = {};
    (Object.keys(attribution) as (keyof Attribution)[]).forEach((k) => {
      const v = attribution[k];
      if (v !== undefined && v !== "") (clean as Record<string, unknown>)[k] = v;
    });

    window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(clean));
    return clean;
  } catch {
    return {};
  }
}

export function isDeepLinkSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const a = JSON.parse(window.sessionStorage.getItem(ATTRIBUTION_KEY) || "{}");
    return !!a.is_deep_link;
  } catch {
    return false;
  }
}

export function track(eventName: string, properties: Record<string, unknown> = {}): void {
  const session_id = getSessionId();
  const attribution = getAttribution();
  // Stamp attribution on every event so a single-event bounce is still attributable.
  const merged = { ...attribution, ...properties };
  void supabase
    .from("analytics_events")
    .insert({ session_id, event_name: eventName, properties: merged as never })
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
