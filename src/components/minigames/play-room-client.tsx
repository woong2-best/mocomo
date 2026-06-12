"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMinigameRoom } from "@/hooks/use-minigame-room";
import type { MinigamePublicState } from "@/lib/minigames/shared-types";
import { getMinigameById } from "@/lib/minigames/registry";
import { getMinigameRoute } from "@/lib/minigames/game-meta";
import {
  MinigameFinishedBanner,
  MinigameLobbyPanel,
} from "@/components/minigames/minigame-lobby-panel";
import { GameActiveView } from "@/components/minigames/game-views";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export function PlayRoomClient({
  gameId,
  roomId,
  mode,
}: {
  gameId: string;
  roomId: string;
  mode: "create" | "join" | "spectate";
}) {
  const game = getMinigameById(gameId);
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const username =
    session?.user?.name || session?.user?.username || session?.user?.email || "플레이어";

  const { state, error, joined, isHost, setReady, startGame, sendMove, setError } =
    useMinigameRoom(gameId, roomId, userId, username, mode);

  const isSpectator = mode === "spectate";
  const route = getMinigameRoute(gameId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link href={route} className="text-xs text-muted-foreground hover:underline">
          ← {game?.name ?? "게임"} 로비
        </Link>
        {!isSpectator && (
          <Link href={`${route}/${roomId}?spectate=1`}>
            <Button variant="outline" size="sm" className="gap-1 rounded-lg text-xs">
              <Eye className="h-3 w-3" />
              관전
            </Button>
          </Link>
        )}
        {isSpectator && (
          <span className="text-xs font-semibold text-folk-cobalt bg-folk-gold/20 px-2 py-1 rounded">
            관전 중
          </span>
        )}
      </div>

      {state && <MinigameFinishedBanner state={state} />}

      {state?.status === "lobby" && !isSpectator && (
        <MinigameLobbyPanel
          state={state}
          joined={joined}
          error={error}
          userId={userId}
          isHost={isHost}
          onReady={(r) => void setReady(r)}
          onStart={() => void startGame()}
        />
      )}

      {state?.status === "playing" && (
        <GameActiveView
          gameId={gameId}
          state={state}
          userId={userId}
          isSpectator={isSpectator}
          onMove={(m) => sendMove(m)}
          error={error}
          onClearError={() => setError(null)}
        />
      )}

      {joined && !state && error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
