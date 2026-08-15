"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Copy,
  Crown,
  Loader2,
  LogOut,
  PencilLine,
  Play,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareGlobeIcon } from "@/components/ui/share-globe-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SketchCanvas } from "@/components/sketch-quiz/sketch-canvas";
import { SketchQuizTurnPanel } from "@/components/sketch-quiz/sketch-quiz-turn-panel";
import { SketchQuizTimerBar } from "@/components/sketch-quiz/sketch-quiz-timer-bar";
import { useSketchQuizRoom } from "@/hooks/use-sketch-quiz-room";
import { GameRoomGate } from "@/components/minigames/game-room-gate";
import { cn } from "@/lib/utils";

type SketchQuizRoomClientProps = {
  roomId: string;
  mode: "create" | "join";
};

export function SketchQuizRoomClient({ roomId, mode }: SketchQuizRoomClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const username =
    session?.user?.name || session?.user?.username || session?.user?.email || "플레이어";
  const goToHub = () => router.push("/sketch-quiz");

  const {
    state,
    secretWord,
    error,
    joined,
    connecting,
    needsPassword,
    timeLeft,
    isHost,
    isDrawer,
    startGame,
    sendStroke,
    clearCanvas,
    sendGuess,
    socketReady,
    realtimeOff,
    retryJoinWithPassword,
    retryConnection,
    leaveRoom,
    closeRoom,
  } = useSketchQuizRoom(roomId, userId, username, mode, goToHub);

  function handleLeave() {
    leaveRoom();
    goToHub();
  }

  async function handleCloseRoom() {
    setActionError("");
    const res = await closeRoom();
    if (res.ok) goToHub();
    else {
      setConfirmClose(false);
      setActionError(res.error ?? "방을 닫지 못했습니다.");
    }
  }

  const [guess, setGuess] = useState("");
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [joinPassword, setJoinPassword] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [actionError, setActionError] = useState("");

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/sketch-quiz/${roomId}?join=1`
      : `/sketch-quiz/${roomId}?join=1`;

  async function handleStart() {
    setStarting(true);
    setActionError("");
    const res = await startGame();
    if (!res.ok) setActionError(res.error ?? "시작 실패");
    setStarting(false);
  }

  function handleGuessSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = guess.trim();
    if (!text || isDrawer) return;
    sendGuess(text);
    setGuess("");
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  if (!session?.user) {
    return (
      <Card className="border-2 border-folk-cobalt/20">
        <CardContent className="p-8 text-center space-y-4">
          <PencilLine className="h-10 w-10 mx-auto text-folk-terracotta" />
          <p className="text-muted-foreground">스케치퀴즈는 로그인 후 이용할 수 있습니다.</p>
          <Link href={`/auth/signin?callbackUrl=/sketch-quiz/${roomId}`}>
            <Button className="rounded-xl">로그인</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (!joined || !state) {
    return (
      <div className="space-y-4">
        <Link href="/sketch-quiz" className="text-xs text-muted-foreground hover:underline">
          ← 스케치퀴즈 로비
        </Link>
        <GameRoomGate
          roomId={roomId}
          title={mode === "create" ? "방 만드는 중" : "방 입장"}
          connecting={connecting}
          realtimeOff={realtimeOff}
          needsPassword={needsPassword}
          error={error}
          password={joinPassword}
          onPasswordChange={setJoinPassword}
          onSubmit={() => retryJoinWithPassword(joinPassword)}
          onRetry={retryConnection}
        />
      </div>
    );
  }

  const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);
  const inLobby = state.status === "lobby";
  const inGame = state.status === "playing" || state.status === "round_end";
  const finished = state.status === "finished";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-bold flex items-center gap-2">
            <PencilLine className="h-5 w-5 text-folk-terracotta" />
            스케치퀴즈
            <span className="text-sm font-mono font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">
              {state.roomId}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {state.accessMode === "public" && (
              <span className="inline-flex items-center rounded-md bg-folk-cobalt/10 text-folk-cobalt px-1.5 py-0.5 text-[10px] font-semibold mr-1">
                랜덤 매칭
              </span>
            )}
            {state.accessMode === "private" && state.hasPassword && (
              <span className="inline-flex items-center rounded-md bg-folk-terracotta/10 text-folk-terracotta px-1.5 py-0.5 text-[10px] font-semibold mr-1">
                비밀번호 방
              </span>
            )}
            {state.requireFollow && (
              <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold mr-1">
                팔로워 전용
              </span>
            )}
            {inLobby
              ? "친구를 초대하고 방장이 게임을 시작하세요."
              : finished
                ? "수고하셨습니다!"
                : state.roundMessage ?? `라운드 ${state.round} / ${state.maxRounds}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5"
            onClick={copyInvite}
          >
            {copied ? <Copy className="h-3.5 w-3.5" /> : <ShareGlobeIcon className="h-3.5 w-3.5" />}
            {copied ? "복사됨" : "초대 링크"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5"
            onClick={handleLeave}
          >
            <LogOut className="h-3.5 w-3.5" />
            나가기
          </Button>
          {isHost && inLobby && (
            confirmClose ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2">
                <p className="text-xs text-destructive">방을 닫으면 모든 플레이어가 퇴장합니다.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="rounded-lg h-8"
                  onClick={() => void handleCloseRoom()}
                >
                  방 닫기
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-lg h-8"
                  onClick={() => setConfirmClose(false)}
                >
                  취소
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={() => setConfirmClose(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                방 닫기
              </Button>
            )
          )}
          {isHost && inLobby && (
            <Button
              type="button"
              size="sm"
              className="rounded-xl gap-1.5 bg-folk-terracotta hover:bg-folk-terracotta-dark"
              disabled={state.players.length < 2 || starting}
              onClick={handleStart}
            >
              {starting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              게임 시작
            </Button>
          )}
        </div>
      </div>

      {actionError ? (
        <p className="text-sm text-destructive rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="grid lg:grid-cols-[1fr_17rem] gap-4">
        <div className="space-y-4 min-w-0">
          {inLobby && (
            <Card className="border-2 border-folk-cobalt/20 bg-folk-cream/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  대기실 ({state.players.length}명)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1">
                  {state.players.map((p) => (
                    <li
                      key={p.userId}
                      className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg bg-background/60"
                    >
                      {p.isHost && <Crown className="h-3.5 w-3.5 text-folk-gold shrink-0" />}
                      <span className="font-medium truncate">{p.username}</span>
                      {p.userId === userId && (
                        <span className="text-xs text-muted-foreground">(나)</span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  {state.accessMode === "public"
                    ? "랜덤 매칭 · 2~5명 · 매칭 시 자동 시작"
                    : `최소 2명 · 최대 8명 · 턴당 ${state.roundSeconds || 80}초 · 순서는 시작 시 무작위`}
                </p>
                <SketchQuizTurnPanel state={state} userId={userId} variant="lobby" />
              </CardContent>
            </Card>
          )}

          {inGame && (
            <>
              <SketchQuizTimerBar
                timeLeft={timeLeft}
                roundSeconds={state.roundSeconds || 80}
                round={state.round}
                maxRounds={state.maxRounds}
                roundMessage={
                  state.status === "playing"
                    ? state.roundMessage
                    : state.status === "round_end"
                      ? state.roundMessage
                      : null
                }
              />

              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-folk-cobalt/15 bg-background/80 px-3 py-2 text-sm">
                {isDrawer && secretWord ? (
                  <span className="font-bold text-folk-cobalt">
                    그릴 단어: <span className="text-folk-terracotta">{secretWord.word}</span>
                    <span className="font-normal text-muted-foreground ml-2">
                      ({secretWord.category})
                    </span>
                  </span>
                ) : (
                  <>
                    <span>
                      카테고리: <strong>{state.category ?? "?"}</strong>
                    </span>
                    {state.wordLength > 0 && (
                      <span className="text-muted-foreground">· {state.wordLength}글자</span>
                    )}
                    {state.drawerId && (
                      <span className="ml-auto text-folk-terracotta font-medium">
                        {state.players.find((p) => p.userId === state.drawerId)?.username}님이
                        그리는 중
                      </span>
                    )}
                  </>
                )}
              </div>

              <SketchCanvas
                strokes={state.strokes}
                canDraw={isDrawer && state.status === "playing"}
                onStroke={sendStroke}
                onClear={clearCanvas}
              />

              {!isDrawer && state.status === "playing" && (
                <form onSubmit={handleGuessSubmit} className="flex gap-2">
                  <Input
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    placeholder="정답을 입력하세요…"
                    className="rounded-xl border-2"
                    maxLength={80}
                    autoComplete="off"
                  />
                  <Button type="submit" className="rounded-xl shrink-0">
                    제출
                  </Button>
                </form>
              )}

              {state.status === "round_end" && state.lastCorrect && (
                <div className="text-center py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-sm">
                  <strong>{state.lastCorrect.username}</strong>님 정답! →{" "}
                  <strong>{state.lastCorrect.word}</strong>
                </div>
              )}
            </>
          )}

          {finished && (
            <Card className="border-2 border-folk-gold/40 bg-folk-gold/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-folk-gold" />
                  최종 순위
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {sortedPlayers.map((p, i) => (
                    <li
                      key={p.userId}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2",
                        i === 0 && "bg-folk-gold/20 font-bold"
                      )}
                    >
                      <span>
                        {i + 1}. {p.username}
                        {p.userId === userId && " (나)"}
                      </span>
                      <span>{p.score}점</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 flex gap-2">
                  <Link href="/sketch-quiz">
                    <Button variant="outline" className="rounded-xl">
                      새 방 만들기
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-3">
          {(inGame || inLobby) && state.turnOrder.length > 0 && !inLobby && (
            <SketchQuizTurnPanel state={state} userId={userId} variant="game" />
          )}

          <Card className="border-2 border-folk-cobalt/20">
            <CardHeader className="pb-2 py-3">
              <CardTitle className="text-sm">플레이어</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {sortedPlayers.map((p) => (
                <div
                  key={p.userId}
                  className={cn(
                    "flex justify-between text-sm py-1.5 px-2 rounded-lg",
                    p.isDrawer && "bg-folk-terracotta/15 font-medium"
                  )}
                >
                  <span className="truncate">
                    {p.username}
                    {p.isHost && " 👑"}
                  </span>
                  <span className="text-muted-foreground shrink-0">{p.score}점</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {(inGame || finished) && (
            <Card className="border-2 border-folk-cobalt/20">
              <CardHeader className="pb-2 py-3">
                <CardTitle className="text-sm">추측 채팅</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 max-h-64 overflow-y-auto space-y-1.5">
                {state.recentGuesses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">아직 추측이 없습니다.</p>
                ) : (
                  state.recentGuesses.map((g, i) => (
                    <div
                      key={`${g.at}-${i}`}
                      className={cn(
                        "text-xs rounded-lg px-2 py-1",
                        g.correct
                          ? "bg-green-500/15 text-green-800 dark:text-green-300 font-medium"
                          : "bg-muted/60"
                      )}
                    >
                      <span className="font-medium">{g.username}</span>: {g.text}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
