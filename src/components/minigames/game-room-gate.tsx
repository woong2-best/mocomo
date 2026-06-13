"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MIN_GAME_ROOM_PASSWORD_LENGTH } from "@/lib/games-lobby";

type Props = {
  roomId: string;
  title: string;
  connecting: boolean;
  realtimeOff: boolean;
  needsPassword: boolean;
  error: string | null;
  password: string;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onRetry?: () => void;
  submitLabel?: string;
};

export function GameRoomGate({
  roomId,
  title,
  connecting,
  realtimeOff,
  needsPassword,
  error,
  password,
  onPasswordChange,
  onSubmit,
  onRetry,
  submitLabel = "입장",
}: Props) {
  if (realtimeOff && !connecting && !needsPassword) {
    return (
      <Card className="border-2 border-destructive/30">
        <CardContent className="p-8 text-center space-y-4">
          <p className="font-semibold text-destructive">실시간 서버에 연결할 수 없습니다</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {error ??
              "Vercel NEXT_PUBLIC_SOCKET_URL · Render AUTH_SECRET · SOCKET_CORS_ORIGINS 설정을 확인한 뒤 재배포해 주세요."}
          </p>
          {onRetry && (
            <Button type="button" variant="outline" className="rounded-xl" onClick={onRetry}>
              다시 연결
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (connecting) {
    return (
      <Card className="border-2 border-folk-cobalt/20">
        <CardContent className="p-12 flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-folk-cobalt" />
          <p className="text-sm text-muted-foreground">실시간 서버에 연결하는 중…</p>
          <p className="text-xs text-muted-foreground">최대 1분 · Render 무료 플랜은 sleep 후 첫 연결이 느릴 수 있습니다</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-folk-cobalt/20">
      <CardContent className="p-6 space-y-4 max-w-sm mx-auto">
        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-2xl font-mono font-bold tracking-widest">{roomId}</p>
        </div>

        {needsPassword ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            <Input
              type="password"
              placeholder={`비밀번호 (${MIN_GAME_ROOM_PASSWORD_LENGTH}자 이상)`}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              autoComplete="off"
              className="rounded-xl"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full rounded-xl">
              {submitLabel}
            </Button>
          </form>
        ) : (
          error && <p className="text-sm text-destructive text-center">{error}</p>
        )}

        {onRetry && !needsPassword && (
          <Button type="button" variant="outline" className="w-full rounded-xl" onClick={onRetry}>
            다시 연결
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
