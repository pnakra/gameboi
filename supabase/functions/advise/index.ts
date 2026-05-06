// Edge function: generates the next scene from Claude based on prior scene + chosen card.
// Drives a dynamic 6–10 exchange arc with progressive reveals. Also generates the end-of-round recap.

const MIN_EXCHANGES = 6;
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
- COMPLICATION (exchanges 2–3): This is where the situation gets weight. Drop or build on a recontextualizing detail — something he "forgot to mention" / "wasn't gonna say but" / "ok i didn't tell u this part" — that makes the player rethink the read. Push past the surface. The strongest pivots are about consent, boundaries, signals that got missed, or moments where one person wasn't fully there. Examples of the SHAPE (not to copy literally): "she said wait and i did but now she's not texting back", "i think she was more drunk than i realized", "she froze for a sec and i didn't stop right away", "i kept going after she got quiet", "she said she was fine after but hasn't responded all day". The reveal should land naturally in his texting voice — fragmented, unsure, not articulate about what he's actually scared of. NOT graphic. NOT detailed. The friend is wrestling with whether something was ok, not narrating what happened. The pivot must land by exchange 3.
- HEAD (exchanges 4–6): Things come to a point. Friend is about to do something / a decision moment / he's logging off. Sign off naturally on the final exchange ("ok wish me luck", "ill update u", "k im going in", "idk man im just gonna sit with this"). NO moral, NO summary, NO verdict. Situation stays unresolved emotionally.

You decide WHEN to end within the 4–6 window based on what feels natural. Set "done": true on the exchange that should be the last one. The server forces the ending if you reach exchange ${MAX_EXCHANGES} and forces continuation if you try to end before exchange ${MIN_EXCHANGES}.

== CARDS (3 advice cards per exchange) ==
Each card has TWO parts:
  • "label" — a short summary of the advice the player is giving the friend, written ABOUT the friend in third/second person ("tell him to...", "ask her...", "back off"). This is what shows on the card face.
  • "say" — the ACTUAL text message the player would send to the friend in their own voice, first-person, talking TO the friend like a real person texting. This is what gets sent as the player's bubble in the chat.

The label is the strategy. The "say" is the words. They must match in meaning but read completely differently — never identical, never near-identical.

LABEL — STRICT: 6–14 words. Verb-led, directed at the friend ("tell him to...", "ask her...", "don't push it", "back off", "own it", "check in"). Mostly lowercase. No quotes. Like the title of the move.

SAY — STRICT: How the player would actually text the friend. First-person from the player, second-person to the friend ("you", "u", "bro", "dude", or just direct). Casual texting voice — fragments, lowercase, contractions, occasional shorthand (idk, fr, ngl, tbh, lowkey). 1 short sentence, sometimes 2. Under ~120 chars. No quotes around it. NEVER starts with "tell him" / "tell her" / "ask her" — those are label words, not text-message words.

Examples (label → say):
  • "tell him to just ask if she's doing okay"  →  "just ask her if she's good. doesn't have to be deep"
  • "tell him to back off tonight and see how she acts tomorrow"  →  "give it the night man. see how she's acting tmrw before u do anything"
  • "get him to check in before he spirals"  →  "you're spiraling a little. just check in with her instead of guessing"
  • "tell him to actually own it"  →  "just own it bro. 'hey i couldn't tell if that was ok and it's been on my mind'"
  • "tell him to leave it on read for a few hours"  →  "leave it for a few hrs. let her sit with it"
  • "ask her directly what she's looking for"  →  "honestly just ask her straight up what she actually wants here"

NEVER write the label as the message itself ("just say it", "send: hey i miss you"). NEVER write the "say" as advice about the friend ("tell him to chill"). The label is the move; the "say" is the text.

All 3 must be plausibly different reads of the same moment. NONE are right or wrong. Once the complication has landed, at least one card should engage with it directly (not avoid it) — but never moralize or signal that engaging is the "correct" choice.

Vibes available: direct, chill, bold, soft, chaos. Use 3 different ones per exchange.

