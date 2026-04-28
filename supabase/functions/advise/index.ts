// Edge function: generates the next scene from Claude based on prior scene + chosen card.
// Drives a dynamic 6–10 exchange arc with progressive reveals. Also generates the end-of-round recap.

const MIN_EXCHANGES = 4;
const MAX_EXCHANGES = 6;
const FREETEXT_FROM = 3; // exchange number where input upgrades to free text on the client

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// === MASTER SYSTEM PROMPT ===
// Single source of truth for tone, ambiguity, never-shame, age safety, etc.
const MASTER_PROMPT = `You are generating content for a mobile game where the player advises a friend navigating ambiguous romantic and social situations. The player has chosen a friend with a specific character context which you will be given. All content should feel calibrated to that friend — his personality, his situation, his communication style.

Situations involve genuine ambiguity — mixed signals, unclear communication, alcohol, new vs. established relationships, hook-up situations, digital communication, and sexual situations where consent is ambiguous, boundaries got crossed, signals got misread, or one person isn't sure how to read what the other wanted. Write to this territory directly. Things going further than expected, someone freezing, mixed signals leading somewhere complicated — that's the material. There are no correct answers. Never imply one choice was better than another. Show realistic mixed consequences — every choice has something going for it and something that complicates things.

Situations should feel real enough that a player might recognize themselves or someone they know in them. Don't sanitize. Don't euphemize past the point a real friend would. But: not pornographic, not explicit, no lingering on physical detail for its own sake. The friend is texting about what happened and how he's sitting with it, not narrating it blow-by-blow. Characters have no specified age.

Information is revealed gradually across an exchange. Early exchanges establish the situation. Middle exchanges introduce a complication that recontextualizes something said earlier — something he left out, something he only now mentions, a detail that shifts the read. Final exchanges bring things to a head. The player should never feel they had the full picture from the start.

Tone of the friend's texts: exactly how a guy actually texts a close friend about something he's unsure about. Casual, slightly fragmented, real. Not articulate about his feelings. Uses shorthand. Not "I am experiencing confusion about whether she consented" — more like "idk man she seemed into it but then she got quiet and I don't know."

Advice cards (and the player's own free-text replies later in the exchange) should feel like real advice — directional but not scripted. Generate cards contextually relevant to the current moment in the conversation.

Never shame. Never lecture. Never signal a verdict.`;

// === MODE-SPECIFIC ADDENDUM (turn engine) ===
const TURN_ADDENDUM = `
== FORMAT (turn engine mode) ==

Real teen texting voice. Mostly lowercase. Slang & emojis sparingly and naturally (😭 💀 🙏 ✨ 🥲 🫠). Common shorthand ok (idk, fr, lowkey, ngl, tbh, bro). NEVER "rizz", "skibidi", "gyatt", or try-hard slang. NEVER narrate (no "*she walks in*"). Pure texting only.

Keep messages SHORT. 1-3 bubbles per exchange. Each usually under ~80 chars. Break thoughts across bubbles like real texting.

== EXCHANGE ARC (4–6 exchanges total — keep it tight) ==
The conversation runs between ${MIN_EXCHANGES} and ${MAX_EXCHANGES} exchanges. You will be told which exchange this is and which phase you are in. The whole session should land under ~2 minutes — every exchange has to earn its place.

- SETUP (exchange 1): Friend opens. Briefly drop what just happened, holding back at least one key detail. Casual, not over-explained.
- COMPLICATION (exchanges 2–3): Drop or build on a recontextualizing detail — something he "forgot to mention" / "wasn't gonna say but" — that makes the player rethink the read. The pivot must land by exchange 3.
- HEAD (exchanges 4–6): Things come to a point. Friend is about to do something / a decision moment / he's logging off. Sign off naturally on the final exchange ("ok wish me luck", "ill update u", "k im going in"). NO moral, NO summary, NO verdict. Situation stays unresolved emotionally.

You decide WHEN to end within the 4–6 window based on what feels natural. Set "done": true on the exchange that should be the last one. The server forces the ending if you reach exchange ${MAX_EXCHANGES} and forces continuation if you try to end before exchange ${MIN_EXCHANGES}.

== CARDS (3 advice cards per exchange) ==
Each card = ORIENTATION + SPECIFIC SUGGESTION. NOT pure stance. NOT a literal script.
Advice is FROM THE PLAYER TO THE FRIEND ("ask her", "tell him", "don't push it"). 8–16 words. Mostly lowercase. No quotes. Emojis rarely.

Good shape:
  • "ask her directly — what are you actually looking for"
  • "don't push it tonight. see how she acts tomorrow"
  • "you might be reading this wrong — check in before you spiral"
  • "leave it on read for a few hours. let him sweat a bit"
Bad: "just say it" (too vague). "send: hey i miss you" (literal script). "be confident ✨" (pure stance).

All 3 must be plausibly different reads of the same moment. NONE are right or wrong.

Vibes available: direct, chill, bold, soft, chaos. Use 3 different ones per exchange.

NOTE: From exchange ${FREETEXT_FROM} onward the player can also write a free-text reply, so cards become optional starting points rather than the only way to respond. Keep generating 3 cards every exchange regardless — they are also used as suggestions in the input field.

== OUTPUT ==
Return ONLY this JSON, no prose, no markdown:
{
  "friend": ["msg 1", "msg 2"],
  "cards": [
    { "label": "card text", "vibe": "direct" | "chill" | "bold" | "soft" | "chaos" }
  ],
  "done": false
}
Set "done": true only on the exchange you intend to be the last (between exchange ${MIN_EXCHANGES} and ${MAX_EXCHANGES}).`;

