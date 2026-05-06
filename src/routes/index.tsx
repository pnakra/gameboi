import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GameScreen, type EndPayload } from "@/components/game/GameScreen";
import { FriendSelect } from "@/components/game/FriendSelect";
import { ModeSelect } from "@/components/game/ModeSelect";
import { EndCard } from "@/components/game/EndCard";
import { Interstitial } from "@/components/game/Interstitial";
import { FRIENDS, type Friend, isUnlocked, markUnlocked } from "@/components/game/friends";
import { getMode, type Mode, DEFAULT_MODE } from "@/components/game/modes";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "gameboi" },
      { name: "description", content: "your friend just texted. play your move." },
      { property: "og:title", content: "gameboi" },
      { property: "og:description", content: "your friend just texted. play your move." },
    ],
  }),
  component: Index,
});

type Stage = "select" | "mode" | "play" | "end" | "interstitial";

function Index() {
  const [stage, setStage] = useState<Stage>("select");
  const [friend, setFriend] = useState<Friend | null>(null);
  const [mode, setMode] = useState<Mode>(getMode(DEFAULT_MODE));
  const [endPayload, setEndPayload] = useState<EndPayload | null>(null);
  // Bump to remount GameScreen on "play again"
  const [playKey, setPlayKey] = useState(0);

  // Deep link: ?friend=<id> drops the user straight into that round, skipping
  // the friend select (and mode select) screens. Defaults to the standard
  // 1:1 guy-friend mode so the experience matches the creative.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("friend")?.toLowerCase();
    if (!requested) return;
    const match = FRIENDS.find((f) => f.id === requested);
    if (!match) return;
    if (match.locked && !isUnlocked()) markUnlocked();
    track("deep_link_friend", { friend_id: match.id });
    const requestedMode = params.get("mode");
    setMode(getMode(requestedMode ?? DEFAULT_MODE));
    setFriend(match);
    setStage("play");
  }, []);

  if (stage === "play" && friend) {
    return (
      <GameScreen
        key={playKey}
        friend={friend}
        mode={mode}
        onExit={() => {
          setFriend(null);
          setStage("select");
        }}
        onEnd={(payload) => {
          setEndPayload(payload);
          setStage("end");
        }}
      />
    );
  }

  if (stage === "end" && friend && endPayload) {
    return (
      <EndCard
        friend={friend}
        transcript={endPayload.transcript}
        onPlayAgain={() => setStage("interstitial")}
        onSwitchFriend={() => {
          setEndPayload(null);
          setFriend(null);
          setStage("select");
        }}
      />
    );
  }

  if (stage === "interstitial" && friend) {
    return (
      <Interstitial
        onContinue={() => {
          setEndPayload(null);
          setPlayKey((k) => k + 1);
          setStage("play");
        }}
      />
    );
  }

  if (stage === "mode" && friend) {
    return (
      <ModeSelect
        friend={friend}
        onPick={(m) => {
          setMode(m);
          setStage("play");
        }}
        onBack={() => {
          setFriend(null);
          setStage("select");
        }}
      />
    );
  }

  return (
    <FriendSelect
      onPick={(f) => {
        setFriend(f);
        setStage("mode");
      }}
    />
  );
}