== OUTPUT ==
Return ONLY this JSON, no prose, no markdown:
{
  "friend": ["msg 1", "msg 2"],
  "cards": [
    { "label": "card text", "say": "what the player actually texts", "vibe": "direct" | "chill" | "bold" | "soft" | "chaos" }
  ],
  "done": false
}
Set "done": true only on the exchange you intend to be the last (between exchange ${MIN_EXCHANGES} and ${MAX_EXCHANGES}).

== ROSTER (group-chat modes only — REQUIRED if you generated any side characters) ==
If this session is a group chat AND you have invented side characters (anyone other than the main friend speaking in the thread), you MUST also return a "roster" array listing EVERY speaker that appears in the thread including the main friend. Use the EXACT same lowercase names as in the "friend:" prefixes. Each entry: { "name": "lowercase-name", "gender": "m" | "f" }. Keep the roster CONSISTENT across every exchange in the session — same names, same genders, every time. For solo modes (1:1) omit the roster entirely.

Updated output shape with roster:
{
  "friend": ["name: msg 1", "name: msg 2"],
  "cards": [...],
  "roster": [{ "name": "dev", "gender": "m" }, { "name": "tyler", "gender": "m" }, { "name": "kai", "gender": "m" }],
  "done": false
}`;

// === MODE-SPECIFIC ADDENDUM (recap) ===
const RECAP_ADDENDUM = `
== FORMAT (recap mode) ==

Generate a brief end-of-round reflection for the player. You will be given the full thread. In the thread, lines prefixed "player advice:" are what the PLAYER ("you") said back to the friend. Lines prefixed with the friend's name are the friend.

The recap has TWO beats and MUST contain BOTH:
1. SITUATION (1-2 sentences): briefly recap the friend's situation as it landed — name the friend, name the other person if mentioned, and the core ambiguity or thing he was sitting with. Past tense.
2. WHAT YOU DID (1-2 sentences): what the PLAYER ("you") specifically said or pointedly DIDN'T say back. Quote a short fragment of the player's actual wording when it lands. Name 1-2 specific moves or notable omissions. Don't praise or criticize. Just hold it up.

The question at the end should pivot off one of those player choices — turning the lens back on the player. Not "what would you do differently" — more like "you didn't bring up the phone thing — what would it have cost you to?" or "you called her messy — is that the read or the easier read?"

Output JSON ONLY:
{
  "recap": "3-4 sentences total. First the situation (friend + other person + core tension). Then what you said/didn't say with a short quoted fragment. Past tense. Lowercase ok. Neutral — no 'good'/'bad'/'should have'. No verdict on the friend.",
  "question": "ONE genuine open question that turns one of the player's specific choices back on them. Not rhetorical. Not leading. One sentence."
}

Never reference scoring, performance, or right answers. The recap should feel like the last beat of a real conversation with someone who noticed exactly what you said and didn't say — and isn't telling you what to think about it.`;

// === MODE-SPECIFIC ADDENDUM (mid-round review) ===
const REVIEW_ADDENDUM = `
== FORMAT (mid-round review mode) ==

You are generating a mid-round review card for a consent education game. You have access to the full conversation history so far between the player and their friend. Your job is to identify the single most significant moment in the conversation and surface it specifically — not a general observation about the player's style, but a reference to something that was actually said.

You will be told which review this is (1 of 2 or 2 of 2), the thread so far, and — for review #2 — the observation that was surfaced at review #1. Lines prefixed "player advice:" are what the PLAYER said. Other lines are prefixed with the speaker's name (the main friend, plus in group-chat sessions, additional characters with their own names).

Look for one of the following:

A FLAG THAT WENT UNADDRESSED — a detail the friend mentioned that changed the situation (alcohol, hesitation, going quiet, someone else knowing something) that the player's advice didn't acknowledge. Reference it directly.
  Shape: "when dev mentioned she was pretty drunk, you told him to keep initiating — that detail didn't come up again."

A STOPPING POINT THAT GOT SKIPPED — a natural moment where the situation called for pause and the player's card kept things moving instead. Reference the specific exchange.
  Shape: "she said she wasn't sure, and you advised him to stay the course — worth sitting with why."

