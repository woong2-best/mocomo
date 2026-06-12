"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  KeyRound,
  Loader2,
  LogIn,
  PlusCircle,
  Users,
  Globe,
  PencilLine,
} from "lucide-react";
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
import { useSketchQuizMatch } from "@/hooks/use-sketch-quiz-match";

const GAME_ID = "sketch-quiz";

export function SketchQuizHubClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const [mode, setMode] = useState<GamePlayMode>("friends");
  const [joinCode, setJoinCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [requireFollow, setRequireFollow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const username =
    session?.user?.name || session?.user?.username || session?.user?.email || "플레이어";

  const { matching, queueSize, error: matchError, startMatch, cancelMatch, socketReady } =
    useSketchQuizMatch(session?.user?.id, username);

  function createFriendRoom() {
    const code = generateRoomCode();
    saveGameCreateOptions(GAME_ID, {
      password: createPassword.trim() || undefined,
      requireFollow,
    });
    router.push(`/sketch-quiz/${code}`);
  }

  function joinFriendRoom(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!isValidRoomCode(code)) {
      setError("4~8자 영문·숫자 방 코드를 입력하세요.");
      return;
    }
    setError(null);
    saveGameJoinOptions(GAME_ID, { password: joinPassword.trim() || undefined });
    router.push(`/sketch-quiz/${code}?join=1`);
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center space-y-3">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-folk-terracotta/15 border-2 border-folk-cobalt/20">
          <PencilLine className="h-7 w-7 text-folk-terracotta" />
        </div>
        <h1 className="text-2xl font-display font-bold">스케치퀴즈</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          친구·팔로워와 비밀번호 방으로 하거나, 랜덤 매칭으로 모르는 유저와 즐길 수 있습니다.
        </p>
      </div>

      <GamePlayModeTabs mode={mode} onChange={setMode} />

      {!session?.user ? (
        <Card className="border-2 border-folk-cobalt/20">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-sm text-muted-foreground">로그인 후 플레이할 수 있습니다.</p>
            <Link href="/auth/signin?callbackUrl=/sketch-quiz">
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
              <p className="text-sm text-muted-foreground">
                방 코드와 비밀번호를 공유해 아는 사람만 초대하세요.
              </p>
              <Input
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value.toUpperCase())}
                placeholder="비밀번호 (선택, 4~8자)"
                className="rounded-xl border-2 font-mono uppercase tracking-widest text-center"
                maxLength={8}
              />
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireFollow}
                  onChange={(e) => setRequireFollow(e.target.checked)}
                  className="rounded border-folk-cobalt/30"
                />
                호스트 팔로워만 입장
              </label>
              <Button
                type="button"
                className="w-full rounded-xl gap-2 bg-folk-terracotta hover:bg-folk-terracotta-dark"
                onClick={createFriendRoom}
              >
                <PlusCircle className="h-4 w-4" />
                방 만들기
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-folk-cobalt/20">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-display font-bold flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                코드로 참여
              </h2>
              <form onSubmit={joinFriendRoom} className="space-y-3">
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="방 코드"
                  className="rounded-xl border-2 font-mono uppercase tracking-widest text-center"
                  maxLength={8}
                />
                <Input
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value.toUpperCase())}
                  placeholder="비밀번호 (있을 경우)"
                  className="rounded-xl border-2 font-mono uppercase tracking-widest text-center"
                  maxLength={8}
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" variant="outline" className="w-full rounded-xl">
                  참여하기
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-2 border-folk-cobalt/30">
          <CardContent className="p-8 text-center space-y-4">
            <Globe className="h-10 w-10 mx-auto text-folk-cobalt" />
            <h2 className="font-display font-bold">랜덤 매칭</h2>
            <p className="text-sm text-muted-foreground">
              대기열에서 다른 유저와 자동으로 매칭됩니다. (최소 2명)
            </p>
            {matching ? (
              <div className="space-y-3">
                <p className="text-sm flex items-center justify-center gap-2 text-folk-cobalt">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  매칭 중… {queueSize > 0 && `(대기 ${queueSize}명)`}
                </p>
                {!socketReady && (
                  <p className="text-xs text-muted-foreground">실시간 서버 연결 중…</p>
                )}
                <Button type="button" variant="outline" className="rounded-xl" onClick={cancelMatch}>
                  취소
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                className="rounded-xl gap-2 bg-folk-cobalt hover:bg-folk-cobalt/90"
                onClick={startMatch}
                disabled={!socketReady}
              >
                매칭 시작
              </Button>
            )}
            {matchError && <p className="text-xs text-destructive">{matchError}</p>}
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border-2 border-dashed border-folk-cobalt/20 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">플레이 방법</p>
        <p>1. 친구 방: 비밀번호·팔로워 제한 설정 후 코드 공유</p>
        <p>2. 랜덤: 매칭 후 자동 입장 · 방장이 게임 시작 (2명 이상)</p>
        <p>3. 순서대로 그리고 채팅으로 정답 · 80초 라운드</p>
      </div>

      <div className="text-center">
        <Link href="/games" className="text-xs text-muted-foreground hover:text-primary">
          ← GAME 목록
        </Link>
      </div>
    </div>
  );
}