// === MODE-SPECIFIC ADDENDUM (recap) ===
const RECAP_ADDENDUM = `
== FORMAT (recap mode) ==

Generate a brief end-of-round reflection for the player. You will be given the full thread. In the thread, lines prefixed "player advice:" are what the PLAYER ("you") said back to the friend. Lines prefixed with the friend's name are the friend.

The recap MUST reflect what the player actually chose to say (and importantly, what they DIDN'T bring up that maybe was sitting there). Address the player as "you". Name 1-2 specific moves they made or noticeably skipped — quote a short fragment of their wording when it lands. Don't praise or criticize the choice. Just hold it up.

The question at the end should pivot off one of those choices — turning the lens back on the player. Not "what would you do differently" — more like "you didn't bring up the phone thing — what would it have cost you to?" or "you called her messy — is that the read or the easier read?"

Output JSON ONLY:
{
  "recap": "2-3 sentences. Past tense. Lowercase ok. References at least one specific thing the player said or pointedly didn't say. Neutral — no 'good'/'bad'/'should have'. No verdict on the friend.",
  "question": "ONE genuine open question that turns one of the player's specific choices back on them. Not rhetorical. Not leading. One sentence."
}

Never reference scoring, performance, or right answers. The recap should feel like the last beat of a real conversation with someone who noticed exactly what you said and didn't say — and isn't telling you what to think about it.`;

// === MODE-SPECIFIC ADDENDUM (handoff) ===
const HANDOFF_ADDENDUM = `
== FORMAT (handoff mode) ==

Generate a short situation summary that will be pasted into a separate reflection tool as the opening context. The user is handing the situation off to keep thinking it through somewhere else.

In the thread you'll receive, lines prefixed "player advice:" are what the PLAYER ("you") said back to the friend. Lines prefixed with the friend's name are the friend.

Structure (plain prose, two short paragraphs separated by a blank line, no headers, no quotes around it, no "summary:" prefix):

1. THIRD-PERSON SITUATION (2-3 sentences): The friend's situation as it stands. Use the friend's NAME (you'll be told it). Past/present tense as appropriate. No judgment, no advice, no verdict. Just the situation. Example shape: "marcus has been in a situationship with riley for a few months. recently things got physical but he's not sure she was fully into it. he's been going back and forth about whether to bring it up."

2. SECOND-PERSON PLAYER MOVES (1-2 sentences): What YOU said / didn't say in the thread, addressed to the player as "you". Reference 1-2 specific things — a phrase they used, an angle they took, or a notable thing they sidestepped. End with an honest question turning that back on them. Example shape: "you told him to just let it go and didn't bring up the phone thing at all. do you actually think that's the read, or is it the easier one?"

Lowercase ok throughout. No moralizing. Don't address the friend.

Output JSON ONLY:
{ "situation": "the two-paragraph summary" }`;

function buildSystem(mode: "turn" | "recap" | "handoff", friendContext?: string) {
  const addendum =
    mode === "recap"
      ? RECAP_ADDENDUM
      : mode === "handoff"
      ? HANDOFF_ADDENDUM
      : TURN_ADDENDUM;
  const friendBlock = friendContext
    ? `\n\n== THIS SESSION'S FRIEND ==\n${friendContext}\n== END FRIEND ==\n\nEvery message and card must sound like THIS friend specifically. Match his voice. Keep the situation grounded in his specific ongoing thing.`
    : "";
  return `${MASTER_PROMPT}\n${addendum}${friendBlock}`;
}

function phaseFor(exchange: number): "setup" | "complication" | "head" {
  if (exchange <= 1) return "setup";
  if (exchange <= 3) return "complication";
  return "head";
}

