"use client";

import { useState } from "react";
import { Type } from "lucide-react";
import { MinigameHubShell } from "@/components/minigames/minigame-hub-shell";
import type { GamePlayMode } from "@/lib/games-lobby";

export function WordChainHubClient() {
  const [mode, setMode] = useState<GamePlayMode>("friends");

  return (
    <MinigameHubShell
      gameId="word-chain"
      routeBase="/word-chain"
      title="끝말잇기"
      description="실시간 턴제 · 사전 검증 · 2~6인"
      icon={Type}
      mode={mode}
      onModeChange={setMode}
    />
  );
}
