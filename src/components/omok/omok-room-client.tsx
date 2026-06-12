"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMinigameRoom } from "@/hooks/use-minigame-room";
import type { OmokPublicState } from "@/lib/minigames/shared-types";
import {
  MinigameFinishedBanner,
  MinigameLobbyPanel,
} from "@/components/minigames/minigame-lobby-panel";
import { OmokBoard } from "@/components/omok/omok-board";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye } from "lucide-react";

const GAME_ID = "omok";

type Props = {
  roomId: string;
  mode: "create" | "join" | "spectate";
};

export function OmokRoomClient({ roomId, mode }: Props) {
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

  const omokState = state as OmokPublicState | null;
  const isSpectator = mode === "spectate";
  const myTurn =
    omokState?.game?.turnUserId === userId && omokState?.status === "playing" && !isSpectator;

  async function handleCellClick(x: number, y: number) {
    if (!myTurn) return;
    await sendMove({ x, y });
  }

  const spectateUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/omok/${roomId}?spectate=1`
      : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/omok" className="text-xs text-muted-foreground hover:underline">
          ← 오목 로비
        </Link>
        {mode !== "spectate" && (
          <Link href={`/omok/${roomId}?spectate=1`}>
            <Button variant="outline" size="sm" className="gap-1 rounded-lg text-xs">
              <Eye className="h-3 w-3" />
              관전 링크
            </Button>
          </Link>
        )}
        {isSpectator && (
          <span className="text-xs font-semibold text-folk-cobalt bg-folk-gold/20 px-2 py-1 rounded">
            관전 중
          </span>
        )}
      </div>

      {omokState && <MinigameFinishedBanner state={omokState} />}

      {omokState?.status === "lobby" && !isSpectator && (
        <MinigameLobbyPanel
          state={omokState}
          joined={joined}
          error={error}
          userId={userId}
          isHost={isHost}
          onReady={(r) => void setReady(r)}
          onStart={() => void startGame()}
          spectateUrl={spectateUrl}
        >
          <p className="text-xs text-muted-foreground">15×15 · 흑 선 · 5목 승리</p>
        </MinigameLobbyPanel>
      )}

      {omokState?.status === "playing" && omokState.game && (
        <Card className="border-2 border-folk-cobalt/20 overflow-x-auto">
          <CardContent className="p-4 flex flex-col items-center gap-4">
            <p className="text-sm font-semibold">
              {myTurn
                ? "내 턴"
                : omokState.game.turnUserId
                  ? `${omokState.players.find((p) => p.userId === omokState.game!.turnUserId)?.username}의 턴`
                  : "대기"}
              {" · "}
              {omokState.game.turn === "black" ? "흑" : "백"}
            </p>
            <OmokBoard
              board={omokState.game.board}
              lastMove={omokState.game.lastMove}
              disabled={!myTurn}
              turnUserId={omokState.game.turnUserId}
              onCellClick={handleCellClick}
            />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>
                흑: {omokState.players.find((p) => p.userId === omokState.game!.blackUserId)?.username}
              </span>
              <span>
                백: {omokState.players.find((p) => p.userId === omokState.game!.whiteUserId)?.username}
              </span>
            </div>
            {omokState.spectatorCount > 0 && (
              <p className="text-xs text-muted-foreground">관전 {omokState.spectatorCount}명</p>
            )}
          </CardContent>
        </Card>
      )}

      {isSpectator && omokState?.status === "playing" && omokState.game && (
        <Card className="border-2 border-dashed border-folk-cobalt/30">
          <CardContent className="p-4 flex flex-col items-center gap-3">
            <OmokBoard
              board={omokState.game.board}
              lastMove={omokState.game.lastMove}
              disabled
            />
          </CardContent>
        </Card>
      )}

      {error && omokState?.status !== "lobby" && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
