"use client";

import { useMemo, useState } from "react";
import { Send, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  previewWordChainInput,
  wordChainNextRequiredChar,
} from "@/lib/minigames/word-chain-dict";
import type { MinigamePlayerPublic } from "@/lib/minigames/shared-types";
import { cn } from "@/lib/utils";

type HistoryEntry = {
  userId: string;
  word: string;
  status: "ok" | "fail" | "timeout";
  reason?: string;
  at: number;
};

type Props = {
  currentWord: string | null;
  turnUserId: string | null;
  usedWords: string[];
  timeLeft: number;
  turnLimit: number;
  requiredChar: string | null;
  history: HistoryEntry[];
  eliminated: string[];
  scores: Record<string, number>;
  userId?: string;
  isSpectator: boolean;
  finished?: boolean;
  players: MinigamePlayerPublic[];
  onMove: (word: string) => Promise<boolean>;
};

function playerName(players: MinigamePlayerPublic[], id: string) {
  return players.find((p) => p.userId === id)?.username ?? "플레이어";
}

export function WordChainPanel({
  currentWord,
  turnUserId,
  usedWords,
  timeLeft,
  turnLimit,
  requiredChar,
  history,
  eliminated,
  scores,
  userId,
  isSpectator,
  finished,
  players,
  onMove,
}: Props) {
  const [word, setWord] = useState("");
  const [checking, setChecking] = useState(false);

  const myTurn = turnUserId === userId && !isSpectator && !finished && !eliminated.includes(userId ?? "");
  const turnName = turnUserId ? playerName(players, turnUserId) : "—";
  const pct = turnLimit > 0 ? Math.min(100, (timeLeft / turnLimit) * 100) : 0;
  const urgent = timeLeft <= 5 && !finished;
  const startChar = requiredChar ?? wordChainNextRequiredChar(currentWord);

  const preview = useMemo(
    () => (myTurn && word ? previewWordChainInput(word, currentWord, usedWords) : null),
    [myTurn, word, currentWord, usedWords]
  );

  const phaseLabel = finished
    ? "종료"
    : checking
      ? "CHECKING — 서버 검증 중"
      : myTurn
        ? "ACTIVE — 내 턴"
        : `WAITING — ${turnName}의 턴`;

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!myTurn || checking || !word.trim()) return;
    setChecking(true);
    try {
      await onMove(word.trim());
      setWord("");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 max-w-lg mx-auto">
      <div className="rounded-xl border-2 border-folk-cobalt/20 bg-folk-gold/10 px-4 py-3 space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span
            className={cn(
              "font-display font-bold",
              myTurn && !checking && "text-folk-terracotta",
              checking && "text-muted-foreground"
            )}
          >
            {phaseLabel}
          </span>
          {!finished && (
            <div
              className={cn(
                "flex items-center gap-1.5 tabular-nums ml-auto",
                urgent && "text-destructive animate-pulse"
              )}
            >
              <Timer className="h-4 w-4" />
              <span>{timeLeft}초</span>
            </div>
          )}
        </div>

        {!finished && (
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-1000 ease-linear",
                urgent ? "bg-destructive" : "bg-folk-terracotta"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground">현재 단어</p>
          <p className="text-3xl font-display font-bold tracking-tight">
            {currentWord ?? "시작 — 아무 단어나 입력"}
          </p>
          {startChar && currentWord && (
            <p className="text-sm font-semibold text-folk-cobalt">
              필수 시작 글자: <span className="text-lg">「{startChar}」</span>
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border-2 border-folk-cobalt/15 bg-background/80 max-h-64 overflow-y-auto">
        <ul className="divide-y divide-border/60 text-sm">
          {history.length === 0 && (
            <li className="px-4 py-6 text-center text-muted-foreground text-xs">아직 제출된 단어가 없습니다</li>
          )}
          {history.map((entry, i) => {
            const name = playerName(players, entry.userId);
            const statusClass =
              entry.status === "ok"
                ? "text-emerald-700"
                : entry.status === "timeout"
                  ? "text-muted-foreground"
                  : "text-destructive";
            return (
              <li key={`${entry.at}-${i}`} className="px-4 py-2 flex items-start gap-2">
                <span className={cn("font-medium shrink-0", statusClass)}>
                  {entry.status === "ok" ? "✓" : entry.status === "timeout" ? "⏱" : "✗"}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-semibold">{name}</span>
                  {entry.word ? (
                    <span className="ml-2">{entry.word}</span>
                  ) : (
                    <span className="ml-2 text-muted-foreground italic">탈락</span>
                  )}
                  {entry.reason && entry.status !== "ok" && (
                    <p className="text-xs text-muted-foreground mt-0.5">{entry.reason}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground px-1">
        {players.map((p) => (
          <span
            key={p.userId}
            className={cn(eliminated.includes(p.userId) && "line-through opacity-50")}
          >
            {p.username}: {scores[p.userId] ?? 0}점
          </span>
        ))}
      </div>

      {!finished && !isSpectator && !eliminated.includes(userId ?? "") && (
        <form
          onSubmit={handleSubmit}
          className="sticky bottom-0 flex gap-2 items-end bg-background/95 backdrop-blur border-t border-border pt-3 pb-1"
        >
          <div className="flex-1 space-y-1">
            <Input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder={myTurn ? (startChar ? `「${startChar}」로 시작하는 단어` : "단어 입력") : "상대 턴…"}
              disabled={!myTurn || checking}
              className="rounded-xl h-11 text-base"
              autoComplete="off"
              enterKeyHint="send"
            />
            {myTurn && preview?.hint && (
              <p className="text-xs text-destructive px-1">{preview.hint}</p>
            )}
            {myTurn && preview?.ok && word.trim() && (
              <p className="text-xs text-emerald-600 px-1">제출 가능</p>
            )}
          </div>
          <Button
            type="submit"
            disabled={!myTurn || checking || !word.trim()}
            className="rounded-xl h-11 px-4 gap-1 shrink-0"
          >
            <Send className="h-4 w-4" />
            전송
          </Button>
        </form>
      )}

      {isSpectator && !finished && (
        <p className="text-center text-xs text-folk-cobalt">관전 중 — {turnName}의 턴</p>
      )}

      {!finished && eliminated.includes(userId ?? "") && (
        <p className="text-center text-sm text-muted-foreground">탈락했습니다. 관전 모드입니다.</p>
      )}
    </div>
  );
}
