"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { MinigameHubShell } from "@/components/minigames/minigame-hub-shell";
import type { GamePlayMode } from "@/lib/games-lobby";

export function RpsHubClient() {
  const [mode, setMode] = useState<GamePlayMode>("friends");

  return (
    <MinigameHubShell
      gameId="rps"
      routeBase="/rps"
      title="가위바위보"
      description="3판 2선승 · 친구 방 / 랜덤 1:1 매칭"
      icon={Zap}
      mode={mode}
      onModeChange={setMode}
    />
  );
}