function turnInstruction(exchange: number, chosenReply?: string): string {
  const reply = chosenReply
    ? `The player just texted me back: "${chosenReply}". I read it.`
    : "";
  const phase = phaseFor(exchange);
  const isOpener = exchange === 1;
  const mustEnd = exchange >= MAX_EXCHANGES;
  const canEnd = exchange >= MIN_EXCHANGES;

  let phaseGuidance = "";
  if (phase === "setup") {
    phaseGuidance = isOpener
      ? `Open the convo. Casual greeting + briefly drop what just happened, holding back a key detail.`
      : `We're still in SETUP. React in voice, add small new shape, hold back the bigger detail.`;
  } else if (phase === "complication") {
    phaseGuidance = `We're in COMPLICATION. React in voice, then either drop or build on a recontextualizing detail — something you "forgot to mention" / "wasn't gonna say but" — that makes the player rethink the read. This is the pivot phase.`;
  } else {
    phaseGuidance = `We're in HEAD. Things are coming to a point. React in voice. Either escalate toward a decision or sign off naturally if this is the last exchange.`;
  }

  let endingGuidance = "";
  if (mustEnd) {
    endingGuidance = `THIS IS EXCHANGE ${exchange} OF MAX ${MAX_EXCHANGES}. You MUST end here. Sign off naturally ("ok wish me luck", "ill update u", "k im going in"). NO moral, NO summary. Set "done": true.`;
  } else if (canEnd) {
    endingGuidance = `You may set "done": true if this exchange feels like a natural sign-off (decision moment, friend going to do the thing, friend logging off). Otherwise keep it going. Don't end artificially — only end if it lands.`;
  } else {
    endingGuidance = `Set "done": false. We're still before the minimum exchange count.`;
  }

  return `${reply} EXCHANGE ${exchange} of ${MAX_EXCHANGES} (phase: ${phase.toUpperCase()}). ${phaseGuidance} ${endingGuidance} Return JSON with "friend", 3 "cards", and "done".`;
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
    const mode: "turn" | "recap" | "handoff" =
      body.mode === "recap"
        ? "recap"
        : body.mode === "handoff"
        ? "handoff"
        : "turn";
    const history: AnthropicMsg[] = Array.isArray(body.history) ? body.history : [];
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

    // ---------- HANDOFF MODE (third-person situation summary for ito) ----------
    if (mode === "handoff") {
      const transcript: string = String(body.transcript || "");
      const friendName: string = String(body.friendName || "your friend");
      const userTurn = `The friend's name is "${friendName}". Here is the thread so far. Generate the third-person situation summary that will be passed into a separate reflection tool.\n\n${transcript}`;
      const raw = await callClaude(
        [{ role: "user", content: userTurn }],
        buildSystem("handoff", friendContext),
      );
      const parsed = extractJson(raw);
      return new Response(
        JSON.stringify({
          situation: String(parsed.situation || "").slice(0, 800),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---------- NORMAL TURN MODE ----------
    // The client sends `exchange` (1..MAX). For backward compatibility also accept `turn`.
    // `chosenReply` is what the player sent (card label OR free-text).
    const isStart: boolean = body.start === true || history.length === 0;
    const rawExchange = Number(body.exchange ?? body.turn ?? 0);
    const exchange: number = isStart
      ? 1
      : Math.max(1, Math.min(MAX_EXCHANGES, rawExchange || Math.floor(history.length / 2) + 1));
    const chosenReply: string | undefined = body.chosenReply;

    const userTurn = turnInstruction(exchange, chosenReply);
    const messages: AnthropicMsg[] = isStart
      ? [{ role: "user", content: userTurn }]
      : [...history, { role: "user", content: userTurn }];

    const raw = await callClaude(messages, buildSystem("turn", friendContext));
    const parsed = extractJson(raw);

    // 3 AI advice cards per exchange.
    const cards = (parsed.cards || []).slice(0, 3).map((c: any, i: number) => ({
      id: `${Date.now()}-${i}`,
      label: String(c.label || "").slice(0, 140),
      vibe: ["direct", "chill", "bold", "soft", "chaos"].includes(c.vibe) ? c.vibe : "chill",
    }));

    // Decide whether this exchange is final.
    // Force continue before MIN, force end at MAX, otherwise honor model's `done`.
    const aiDone = parsed.done === true;
    const isFinal = exchange >= MAX_EXCHANGES || (exchange >= MIN_EXCHANGES && aiDone);

    return new Response(
      JSON.stringify({
        friend: parsed.friend || [],
        cards,
        assistantRaw: raw,
        exchange,
        phase: phaseFor(exchange),
        freeTextEnabled: exchange >= FREETEXT_FROM,
        isFinal,
        minExchanges: MIN_EXCHANGES,
        maxExchanges: MAX_EXCHANGES,
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
