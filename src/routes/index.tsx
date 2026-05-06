import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GameScreen, type EndPayload } from "@/components/game/GameScreen";
import { FriendSelect } from "@/components/game/FriendSelect";
import { ModeSelect } from "@/components/game/ModeSelect";
import { EndCard } from "@/components/game/EndCard";
import { Interstitial } from "@/components/game/Interstitial";
import { FRIENDS, type Friend, isUnlocked, markUnlocked } from "@/components/game/friends";
import { MODES, DEFAULT_MODE, getMode, type Mode } from "@/components/game/modes";
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
  const [mode, setMode] = useState<Mode>(() => getMode(DEFAULT_MODE));
  const [endPayload, setEndPayload] = useState<EndPayload | null>(null);
  // Bump to remount GameScreen on "play again"
  const [playKey, setPlayKey] = useState(0);

  // Deep link: ?friend=<id>&mode=<id> drops the user straight into that round,
  // skipping both the friend select AND mode select screens. Used by ad
  // campaigns so users land in the exact scenario the creative showed.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("friend")?.toLowerCase();
    if (!requested) return;
    const matchFriend = FRIENDS.find((f) => f.id === requested);
    if (!matchFriend) return;

    const requestedMode = params.get("mode")?.toLowerCase();
    const matchMode =
      MODES.find((m) => m.id === requestedMode) ?? getMode(DEFAULT_MODE);

    // Locked friends are gated behind one completed round — but for deep-link
    // ad traffic, unlock immediately so the experience matches the creative.
    if (matchFriend.locked && !isUnlocked()) markUnlocked();
    track("deep_link_friend", {
      friend_id: matchFriend.id,
      mode_id: matchMode.id,
    });
    setFriend(matchFriend);
    setMode(matchMode);
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
