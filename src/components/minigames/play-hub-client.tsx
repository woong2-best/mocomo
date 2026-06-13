"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Infinity, Users } from "lucide-react";
import { getMinigameById } from "@/lib/minigames/registry";
import { getMinigameRoute } from "@/lib/minigames/game-meta";
import { MinigameHubShell } from "@/components/minigames/minigame-hub-shell";
import { ChessPuzzlePanel } from "@/components/chess/chess-puzzle-panel";
import { SpotDiffLeaderboard } from "@/components/spot-diff/spot-diff-leaderboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  saveGameCreateOptions,
  isValidGameRoomPassword,
  MIN_GAME_ROOM_PASSWORD_LENGTH,
  type GamePlayMode,
} from "@/lib/games-lobby";
import { generateRoomCode } from "@/lib/sketch-quiz-words";
import { cn } from "@/lib/utils";

export function PlayHubClient({ gameId }: { gameId: string }) {
  const game = getMinigameById(gameId);
  const router = useRouter();
  const { data: session } = useSession();
  const [mode, setMode] = useState<GamePlayMode>("friends");
  const [chessTab, setChessTab] = useState<"play" | "puzzle">("play");
  const [spotTab, setSpotTab] = useState<"play" | "infinite">("play");
  const [infPassword, setInfPassword] = useState("1234");
  const [infError, setInfError] = useState<string | null>(null);

  if (!game || game.status === "coming_soon" || !game.href) notFound();

  const Icon = game.icon;
  const routeBase = getMinigameRoute(gameId);
  const isChess = gameId === "chess";
  const isSpotDiff = gameId === "spot-diff";

  function startInfinite() {
    if (!session?.user) {
      router.push(`/auth/signin?callbackUrl=${routeBase}`);
      return;
    }
    if (!isValidGameRoomPassword(infPassword)) {
      setInfError(`비밀번호는 ${MIN_GAME_ROOM_PASSWORD_LENGTH}~32자입니다.`);
      return;
    }
    const code = generateRoomCode();
    saveGameCreateOptions(gameId, {
      password: infPassword.trim(),
      spotDiffPlayStyle: "infinite",
    });
    router.push(`${routeBase}/${code}?create=1`);
  }

  return (
    <div className="space-y-4">
      {isChess && (
        <div className="flex justify-center gap-1 p-1 rounded-xl bg-muted/60 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => setChessTab("play")}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              chessTab === "play" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            대국
          </button>
          <button
            type="button"
            onClick={() => setChessTab("puzzle")}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              chessTab === "puzzle" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            퍼즐
          </button>
        </div>
      )}

      {isSpotDiff && (
        <div className="flex justify-center gap-1 p-1 rounded-xl bg-muted/60 max-w-sm mx-auto">
          <button
            type="button"
            onClick={() => setSpotTab("play")}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1",
              spotTab === "play" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            대전/협동
          </button>
          <button
            type="button"
            onClick={() => setSpotTab("infinite")}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1",
              spotTab === "infinite" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Infinity className="h-3.5 w-3.5" />
            무한
          </button>
        </div>
      )}

      {isChess && chessTab === "puzzle" ? (
        <ChessPuzzlePanel />
      ) : isSpotDiff && spotTab === "infinite" ? (
        <div className="space-y-4 max-w-md mx-auto">
          <Card className="border-2 border-folk-cobalt/20">
            <CardContent className="p-6 space-y-4 text-center">
              <Infinity className="h-10 w-10 mx-auto text-folk-cobalt" />
              <div>
                <h2 className="font-display font-bold text-lg">무한 모드</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  5분 제한 · 클리어할 때마다 +30초 · 카탈로그 문제 연속 출제
                </p>
              </div>
              <input
                type="password"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder={`방 비밀번호 (${MIN_GAME_ROOM_PASSWORD_LENGTH}자 이상)`}
                value={infPassword}
                onChange={(e) => setInfPassword(e.target.value)}
              />
              {infError && <p className="text-xs text-destructive">{infError}</p>}
              <Button className="w-full rounded-xl" onClick={startInfinite}>
                무한 모드 시작
              </Button>
              {!session?.user && (
                <p className="text-xs text-muted-foreground">
                  <Link href={`/auth/signin?callbackUrl=${routeBase}`} className="underline">
                    로그인
                  </Link>
                  후 기록이 저장됩니다.
                </p>
              )}
            </CardContent>
          </Card>
          <SpotDiffLeaderboard />
        </div>
      ) : (
        <>
          <MinigameHubShell
            gameId={gameId}
            routeBase={routeBase}
            title={game.name}
            description={game.description}
            icon={Icon}
            mode={mode}
            onModeChange={setMode}
          />
          {isSpotDiff && <SpotDiffLeaderboard limit={5} />}
        </>
      )}
    </div>
  );
}
