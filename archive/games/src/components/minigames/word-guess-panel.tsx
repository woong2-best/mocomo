"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, Lightbulb, Sparkles, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  WORD_GUESS_MAX_HINTS,
  type WordGuessPublicGame,
  type WordGuessSolveEvent,
} from "@/lib/minigames/word-guess-logic";
import { cn } from "@/lib/utils";

type Props = {
  game: WordGuessPublicGame;
  userId?: string;
  isSpectator: boolean;
  finished?: boolean;
  onMove: (answer: string) => Promise<boolean>;
};

function LetterSlots({ count, answer, showAnswer }: { count: number; answer: string | null; showAnswer: boolean }) {
  const chars = showAnswer && answer ? [...answer] : Array.from({ length: count }, () => null);
  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
      {chars.map((ch, i) => (
        <div
          key={i}
          className={cn(
            "flex h-12 w-10 sm:h-14 sm:w-12 items-center justify-center rounded-xl border-2 text-xl sm:text-2xl font-black shadow-sm transition-all",
            showAnswer
              ? "border-folk-gold/60 bg-folk-gold/15 text-folk-cobalt scale-105"
              : "border-folk-cobalt/25 bg-background/90 text-folk-cobalt/40"
          )}
        >
          {ch ?? "·"}
        </div>
      ))}
    </div>
  );
}

function SolveBanner({ solve }: { solve: WordGuessSolveEvent }) {
  return (
    <div className="animate-in zoom-in-95 fade-in duration-300 rounded-2xl border-2 border-emerald-400/50 bg-gradient-to-br from-emerald-500/15 to-folk-gold/20 px-4 py-4 text-center shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-1 flex items-center justify-center gap-1">
        <Sparkles className="h-3.5 w-3.5" />
        정답!
      </p>
      <p className="text-lg sm:text-xl font-black text-folk-cobalt">
        {solve.username}
        <span className="text-base font-bold text-muted-foreground"> 님이 맞췄습니다</span>
      </p>
      <p className="mt-1 text-2xl font-black text-folk-terracotta tabular-nums">+{solve.points}점</p>
    </div>
  );
}

export function WordGuessPanel({ game, userId, isSpectator, finished, onMove }: Props) {
  const [val, setVal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [celebrate, setCelebrate] = useState<WordGuessSolveEvent | null>(null);
  const lastSolveAt = useRef<number | null>(null);

  const canGuess = !isSpectator && !finished && game.phase === "playing" && !game.roundSolved;
  const showAnswer = game.phase === "reveal" || !!finished;
  const progress = game.maxRounds > 0 ? (game.round / game.maxRounds) * 100 : 0;
  const timerPct =
    game.phase === "playing" ? Math.min(100, (game.timeLeft / 90) * 100) : 0;

  useEffect(() => {
    const solve = game.lastSolve;
    if (!solve || solve.at === lastSolveAt.current) return;
    lastSolveAt.current = solve.at;
    setCelebrate(solve);
    const t = window.setTimeout(() => setCelebrate(null), 2800);
    return () => window.clearTimeout(t);
  }, [game.lastSolve]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = val.trim();
    if (!text || !canGuess || submitting) return;
    setSubmitting(true);
    const ok = await onMove(text);
    if (ok) setVal("");
    setSubmitting(false);
  }

  const hintSlots = Array.from({ length: Math.min(game.totalHints, WORD_GUESS_MAX_HINTS) }, (_, i) => {
    const revealed = game.revealedHints[i];
    return { index: i + 1, text: revealed ?? null };
  });

  return (
    <div className="rounded-2xl border-2 border-folk-cobalt/15 bg-gradient-to-b from-background to-folk-cream/30 shadow-md overflow-hidden">
      {/* 상단: 카테고리 · 시간 · 문제 번호 */}
      <div className="border-b border-folk-cobalt/10 bg-folk-cobalt/[0.04] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center rounded-full bg-folk-terracotta/15 border border-folk-terracotta/30 px-3 py-1 text-xs font-bold text-folk-terracotta">
            {game.category || "카테고리"}
          </span>
          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 font-mono font-bold text-folk-cobalt tabular-nums">
              <Timer className="h-4 w-4 text-folk-terracotta" />
              {game.timeLeft}초
            </span>
            <span className="text-muted-foreground">|</span>
            <span className="font-semibold text-folk-cobalt">
              {game.round} / {game.maxRounds} 문제
            </span>
          </div>
        </div>
        {game.phase === "playing" && !game.roundSolved && (
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-folk-terracotta transition-all duration-1000 ease-linear"
              style={{ width: `${timerPct}%` }}
            />
          </div>
        )}
        <div className="mt-1.5 h-0.5 rounded-full bg-muted/60 overflow-hidden">
          <div
            className="h-full rounded-full bg-folk-cobalt/40 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* 정답 글자 수 */}
        <div className="text-center space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            정답 · {game.letterCount}글자
          </p>
          <LetterSlots count={game.letterCount} answer={game.answer} showAnswer={showAnswer} />
          {showAnswer && game.answer && (
            <p className="text-sm font-bold text-folk-gold animate-in fade-in duration-500">
              정답: {game.answer}
            </p>
          )}
        </div>

        {celebrate && <SolveBanner solve={celebrate} />}

        {game.phase === "reveal" && !game.lastSolve && (
          <p className="text-center text-sm text-muted-foreground animate-pulse">시간 종료 · 정답 공개</p>
        )}

        {/* 힌트 카드 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5 text-folk-gold" />
              힌트 ({game.revealedHints.length}/{game.totalHints})
            </p>
            {game.phase === "playing" && !game.roundSolved && game.nextHintIn > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                다음 힌트 {game.nextHintIn}초
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {hintSlots.map((slot) => (
              <div
                key={slot.index}
                className={cn(
                  "rounded-xl border-2 px-3 py-3 min-h-[3.25rem] flex items-center gap-2 transition-all duration-500",
                  slot.text
                    ? "border-folk-gold/40 bg-folk-gold/10 shadow-sm animate-in slide-in-from-bottom-2 fade-in"
                    : "border-dashed border-folk-cobalt/15 bg-muted/20"
                )}
              >
                <span
                  className={cn(
                    "shrink-0 flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black",
                    slot.text ? "bg-folk-gold/30 text-folk-cobalt" : "bg-muted text-muted-foreground"
                  )}
                >
                  {slot.index}
                </span>
                <p className={cn("text-sm font-medium break-words", slot.text ? "text-foreground" : "text-muted-foreground/50")}>
                  {slot.text ?? "잠김"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 입력 */}
        <form onSubmit={(e) => void handleSubmit(e)} className="flex gap-2 pt-1">
          <Input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder={canGuess ? "정답을 입력하세요…" : isSpectator ? "관전 중" : "대기 중…"}
            disabled={!canGuess || submitting}
            className="h-11 rounded-xl text-base border-folk-cobalt/20 focus-visible:ring-folk-terracotta/30"
            autoComplete="off"
          />
          <Button
            type="submit"
            disabled={!canGuess || submitting || !val.trim()}
            className="h-11 px-6 rounded-xl bg-folk-terracotta hover:bg-folk-terracotta-dark font-bold shrink-0"
          >
            제출
          </Button>
        </form>
        {isSpectator && (
          <p className="text-center text-xs text-muted-foreground">관전 모드 · 채팅으로 응원해 보세요</p>
        )}
      </div>
    </div>
  );
}
