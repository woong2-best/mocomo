"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { KeyRound, Loader2, LogIn, PlusCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GamePlayModeTabs } from "@/components/games/game-play-mode-tabs";
import {
  saveGameCreateOptions,
  saveGameJoinOptions,
  type GamePlayMode,
} from "@/lib/games-lobby";
import { generateRoomCode, isValidRoomCode } from "@/lib/sketch-quiz-words";
import { useMinigameMatch } from "@/hooks/use-minigame-match";
import type { LucideIcon } from "lucide-react";

type Props = {
  gameId: string;
  routeBase: string;
  title: string;
  description: string;
  icon: LucideIcon;
  mode: GamePlayMode;
  onModeChange: (mode: GamePlayMode) => void;
  children?: React.ReactNode;
};

export function MinigameHubShell({
  gameId,
  routeBase,
  title,
  description,
  icon: Icon,
  mode,
  onModeChange,
  children,
}: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const [joinCode, setJoinCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [requireFollow, setRequireFollow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const username =
    session?.user?.name || session?.user?.username || session?.user?.email || "플레이어";

  const { matching, queueSize, statusMessage, error: matchError, startMatch, cancelMatch, socketReady, realtimeOff } =
    useMinigameMatch(gameId, routeBase, session?.user?.id, username);

  function createFriendRoom() {
    const code = generateRoomCode();
    saveGameCreateOptions(gameId, {
      password: createPassword.trim() || undefined,
      requireFollow,
    });
    router.push(`${routeBase}/${code}`);
  }

  function joinFriendRoom(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!isValidRoomCode(code)) {
      setError("4~8자 영문·숫자 방 코드를 입력하세요.");
      return;
    }
    setError(null);
    saveGameJoinOptions(gameId, { password: joinPassword.trim() || undefined });
    router.push(`${routeBase}/${code}?join=1`);
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center space-y-3">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-folk-terracotta/15 border-2 border-folk-cobalt/20">
          <Icon className="h-7 w-7 text-folk-terracotta" />
        </div>
        <h1 className="text-2xl font-display font-bold">{title}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-lg mx-auto">{description}</p>
      </div>

      <GamePlayModeTabs mode={mode} onChange={onModeChange} />

      {!session?.user ? (
        <Card className="border-2 border-folk-cobalt/20">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-sm text-muted-foreground">로그인 후 플레이할 수 있습니다.</p>
            <Link href={`/auth/signin?callbackUrl=${routeBase}`}>
              <Button className="rounded-xl gap-2">
                <LogIn className="h-4 w-4" />
                로그인
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : mode === "friends" ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="border-2 border-folk-terracotta/30 bg-folk-cream/30">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-display font-bold flex items-center gap-2">
                <Users className="h-4 w-4" />
                친구 · 팔로워 방
              </h2>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={requireFollow}
                  onChange={(e) => setRequireFollow(e.target.checked)}
                />
                팔로워만 입장
              </label>
              <Input
                placeholder="비밀번호 (선택)"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                type="password"
              />
              <Button onClick={createFriendRoom} className="w-full rounded-xl gap-2">
                <PlusCircle className="h-4 w-4" />
                방 만들기
              </Button>
            </CardContent>
          </Card>
          <Card className="border-2 border-folk-cobalt/20">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-display font-bold flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                코드로 입장
              </h2>
              <form onSubmit={joinFriendRoom} className="space-y-3">
                <Input
                  placeholder="방 코드"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={8}
                />
                <Input
                  placeholder="비밀번호 (선택)"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  type="password"
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" variant="outline" className="w-full rounded-xl">
                  입장
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-2 border-folk-cobalt/30 bg-folk-cream/20">
          <CardContent className="p-8 text-center space-y-4">
            {matching ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-folk-cobalt" />
                <p className="font-semibold">{statusMessage}</p>
                <p className="text-xs text-muted-foreground">대기 {queueSize}명</p>
                <Button variant="outline" onClick={cancelMatch} className="rounded-xl">
                  취소
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  랜덤 매칭으로 실력 비슷한 유저와 대국합니다.
                </p>
                {!socketReady && !realtimeOff && (
                  <p className="text-xs text-amber-600">실시간 서버 연결 중…</p>
                )}
                {matchError && <p className="text-xs text-destructive">{matchError}</p>}
                <Button onClick={startMatch} className="rounded-xl gap-2" disabled={realtimeOff}>
                  매칭 시작
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {children}

      <div className="text-center">
        <Link href="/games" className="text-xs text-muted-foreground hover:underline">
          ← 미니게임 허브
        </Link>
      </div>
    </div>
  );
}
