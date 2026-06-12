"use client";

import { useState } from "react";
import { Grid3X3 } from "lucide-react";
import { MinigameHubShell } from "@/components/minigames/minigame-hub-shell";
import type { GamePlayMode } from "@/lib/games-lobby";

const GAME_ID = "omok";

export function OmokHubClient() {
  const [mode, setMode] = useState<GamePlayMode>("friends");

  return (
    <MinigameHubShell
      gameId={GAME_ID}
      routeBase="/omok"
      title="오목"
      description="15×15 보드 · 친구 방 또는 랜덤 1:1 매칭 · 관전 지원"
      icon={Grid3X3}
      mode={mode}
      onModeChange={setMode}
    />
  );
}
