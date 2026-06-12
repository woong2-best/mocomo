"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMinigameRoom } from "@/hooks/use-minigame-room";
import type { RpsChoice, RpsPublicState } from "@/lib/minigames/shared-types";
import { RPS_LABELS } from "@/lib/minigames/rps-logic";
import {
  MinigameFinishedBanner,
  MinigameLobbyPanel,
} from "@/components/minigames/minigame-lobby-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const GAME_ID = "rps";
const CHOICES: RpsChoice[] = ["rock", "paper", "scissors"];

type Props = {
  roomId: string;
  mode: "create" | "join" | "spectate";
};

export function RpsRoomClient({ roomId, mode }: Props) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const username =
    session?.user?.name || session?.user?.username || session?.user?.email || "플레이어";

  const { state, error, joined, isHost, setReady, startGame, sendMove } = useMinigameRoom(
    GAME_ID,
    roomId,
    userId,
    username,
    mode
  );

  const rpsState = state as RpsPublicState | null;
  const isSpectator = mode === "spectate";
  const game = rpsState?.game;
  const canPick =
    rpsState?.status === "playing" &&
    game?.phase === "pick" &&
    !isSpectator &&
    userId &&
    game.picks[userId] == null;

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <Link href="/rps" className="text-xs text-muted-foreground hover:underline">
        ← 가위바위보 로비
      </Link>

      {rpsState && <MinigameFinishedBanner state={rpsState} />}

      {rpsState?.status === "lobby" && !isSpectator && (
        <MinigameLobbyPanel
          state={rpsState}
          joined={joined}
          error={error}
          userId={userId}
          isHost={isHost}
          onReady={(r) => void setReady(r)}
          onStart={() => void startGame()}
        >
          <p className="text-xs text-muted-foreground">3판 2선승제</p>
        </MinigameLobbyPanel>
      )}

      {rpsState?.status === "playing" && game && (
        <Card className="border-2 border-folk-cobalt/20">
          <CardContent className="p-6 space-y-4 text-center">
            <p className="text-sm font-semibold">
              {game.round} / {game.maxRounds}판
            </p>
            <div className="flex justify-center gap-4 text-sm">
              {rpsState.players.map((p) => (
                <div key={p.userId}>
                  <p className="font-medium">{p.username}</p>
                  <p className="text-folk-terracotta font-bold">{game.scores[p.userId] ?? 0}승</p>
                </div>
              ))}
            </div>

            {game.phase === "reveal" && game.lastRound && (
              <div className="rounded-xl bg-muted/40 p-3 text-sm space-y-1">
                {rpsState.players.map((p) => (
                  <p key={p.userId}>
                    {p.username}: {RPS_LABELS[game.lastRound!.picks[p.userId]!]}
                  </p>
                ))}
              </div>
            )}

            {canPick && (
              <div className="grid grid-cols-3 gap-2">
                {CHOICES.map((c) => (
                  <Button
                    key={c}
                    className="rounded-xl"
                    onClick={() => void sendMove(c)}
                  >
                    {RPS_LABELS[c]}
                  </Button>
                ))}
              </div>
            )}

            {game.phase === "pick" && userId && game.picks[userId] != null && (
              <p className="text-sm text-muted-foreground">상대 선택 대기…</p>
            )}

            {isSpectator && (
              <p className="text-xs text-muted-foreground">관전 중 · {game.phase}</p>
            )}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </div>
  );
}
