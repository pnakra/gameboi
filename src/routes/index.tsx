import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GameScreen, type EndPayload } from "@/components/game/GameScreen";
import { FriendSelect } from "@/components/game/FriendSelect";
import { EndCard } from "@/components/game/EndCard";
import { Interstitial } from "@/components/game/Interstitial";
import type { Friend } from "@/components/game/friends";

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

type Stage = "select" | "play" | "end" | "interstitial";

function Index() {
  const [stage, setStage] = useState<Stage>("select");
  const [friend, setFriend] = useState<Friend | null>(null);
  const [endPayload, setEndPayload] = useState<EndPayload | null>(null);
  // Bump to remount GameScreen on "play again"
  const [playKey, setPlayKey] = useState(0);

  if (stage === "play" && friend) {
    return (
      <GameScreen
        key={playKey}
        friend={friend}
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

  return (
    <FriendSelect
      onPick={(f) => {
        setFriend(f);
        setStage("play");
      }}
    />
  );
}
