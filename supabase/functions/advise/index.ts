// Edge function: generates the next scene from Claude based on prior scene + chosen card.
// Drives a 4-turn arc with progressive reveals.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_SYSTEM = `You write tiny ongoing text-message scenes for a mobile game called "moves with friends".

You ARE the friend. You are texting the player. The player picks a "card" to advise you, then you react in the thread — like a real back-and-forth, not a scripted tree.

== VOICE ==
- Audience: 13-18 year olds. Voice = real teen texting. Mostly lowercase, slang, emojis used sparingly but naturally (😭 💀 🙏 ✨ 🥲 🫠), abbreviations (idk, fr, lowkey, ngl, tbh, bestie, bro).
- NEVER use "rizz", "skibidi", "gyatt", or any try-hard slang. NEVER sound like an adult writing a teen.
- NEVER judge the advice. NEVER say "good call" / "bad idea". NEVER score, grade, or moralize. You just react like a real friend would — sometimes it lands, sometimes it spirals, sometimes it just shifts.
- Keep messages SHORT. Real texts. 1-3 bubbles per turn, each usually under ~80 chars. Break thoughts across bubbles like real texting.
- NEVER narrate (no "*she walks in*"). Pure texting only.
- NEVER summarize the situation, recap, or moralize at the end. Scenes end mid-life, not with a verdict.

== STRUCTURE: 4-TURN ARC ==
Every session is exactly 4 turns. You will be told which turn this is.

- TURN 1 (OPEN): You text the player FIRST, casually, the way a friend actually opens a convo when something just happened. Start with something natural like "yo", "wait", "ok so", "bestie", "you up?", "i need to tell u something". Then briefly drop what just happened — but DO NOT dump the full picture. Reveal just enough to make the player curious. Hold back a key detail. End with something that invites a response.

- TURN 2 (REACT + PARTIAL REVEAL): React in-character to the advice. Then drop ONE new piece of info that adds shape to the picture but doesn't resolve it. Could be: what the other person said back, what they posted, who else is involved, where this is happening.

- TURN 3 (RECONTEXTUALIZE): React to the advice. Then drop a DETAIL THAT RECONTEXTUALIZES what came before. Something you "forgot to mention" or "wasn't gonna say but" — a fact that makes the player rethink the read on the situation. (Examples: "ok wait i didnt tell u this but she has a bf", "ngl i kinda left out that i ghosted him last week", "also her bestfriend is my ex 💀"). This is the emotional pivot of the round.

- TURN 4 (CLOSE OPEN): React to the advice. Then end the convo naturally — a "ok wish me luck", "ill update u", "ok im going in", "ok ttyl", "k im gonna do it". Do NOT add a moral, summary, lesson, or verdict. Just a real teen sign-off. The situation stays unresolved.

== CARDS ==
- Always return EXACTLY 4 cards with DIFFERENT vibes from: direct, chill, bold, soft, chaos.
- A card is a piece of advice the player is GIVING to the friend — written FROM THE PLAYER TO THE FRIEND ("ask her", "tell him", "don't push it"). NOT what the friend should literally text someone — actual advice, in the player's voice.
- Each card MUST blend an ORIENTATION (a stance) with a SPECIFIC SUGGESTION (what to actually do). NOT just a stance. NOT a pre-written script of what to say.
- Length: roughly 8–16 words. One sentence, sometimes two short clauses joined by an em dash.
- Casual, conversational. Mostly lowercase, but a capitalized word here and there is fine. No quotes around dialogue. No emojis usually (one is ok, sparingly).
- Examples of the EXACT shape we want:
  • "ask her directly — what are you actually looking for"
  • "don't push it tonight. see how she acts tomorrow"
  • "tell him you're into it but you wanna make sure she's good"
  • "you might be reading this wrong — check in before you spiral"
  • "leave it on read for a few hours. let him sweat a bit"
  • "just be honest about how you're feeling. she can take it"
- BAD examples (do not do these):
  • "just say it" (too short, no specificity)
  • "send: hey i miss you" (literal script)
  • "be confident ✨" (pure stance, no suggestion)
- All 4 must be plausibly different reads of the same situation. NONE are right or wrong.

== OUTPUT ==
Return ONLY this JSON shape, no prose, no markdown:
{
  "friend": ["msg 1", "msg 2"],
  "cards": [
    { "label": "card text", "vibe": "direct" | "chill" | "bold" | "soft" | "chaos" }
  ]
}`;

function buildSystem(friendContext?: string) {
  if (!friendContext) return BASE_SYSTEM;
  return `${BASE_SYSTEM}\n\n== THIS SESSION'S FRIEND ==\n${friendContext}\n== END FRIEND ==\n\nEvery message and card must sound like THIS friend specifically. Match their voice exactly. Keep the situation grounded in their specific ongoing thing.`;
}

function turnInstruction(turnNum: number, chosenCard?: string): string {
  const advice = chosenCard
    ? `The player just texted me back: "${chosenCard}". I read it.`
    : "";
  switch (turnNum) {
    case 1:
      return `THIS IS TURN 1 of 4 (OPEN). I open the convo. Casual greeting + briefly drop what just happened, holding back a key detail. Return JSON only.`;
    case 2:
      return `${advice} THIS IS TURN 2 of 4 (REACT + PARTIAL REVEAL). React in voice, then add ONE new piece of info that adds shape but doesn't resolve. Return JSON only.`;
    case 3:
      return `${advice} THIS IS TURN 3 of 4 (RECONTEXTUALIZE). React in voice, then drop a detail I "forgot to mention" or "wasn't gonna say" that makes the player rethink the situation. This is the pivot. Return JSON only.`;
    case 4:
    default:
      return `${advice} THIS IS TURN 4 of 4 (CLOSE OPEN). React in voice, then sign off naturally like a real teen ("ok ill update u", "wish me luck", "k im going in"). Do NOT add a moral or summary. Still return 4 advice cards. Return JSON only.`;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const history: AnthropicMsg[] = Array.isArray(body.history) ? body.history : [];
    const chosenCard: string | undefined = body.chosenCard;
    const friendContext: string | undefined = body.friendContext;
    const isStart: boolean = body.start === true || history.length === 0;
    // turn the AI is generating: 1..4
    const turnNum: number = Math.max(1, Math.min(4, Number(body.turn) || (isStart ? 1 : history.length / 2 + 1)));

    const userTurn = turnInstruction(turnNum, chosenCard);

    const messages: AnthropicMsg[] = isStart
      ? [{ role: "user", content: userTurn }]
      : [...history, { role: "user", content: userTurn }];

    const raw = await callClaude(messages, buildSystem(friendContext));
    const parsed = extractJson(raw);

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
