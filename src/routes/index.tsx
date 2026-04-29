import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GameScreen, type EndPayload } from "@/components/game/GameScreen";
import { FriendSelect } from "@/components/game/FriendSelect";
import { EndCard } from "@/components/game/EndCard";
import { Interstitial } from "@/components/game/Interstitial";
import { FRIENDS, type Friend, isUnlocked, markUnlocked } from "@/components/game/friends";
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

type Stage = "select" | "play" | "end" | "interstitial";

function Index() {
  const [stage, setStage] = useState<Stage>("select");
  const [friend, setFriend] = useState<Friend | null>(null);
  const [endPayload, setEndPayload] = useState<EndPayload | null>(null);
  // Bump to remount GameScreen on "play again"
  const [playKey, setPlayKey] = useState(0);

  // Deep link: ?friend=<id> drops the user straight into that round, skipping
  // the friend select screen. Used by ad campaigns so users land in the
  // scenario they just watched in the creative.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("friend")?.toLowerCase();
    if (!requested) return;
    const match = FRIENDS.find((f) => f.id === requested);
    if (!match) return;
    // Locked friends are gated behind one completed round — but for deep-link
    // ad traffic, unlock immediately so the experience matches the creative.
    if (match.locked && !isUnlocked()) markUnlocked();
    track("deep_link_friend", { friend_id: match.id });
    setFriend(match);
    setStage("play");
  }, []);

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
