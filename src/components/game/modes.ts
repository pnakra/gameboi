export type ModeId = "solo_guy" | "group_guys" | "group_mixed";

export type Mode = {
  id: ModeId;
  label: string;
  sub: string;
  harder?: boolean;
  // Sent into the AI system prompt to recalibrate scenario + voices.
  promptDirective: string;
};

export const MODES: Mode[] = [
  {
    id: "solo_guy",
    label: "just you and him",
    sub: "1:1 with your guy friend",
    promptDirective:
      "MODE: 1:1 with a guy friend. Standard mode — the player is texting the friend one-on-one. Only the named friend speaks. No other characters appear in the thread. Voice and dynamics as defined in the friend context.",
  },
  {
    id: "group_guys",
    label: "the boys chat",
    sub: "him plus two of his guys",
    harder: true,
    promptDirective: `MODE: Group chat — all guys. You are generating a group chat between the player and three guys including the named friend from the friend context. The named friend is still the protagonist asking for advice; the player is one of his friends in the chat advising him. Generate responses for the named friend PLUS two unnamed friends — one who tends to minimize or push forward, one who is more hesitant but inarticulate about it. Both additional voices should sound like real teenage guys, not archetypes.

INVENT the two additional guys: short lowercase first names (3-7 letters), KEEP THE NAMES + VOICES CONSISTENT across every exchange in this session. Neither is a villain, neither is the moral authority. The minimizer might be right sometimes; the hesitant one might be overthinking. The player has to navigate the tension.

== FORMAT — STRICT ==
Every entry in the "friend" array MUST be prefixed with the speaker's name and a colon, e.g.:
  ["dev: idk man she got real quiet at one point", "tyler: bro u prob fine she texted u first", "kai: idk dude that part… i guess just see"]
Use the EXACT same lowercase names you picked, every time.

== AFTER THE PLAYER PLAYS A CARD ==
The player's advice goes to the WHOLE GROUP. The next exchange shows TWO OR THREE characters reacting — including at least one of the side guys. They often react in CONTRADICTION: one cosigns, one hedges, the main friend lands somewhere in between. Don't resolve the tension cleanly.

== EXCHANGE RHYTHM ==
2-4 messages per exchange. The main friend still drives the arc — the complication still lands by exchange 3, the head still arrives at the end. Cards remain the player's advice to the MAIN friend in the existing voice — "tell him X". Side characters never get cards directed at them.`,
  },
  {
    id: "group_mixed",
    label: "guys and girls",
    sub: "his friends, mixed group",
    harder: true,
    promptDirective: `MODE: Group chat — mixed. You are generating a group chat where the named friend from the friend context is the protagonist asking his friends for advice, and the player is one of those friends. The thread includes the main friend plus 2-3 additional invented characters who are HIS FRIENDS — not the love interest, not the person the situation is about. AT LEAST ONE of these additional friends MUST be a girl who is part of his friend group. Her read on the situation should differ from the guys' read — not as moral authority, just a different seat at the table.

Invent the side characters with short lowercase first names (3-7 letters), distinct voices, KEPT CONSISTENT across every exchange. The girl(s) in the chat are platonic friends weighing in — they are NOT the romantic subject of the friend's situation. None of the friends are right, none are wrong — the differing reads are COMPLEXITY, not the answer.

== FORMAT — STRICT ==
Every entry in the "friend" array MUST be prefixed with the speaker's name and a colon:
  ["dev: idk man", "maya: ok but did u check if she was good after", "tyler: bro relax she's prob just hungover", "maya: tyler. seriously."]
Use the EXACT same lowercase names every time.

== EXCHANGE RHYTHM ==
2-4 messages per exchange. Capture group-chat texture: side characters can argue with each other in passing, the girl friend might call out the minimizer, the main friend cuts in to refocus. The main friend is still the protagonist — the complication still lands by exchange 3 and he still drives the arc. Cards from the player are still advice to the MAIN friend in the existing voice — "tell him X".`,
  },
];

export const DEFAULT_MODE: ModeId = "solo_guy";

export function getMode(id: string | undefined | null): Mode {
  return MODES.find((m) => m.id === id) ?? MODES[0];
}