A MOMENT THE PLAYER HANDLED GENUINELY WELL — something specific they caught that most people miss. Reference it.
  Shape: "you noticed he was being impulsive about her story posts and told him to wait — that's the signal most players blow past."

== RULES — STRICT ==

- Always reference a specific moment. Never speak in generalities.
- Two sentences maximum.
- No verdict — observe, don't judge.
- Lowercase throughout.
- Do not use the word "consent."
- Do not moralize.
- Do not summarize the whole conversation — zoom in on one moment only.
- No emoji. No exclamation marks. No questions.
- Use the friend's name (you'll be told it). In group sessions, also use side characters' names that actually appear in the thread.

== IF THIS IS REVIEW #2 ==

Build on the first card — do not start fresh. The second card should feel like a continuation of the same conversation, not a fresh observation.
- If the first card flagged something unaddressed, note whether the player course-corrected or not (look at the messages since review #1).
- If the first card affirmed something, note whether they maintained it.
- Reference the first observation lightly so the continuity is felt, then zoom in on the specific moment that proves the follow-up.

Output JSON ONLY:
{
  "observation": "one or two lowercase sentences, zoomed in on one specific moment.",
  "kind": "skipped" | "dropped" | "positive" | "group"
}`;

// === MODE-SPECIFIC ADDENDUM (handoff) ===
const HANDOFF_ADDENDUM = `
== FORMAT (handoff mode) ==

Generate a short situation summary that will be pasted into a separate reflection tool (isthisok.app) as the user's own opening note to themselves. The user is the player — they are taking the situation somewhere else to keep sitting with it. Write it AS THE USER would write it about their own life — first person ("i"), unfiltered, the way you'd type into a private reflection box.

In the thread you'll receive, lines prefixed "player advice:" are what the USER ("i") said to the friend. Lines prefixed with the friend's name are the friend.

CRITICAL: The output MUST contain BOTH paragraphs below, separated by a single blank line. Do NOT omit the second paragraph. Do NOT merge them. Do NOT add headers, quotes, or "summary:" prefixes.

PARAGRAPH 1 — THIRD-PERSON SITUATION (2-3 sentences): The friend's situation as it stands. Use the friend's NAME (you'll be told it). No judgment, no advice, no verdict. Just the situation. Example shape: "marcus has been in a situationship with riley for a few months. recently things got physical and he's not sure she was fully into it. he's been going back and forth about whether to bring it up."

[BLANK LINE HERE]

PARAGRAPH 2 — FIRST-PERSON USER REFLECTION (2-3 sentences, REQUIRED): What I said / didn't say to him, in MY voice. Use "i" — never "you", never "the player". MUST reference 1-2 specific things i did using a short quoted fragment of my actual wording from the "player advice:" lines — a phrase i used, an angle i took, or a notable thing i sidestepped. End with an honest question i'm asking myself about that choice. Example shape: "i told him to 'just chill' and i didn't bring up the phone thing at all. is that actually what i think, or just the easier read?"

Lowercase ok throughout. No moralizing. Don't address the friend. Don't address a "you" — it's the user talking to themselves.

Output JSON ONLY:
{ "situation": "paragraph 1\\n\\nparagraph 2" }`;

function buildSystem(
  mode: "turn" | "recap" | "handoff" | "review",
  friendContext?: string,
  modeDirective?: string,
) {
  const addendum =
    mode === "recap"
      ? RECAP_ADDENDUM
      : mode === "handoff"
      ? HANDOFF_ADDENDUM
      : mode === "review"
      ? REVIEW_ADDENDUM
      : TURN_ADDENDUM;
  const friendBlock = friendContext
    ? `\n\n== THIS SESSION'S FRIEND ==\n${friendContext}\n== END FRIEND ==\n\nEvery message and card must sound like THIS friend specifically. Match his voice. Keep the situation grounded in his specific ongoing thing.`
    : "";
  const modeBlock = modeDirective
    ? `\n\n== THIS SESSION'S MODE ==\n${modeDirective}\n== END MODE ==`
    : "";
  return `${MASTER_PROMPT}\n${addendum}${friendBlock}${modeBlock}`;
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
    const mode: "turn" | "recap" | "handoff" | "review" =
      body.mode === "recap"
        ? "recap"
        : body.mode === "handoff"
        ? "handoff"
        : body.mode === "review"
        ? "review"
        : "turn";
    const history: AnthropicMsg[] = Array.isArray(body.history) ? body.history : [];
    const friendContext: string | undefined = body.friendContext;
    const modeDirective: string | undefined =
      typeof body.modeDirective === "string" && body.modeDirective.trim()
        ? body.modeDirective
        : undefined;

    // ---------- RECAP MODE ----------
    if (mode === "recap") {
      const transcript: string = String(body.transcript || "");
      const userTurn = `Here is the full thread. Generate the recap + open question.\n\n${transcript}`;
      const raw = await callClaude(
        [{ role: "user", content: userTurn }],
        buildSystem("recap", friendContext, modeDirective),
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

    // ---------- REVIEW MODE (mid-round observation at halfway point) ----------
    if (mode === "review") {
      const transcript: string = String(body.transcript || "");
      const friendName: string = String(body.friendName || "your friend");
      const reviewIndex: 1 | 2 = body.reviewIndex === 2 ? 2 : 1;
      const previousObservation: string =
        typeof body.previousObservation === "string" ? body.previousObservation.trim() : "";
      const reviewLabel = reviewIndex === 1 ? "REVIEW #1 OF 2" : "REVIEW #2 OF 2";
      const priorBlock =
        reviewIndex === 2 && previousObservation
          ? `\n\nPREVIOUS OBSERVATION (from review #1 — build on this, don't repeat it):\n"${previousObservation}"`
          : "";
      const userTurn = `${reviewLabel}. The friend's name is "${friendName}". Here is the thread so far. Generate the mid-round observation per the rules — point to a specific exchange, quote or paraphrase what was said, two sentences max.${priorBlock}\n\nTHREAD:\n${transcript}`;
      const raw = await callClaude(
        [{ role: "user", content: userTurn }],
        buildSystem("review", friendContext, modeDirective),
      );
      const parsed = extractJson(raw);
      const kind = ["skipped", "dropped", "positive", "group"].includes(parsed.kind) ? parsed.kind : "skipped";
      return new Response(
        JSON.stringify({
          observation: String(parsed.observation || "").slice(0, 320),
          kind,
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
        buildSystem("handoff", friendContext, modeDirective),
      );
      const parsed = extractJson(raw);
      return new Response(
        JSON.stringify({
          situation: String(parsed.situation || "").slice(0, 1400),
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

    const raw = await callClaude(messages, buildSystem("turn", friendContext, modeDirective));
    const parsed = extractJson(raw);

    // 3 AI advice cards per exchange.
    const cards = (parsed.cards || []).slice(0, 3).map((c: any, i: number) => {
      const label = String(c.label || "").slice(0, 140);
      const say = String(c.say || c.label || "").slice(0, 200);
      return {
        id: `${Date.now()}-${i}`,
        label,
        say,
        vibe: ["direct", "chill", "bold", "soft", "chaos"].includes(c.vibe) ? c.vibe : "chill",
      };
    });

    // Decide whether this exchange is final.
    // Force continue before MIN, force end at MAX, otherwise honor model's `done`.
    const aiDone = parsed.done === true;
    const isFinal = exchange >= MAX_EXCHANGES || (exchange >= MIN_EXCHANGES && aiDone);

    // Roster (group modes) — list of {name, gender} for every speaker. Optional.
    const roster = Array.isArray(parsed.roster)
      ? parsed.roster
          .map((r: any) => ({
            name: String(r?.name || "").toLowerCase().trim(),
            gender: r?.gender === "f" ? "f" : "m",
          }))
          .filter((r: any) => r.name.length > 0 && r.name.length < 20)
          .slice(0, 6)
      : [];

    return new Response(
      JSON.stringify({
        friend: parsed.friend || [],
        cards,
        roster,
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
