"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMinigameRoom } from "@/hooks/use-minigame-room";
import type { WordChainPublicState } from "@/lib/minigames/shared-types";
import {
  MinigameFinishedBanner,
  MinigameLobbyPanel,
} from "@/components/minigames/minigame-lobby-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const GAME_ID = "word-chain";

type Props = {
  roomId: string;
  mode: "create" | "join" | "spectate";
};

export function WordChainRoomClient({ roomId, mode }: Props) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const username =
    session?.user?.name || session?.user?.username || session?.user?.email || "플레이어";
  const [word, setWord] = useState("");

  const { state, error, joined, isHost, setReady, startGame, sendMove, setError } =
    useMinigameRoom(GAME_ID, roomId, userId, username, mode);

  const wcState = state as WordChainPublicState | null;
  const game = wcState?.game;
  const myTurn = game?.turnUserId === userId && wcState?.status === "playing";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await sendMove(word);
    if (ok) setWord("");
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <Link href="/word-chain" className="text-xs text-muted-foreground hover:underline">
        ← 끝말잇기 로비
      </Link>

      {wcState && <MinigameFinishedBanner state={wcState} />}

      {wcState?.status === "lobby" && mode !== "spectate" && (
        <MinigameLobbyPanel
          state={wcState}
          joined={joined}
          error={error}
          userId={userId}
          isHost={isHost}
          onReady={(r) => void setReady(r)}
          onStart={() => void startGame()}
        >
          <p className="text-xs text-muted-foreground">2~6인 · 턴당 30초 · 내장 사전</p>
        </MinigameLobbyPanel>
      )}

      {wcState?.status === "playing" && game && (
        <Card className="border-2 border-folk-cobalt/20">
          <CardContent className="p-6 space-y-4">
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">현재 단어</p>
              <p className="text-2xl font-bold">{game.currentWord ?? "시작! 아무 단어"}</p>
              {game.timeLeft > 0 && (
                <p className="text-sm text-folk-terracotta font-semibold">{game.timeLeft}초</p>
              )}
            </div>

            <p className="text-sm text-center">
              {myTurn ? "내 턴" : `${wcState.players.find((p) => p.userId === game.turnUserId)?.username ?? ""}의 턴`}
            </p>

            {myTurn && mode !== "spectate" && (
              <form onSubmit={submit} className="flex gap-2">
                <Input
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  placeholder="단어 입력"
                  autoComplete="off"
                />
                <Button type="submit" className="rounded-xl shrink-0">
                  제출
                </Button>
              </form>
            )}

            {game.usedWords.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold mb-1">사용된 단어</p>
                <p className="line-clamp-3">{game.usedWords.join(" · ")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(error || wcState?.status === "playing") && error && (
        <p className="text-sm text-destructive text-center" onClick={() => setError(null)}>
          {error}
        </p>
      )}
    </div>
  );
}
