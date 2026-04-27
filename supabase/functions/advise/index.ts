// Edge function: generates the next scene from Claude based on prior scene + chosen card.
// Drives a dynamic 6–10 exchange arc with progressive reveals. Also generates the end-of-round recap.

const MIN_EXCHANGES = 6;
const MAX_EXCHANGES = 10;
const FREETEXT_FROM = 5; // exchange number where input upgrades to free text on the client

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// === MASTER SYSTEM PROMPT ===
// Single source of truth for tone, ambiguity, never-shame, age safety, etc.
const MASTER_PROMPT = `You are generating content for a mobile game where the player advises a friend navigating ambiguous romantic and social situations. The player has chosen a friend with a specific character context which you will be given. All content should feel calibrated to that friend — his personality, his situation, his communication style.

Situations involve genuine ambiguity — mixed signals, unclear communication, alcohol, new vs. established relationships, hook-up situations, digital communication. There are no correct answers. Never imply one choice was better than another. Show realistic mixed consequences — every choice has something going for it and something that complicates things.

Information is revealed gradually across an exchange. Early exchanges establish the situation. Middle exchanges introduce a complication that recontextualizes something said earlier — something he left out, something he only now mentions, a detail that shifts the read. Final exchanges bring things to a head. The player should never feel they had the full picture from the start.

Tone of the friend's texts: exactly how a 14-19 year old guy actually texts a close friend. Casual, slightly fragmented, real. Not articulate about his feelings. Uses shorthand. Not "I am experiencing confusion about whether she consented" — more like "idk man she seemed into it but then she got quiet and I don't know."

Advice cards (and the player's own free-text replies later in the exchange) should feel like real advice — directional but not scripted. Generate cards contextually relevant to the current moment in the conversation.

All characters are 13 or older. If any input implies a character under 18, do not generate romantic or sexual content and surface a redirect message instead.

Never shame. Never lecture. Never signal a verdict.`;

// === MODE-SPECIFIC ADDENDUM (turn engine) ===
const TURN_ADDENDUM = `
== FORMAT (turn engine mode) ==

Real teen texting voice. Mostly lowercase. Slang & emojis sparingly and naturally (😭 💀 🙏 ✨ 🥲 🫠). Common shorthand ok (idk, fr, lowkey, ngl, tbh, bro). NEVER "rizz", "skibidi", "gyatt", or try-hard slang. NEVER narrate (no "*she walks in*"). Pure texting only.

Keep messages SHORT. 1-3 bubbles per turn. Each usually under ~80 chars. Break thoughts across bubbles like real texting.

== 4-TURN ARC ==
- TURN 1 (OPEN): Friend texts FIRST. Casual opener ("yo", "wait", "ok so", "bestie"). Briefly drop what just happened, hold back a key detail, invite a response.
- TURN 2 (REACT + PARTIAL REVEAL): React to advice in voice. Drop ONE new piece of info that adds shape but doesn't resolve.
- TURN 3 (RECONTEXTUALIZE): React. Drop a detail "forgot to mention" or "wasn't gonna say but" that makes the player rethink the read. The pivot.
- TURN 4 (CLOSE OPEN): React. Sign off naturally ("ok wish me luck", "ill update u", "k im going in"). NO moral, NO summary, NO verdict. Situation stays unresolved.

== CARDS (3 advice cards per turn — the 4th is added by the engine) ==
Each card = ORIENTATION + SPECIFIC SUGGESTION. NOT pure stance. NOT a literal script.
Advice is FROM THE PLAYER TO THE FRIEND ("ask her", "tell him", "don't push it"). 8–16 words. Mostly lowercase. No quotes. Emojis rarely.

Good shape:
  • "ask her directly — what are you actually looking for"
  • "don't push it tonight. see how she acts tomorrow"
  • "you might be reading this wrong — check in before you spiral"
  • "leave it on read for a few hours. let him sweat a bit"
Bad: "just say it" (too vague). "send: hey i miss you" (literal script). "be confident ✨" (pure stance).

All 3 must be plausibly different reads of the same moment. NONE are right or wrong.

Vibes available: direct, chill, bold, soft, chaos. Use 3 different ones per turn.

== OUTPUT ==
Return ONLY this JSON, no prose, no markdown:
{
  "friend": ["msg 1", "msg 2"],
  "cards": [
    { "label": "card text", "vibe": "direct" | "chill" | "bold" | "soft" | "chaos" }
  ]
}`;

// === MODE-SPECIFIC ADDENDUM (recap) ===
const RECAP_ADDENDUM = `
== FORMAT (recap mode) ==

Generate a brief end-of-round reflection for the player. You will be given the full thread.

Output JSON ONLY:
{
  "recap": "2-3 sentences, neutral, describing what happened in the thread. No judgment on any card the player played. No verdict on the friend. No 'good' / 'bad' / 'should have'. Past tense. Lowercase ok. Keep it tight.",
  "question": "ONE genuine open question worth sitting with. Not rhetorical. Not leading toward an answer. Not 'what would you do differently' — more like 'when do you actually know if someone's into you' or 'what does it cost to be the one who asks first'. One sentence."
}

Never reference scoring, performance, right answers, or the player's choices being good/bad. The recap should feel like the last beat of a real conversation with someone who didn't tell you what to think.`;

// === EARLY-EXIT (wildcard played) ADDENDUM ===
const WILDCARD_ADDENDUM = `
== FORMAT (wildcard exit mode) ==

The player just played the "isthisok.app" wildcard — they're telling the friend to actually think this through properly with a real tool instead of in-the-moment chat advice.

React in the friend's voice. 1-2 short bubbles. Acknowledge it's actually maybe a good idea — "yeah honestly", "lowkey ur right", "ok ill check that out", "fine fine". Then a quick natural sign-off. No moral. No summary.

Output JSON ONLY:
{ "friend": ["msg 1", "msg 2"] }`;

