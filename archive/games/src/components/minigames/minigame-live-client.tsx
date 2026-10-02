"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAppSocket } from "@/components/providers/app-socket-provider";
import { getAllMinigames } from "@/lib/minigames/registry";
import { getMinigameRoute } from "@/lib/minigames/game-meta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Loader2 } from "lucide-react";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

type LiveRoom = {
  gameId: string;
  roomId: string;
  playerCount: number;
  spectatorCount: number;
  players: { username: string }[];
};

export function MinigameLiveClient() {
  const { isNativeApp } = useClientPlatform();
  const { socket, socketReady } = useAppSocket();
  const games = getAllMinigames().filter((g) => g.supportsSpectate !== false);
  const [gameId, setGameId] = useState("");
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!socket?.connected) return;
    setLoading(true);
    socket.emit("minigame_list_live", { gameId: gameId || undefined }, (res: { rooms?: LiveRoom[] }) => {
      setRooms(res?.rooms ?? []);
      setLoading(false);
    });
  }, [socket, gameId]);

  useEffect(() => {
    if (!socketReady || !socket) return;
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [socket, socketReady, refresh]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className={cn("text-2xl font-display font-bold", isNativeApp && "sr-only")}>진행 중 대국</h1>
        <Link href="/games" className="text-xs text-muted-foreground hover:underline">
          ← 허브
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
        >
          <option value="">전체</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <Button variant="outline" size="sm" className="rounded-lg" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "새로고침"}
        </Button>
      </div>

      {!socketReady && (
        <p className="text-xs text-amber-600 text-center">실시간 서버 연결 중…</p>
      )}

      <Card className="border-2 border-folk-cobalt/20">
        <CardContent className="p-0 divide-y">
          {rooms.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground text-center">진행 중인 대국 없음</p>
          )}
          {rooms.map((r) => {
            const game = getAllMinigames().find((g) => g.id === r.gameId);
            return (
              <div key={`${r.gameId}-${r.roomId}`} className="px-4 py-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">{game?.name ?? r.gameId}</span>
                <span className="text-muted-foreground">
                  {r.players.map((p) => p.username).join(" vs ")}
                </span>
                <span className="text-xs text-muted-foreground">관전 {r.spectatorCount}</span>
                <Link href={`${getMinigameRoute(r.gameId)}/${r.roomId}?spectate=1`} className="ml-auto">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1 rounded-lg">
                    <Eye className="h-3 w-3" />
                    관전
                  </Button>
                </Link>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
