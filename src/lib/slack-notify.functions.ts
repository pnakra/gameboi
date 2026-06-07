import { createServerFn } from "@tanstack/react-start";

// Fire-and-forget Slack ping to #gameboi-actions when something interesting
// happens (round completed, ito link clicked). The client dedupes per session
// before invoking this — server-side we just post.
//
// Uses the Lovable connector gateway for Slack so token refresh is handled
// automatically. SLACK_API_KEY is the gateway proxy key, not a real Slack key.

const SLACK_CHANNEL = "gameboi-actions";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/slack/api";

export const notifySlack = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      kind: "completed" | "ito_clicked";
      session_id: string;
      properties?: Record<string, unknown>;
    }) => input,
  )
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const SLACK_API_KEY = process.env.SLACK_API_KEY;
    if (!LOVABLE_API_KEY || !SLACK_API_KEY) {
      console.warn("[slack-notify] missing credentials, skipping");
      return { ok: false, reason: "no-credentials" as const };
    }

    const props = data.properties ?? {};
    const friend = (props.friend_id as string) ?? (props.friend_name as string) ?? "?";
    const source = (props.source as string) ?? "?";
    const bucket = (props.source_bucket as string) ?? "?";
    const utm = (props.utm_source as string) ?? "";
    const inApp = props.in_app_browser_name as string | undefined;
    const sessionShort = data.session_id.slice(0, 8);

    const headline =
      data.kind === "completed"
        ? `:white_check_mark: round completed — *${friend}*`
        : `:link: ito link clicked — *${friend}* (from \`${source}\`)`;

    const meta = [
      `source: ${bucket}${utm ? ` (utm=${utm})` : ""}`,
      inApp ? `webview: ${inApp}` : null,
      `session: \`${sessionShort}\``,
    ]
      .filter(Boolean)
      .join(" · ");

    const text = `${headline}\n${meta}`;

    try {
      const res = await fetch(`${GATEWAY_URL}/chat.postMessage`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": SLACK_API_KEY,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          channel: SLACK_CHANNEL,
          text,
          unfurl_links: false,
          unfurl_media: false,
        }),
      });
      const body = await res.text();
      let parsed: { ok?: boolean; error?: string } = {};
      try {
        parsed = JSON.parse(body);
      } catch {
        // ignore
      }
      if (!res.ok || !parsed.ok) {
        console.warn("[slack-notify] post failed", res.status, body.slice(0, 300));
        return { ok: false as const, reason: parsed.error ?? `http_${res.status}` };
      }
      return { ok: true as const };
    } catch (err) {
      console.warn("[slack-notify] error", err);
      return { ok: false as const, reason: "exception" };
    }
  });