function buildSystem(mode: "turn" | "recap" | "wildcard", friendContext?: string) {
  const addendum =
    mode === "recap" ? RECAP_ADDENDUM : mode === "wildcard" ? WILDCARD_ADDENDUM : TURN_ADDENDUM;
  const friendBlock = friendContext
    ? `\n\n== THIS SESSION'S FRIEND ==\n${friendContext}\n== END FRIEND ==\n\nEvery message and card must sound like THIS friend specifically. Match his voice. Keep the situation grounded in his specific ongoing thing.`
    : "";
  return `${MASTER_PROMPT}\n${addendum}${friendBlock}`;
}

function turnInstruction(turnNum: number, chosenCard?: string): string {
  const advice = chosenCard
    ? `The player just texted me back: "${chosenCard}". I read it.`
    : "";
  switch (turnNum) {
    case 1:
      return `THIS IS TURN 1 of 4 (OPEN). I open the convo. Casual greeting + briefly drop what just happened, holding back a key detail. Return JSON with "friend" and 3 "cards" only.`;
    case 2:
      return `${advice} THIS IS TURN 2 of 4 (REACT + PARTIAL REVEAL). React in voice, then add ONE new piece of info that adds shape but doesn't resolve. Return JSON with "friend" and 3 "cards".`;
    case 3:
      return `${advice} THIS IS TURN 3 of 4 (RECONTEXTUALIZE). React in voice, then drop a detail I "forgot to mention" or "wasn't gonna say" that makes the player rethink. The pivot. Return JSON with "friend" and 3 "cards".`;
    case 4:
    default:
      return `${advice} THIS IS TURN 4 of 4 (CLOSE OPEN). React in voice, then sign off naturally like a real teen ("ok ill update u", "wish me luck", "k im going in"). Do NOT add a moral or summary. Return JSON with "friend" and 3 "cards".`;
  }
}

interface AnthropicMsg {
  role: "user" | "assistant";
  content: string;
}

async function callClaude(messages: AnthropicMsg[], system: string) {
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
  return data?.content?.[0]?.text ?? "";
}

function extractJson(s: string): any {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no json");
  return JSON.parse(s.slice(start, end + 1));
}

// The wildcard the engine always injects. Stable label so the AI in wildcard mode can recognize it.
const WILDCARD_CARD = {
  label: "tell him to actually think this one through properly at isthisok.app",
  vibe: "ito" as const,
  isWildcard: true,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const mode: "turn" | "recap" | "wildcard" =
      body.mode === "recap" ? "recap" : body.mode === "wildcard" ? "wildcard" : "turn";
    const history: AnthropicMsg[] = Array.isArray(body.history) ? body.history : [];
    const chosenCard: string | undefined = body.chosenCard;
    const friendContext: string | undefined = body.friendContext;

    // ---------- RECAP MODE ----------
    if (mode === "recap") {
      const transcript: string = String(body.transcript || "");
      const userTurn = `Here is the full thread. Generate the recap + open question.\n\n${transcript}`;
      const raw = await callClaude(
        [{ role: "user", content: userTurn }],
        buildSystem("recap", friendContext),
      );
      const parsed = extractJson(raw);
      return new Response(
        JSON.stringify({
          recap: String(parsed.recap || "").slice(0, 600),
          question: String(parsed.question || "").slice(0, 240),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---------- WILDCARD EARLY-EXIT MODE ----------
    if (mode === "wildcard") {
      const userTurn = `The player just played the wildcard: "${chosenCard}". React briefly in voice, acknowledge it, sign off. Return JSON.`;
      const messages: AnthropicMsg[] =
        history.length > 0
          ? [...history, { role: "user", content: userTurn }]
          : [{ role: "user", content: userTurn }];
      const raw = await callClaude(messages, buildSystem("wildcard", friendContext));
      const parsed = extractJson(raw);
      return new Response(
        JSON.stringify({
          friend: parsed.friend || ["yeah honestly maybe i should", "ok ill check that out"],
          isFinal: true,
          earlyExit: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---------- NORMAL TURN MODE ----------
    const isStart: boolean = body.start === true || history.length === 0;
    const turnNum: number = Math.max(1, Math.min(4, Number(body.turn) || (isStart ? 1 : history.length / 2 + 1)));

    const userTurn = turnInstruction(turnNum, chosenCard);
    const messages: AnthropicMsg[] = isStart
      ? [{ role: "user", content: userTurn }]
      : [...history, { role: "user", content: userTurn }];

    const raw = await callClaude(messages, buildSystem("turn", friendContext));
    const parsed = extractJson(raw);

    // Take 3 AI cards, then inject the ito wildcard as the 4th.
    const aiCards = (parsed.cards || []).slice(0, 3).map((c: any, i: number) => ({
      id: `${Date.now()}-${i}`,
      label: String(c.label || "").slice(0, 140),
      vibe: ["direct", "chill", "bold", "soft", "chaos"].includes(c.vibe) ? c.vibe : "chill",
      isWildcard: false,
    }));

    const cards = [
      ...aiCards,
      { id: `${Date.now()}-w`, ...WILDCARD_CARD },
    ];

    return new Response(
      JSON.stringify({
        friend: parsed.friend || [],
        cards,
        assistantRaw: raw,
        turn: turnNum,
        isFinal: turnNum >= 4,
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
