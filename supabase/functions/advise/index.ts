// Edge function: generates the next scene from Claude based on prior scene + chosen card.
// Returns: { friend: string[], cards: {id, label, vibe}[], setting?: string }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_SYSTEM = `You write tiny ongoing text-message scenes for a mobile game called "moves with friends".

The player is texting a SPECIFIC FRIEND who is in the middle of an ambiguous romantic or social situation. The friend texts the player. The player picks a card to advise. Then you continue the scene.

CRITICAL RULES:
- Audience: 13-18 year olds. Voice = real teen texting. Lowercase mostly, slang, emojis used sparingly but naturally (😭 💀 🙏 ✨ etc), abbreviations (idk, fr, lowkey, ngl, tbh, bestie, bro). NEVER cringe. NEVER use "rizz", "skibidi", or any try-hard slang.
- NEVER judge the advice. NEVER say "that was a good call" or "bad idea". NEVER score, grade, or moralize. The friend just reacts as a real teen would — sometimes it works, sometimes it spirals, sometimes it just shifts.
- NO right answers. Cards should each be plausible and reflect different vibes — not good vs bad.
- Keep the friend's messages SHORT. Like real texts. 1-3 messages, each under ~80 chars. Break thoughts across bubbles.
- Never narrate (no "*she walks in*"). Pure texting only.
- The situation should EVOLVE every turn — new info drops, someone replies, plans shift. Avoid loops.
- After ~6-8 turns total, scenes can naturally wind down (friend says "ok ttyl", "wish me luck", "ill update u") — but do NOT add a verdict or summary. Just end mid-life.

You will be given a SPECIFIC FRIEND character and their ongoing situation. STAY IN THEIR VOICE AND THEIR SITUATION the entire session. Do NOT switch to a different scenario type — every scene must stay grounded in this friend's specific ongoing thing. Match their texting style precisely (capitalization, emoji use, vocabulary, length, energy).

Always respond in this strict JSON shape, no prose, no markdown:
{
  "friend": ["msg 1", "msg 2"],
  "cards": [
    { "label": "short card text (max 5 words)", "vibe": "direct" | "chill" | "bold" | "soft" | "chaos" }
  ]
}

Always return EXACTLY 4 cards with DIFFERENT vibes. Card labels are what the player would actually advise — write them as the player would text them, e.g. "just say it", "leave him on read", "send the pic", "ask her friend first", "double text 😤".`;

function buildSystem(friendContext?: string) {
  if (!friendContext) return BASE_SYSTEM;
  return `${BASE_SYSTEM}\n\n--- THIS SESSION'S FRIEND ---\n${friendContext}\n--- END FRIEND ---\n\nEvery message and card must feel like it belongs to THIS friend. Do not break voice.`;
}

const STARTER_USER = `Open the convo. Drop me into the middle of something happening RIGHT NOW in your situation — a fresh moment, something that just shifted (a text just came in, you just saw something, plans just changed, etc). Don't recap or explain — text me the way you actually would when something is unfolding. Return JSON only.`;

interface Turn {
  role: "user" | "assistant";
  content: string;
}

async function callClaude(messages: Turn[], system: string) {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 700,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic ${res.status}: ${t}`);
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text ?? "";
  return text;
}

function extractJson(s: string): any {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no json");
  return JSON.parse(s.slice(start, end + 1));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const history: Turn[] = Array.isArray(body.history) ? body.history : [];
    const chosenCard: string | undefined = body.chosenCard;
    const isStart: boolean = body.start === true || history.length === 0;

    let messages: Turn[];
    if (isStart) {
      messages = [{ role: "user", content: STARTER_USER }];
    } else {
      messages = [
        ...history,
        {
          role: "user",
          content: `The player picked this card to advise me: "${chosenCard}". Continue the scene. Return JSON only.`,
        },
      ];
    }

    const raw = await callClaude(messages);
    const parsed = extractJson(raw);

    // Add stable ids
    parsed.cards = (parsed.cards || []).slice(0, 4).map((c: any, i: number) => ({
      id: `${Date.now()}-${i}`,
      label: String(c.label || "").slice(0, 40),
      vibe: ["direct", "chill", "bold", "soft", "chaos"].includes(c.vibe) ? c.vibe : "chill",
    }));

    return new Response(
      JSON.stringify({
        friend: parsed.friend || [],
        cards: parsed.cards,
        assistantRaw: raw,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("advise error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
