"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MinigamePublicState } from "@/lib/minigames/shared-types";
import { cn } from "@/lib/utils";
import { Copy, Eye, Loader2, RotateCcw } from "lucide-react";

type Props = {
  state: MinigamePublicState | null;
  joined: boolean;
  error: string | null;
  userId?: string;
  isHost: boolean;
  onReady: (ready: boolean) => void;
  onStart: () => void;
  spectateUrl?: string;
  children?: React.ReactNode;
};

export function MinigameLobbyPanel({
  state,
  joined,
  error,
  userId,
  isHost,
  onReady,
  onStart,
  spectateUrl,
  children,
}: Props) {
  if (!joined || !state) {
    return (
      <Card className="border-2 border-folk-cobalt/20">
        <CardContent className="p-12 flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-folk-cobalt" />
          <p className="text-sm text-muted-foreground">방에 연결하는 중…</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  if (state.status !== "lobby") return null;

  const me = state.players.find((p) => p.userId === userId);
  const allReady = state.players.every((p) => p.ready);
  const minMet = state.players.length >= 2;

  return (
    <Card className="border-2 border-folk-cobalt/20">
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">방 코드</p>
            <p className="text-2xl font-mono font-bold tracking-widest">{state.roomId}</p>
            {state.passwordRequired && (
              <p className="text-[11px] text-muted-foreground mt-1">🔒 비밀번호로 보호된 방</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 rounded-lg"
            onClick={() => navigator.clipboard.writeText(state.roomId)}
          >
            <Copy className="h-3 w-3" />
            복사
          </Button>
        </div>

        {spectateUrl && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Eye className="h-3 w-3" />
            관전 링크: {spectateUrl}
          </p>
        )}

        <ul className="space-y-2">
          {state.players.map((p) => (
            <li
              key={p.userId}
              className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
            >
              <span>
                {p.username}
                {p.role && (
                  <span className="ml-2 text-xs text-muted-foreground">({p.role})</span>
                )}
                {p.userId === state.hostId && (
                  <span className="ml-1 text-[10px] bg-folk-gold/30 px-1 rounded">HOST</span>
                )}
              </span>
              <span
                className={cn(
                  "text-xs font-semibold",
                  p.ready ? "text-emerald-600" : "text-muted-foreground"
                )}
              >
                {p.ready ? "준비" : "대기"}
              </span>
            </li>
          ))}
        </ul>

        {state.spectatorCount > 0 && (
          <p className="text-xs text-muted-foreground">관전자 {state.spectatorCount}명</p>
        )}

        {children}

        <div className="flex flex-wrap gap-2">
          <Button
            variant={me?.ready ? "outline" : "default"}
            className="rounded-xl flex-1"
            onClick={() => onReady(!me?.ready)}
          >
            {me?.ready ? "준비 취소" : "준비"}
          </Button>
          {isHost && (
            <Button
              className="rounded-xl flex-1"
              disabled={!allReady || !minMet}
              onClick={onStart}
            >
              게임 시작
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

export function MinigameFinishedBanner({
  state,
  gameId,
  isHost,
  onRematch,
}: {
  state: MinigamePublicState;
  gameId: string;
  isHost?: boolean;
  onRematch?: () => void;
}) {
  if (state.status !== "finished") return null;
  const replayHref = state.matchId ? `/play/${gameId}/replay/${state.matchId}` : null;
  return (
    <Card className="border-2 border-folk-gold/40 bg-folk-gold/10">
      <CardContent className="p-4 text-center space-y-2">
        <p className="font-bold text-lg">{state.resultMessage ?? "게임 종료"}</p>
        {state.winnerId && (
          <p className="text-sm text-muted-foreground">
            승자: {state.players.find((p) => p.userId === state.winnerId)?.username ?? "—"}
          </p>
        )}
        <div className="flex flex-wrap gap-2 justify-center">
          {replayHref && (
            <Link href={replayHref}>
              <Button variant="outline" size="sm" className="rounded-lg gap-1">
                <RotateCcw className="h-3 w-3" />
                리플레이
              </Button>
            </Link>
          )}
          {isHost && onRematch && (
            <Button size="sm" className="rounded-lg gap-1" onClick={onRematch}>
              재대국
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
