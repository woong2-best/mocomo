"use client";

import { useEffect, useState } from "react";
import { Lightbulb, Pause, Play, Timer } from "lucide-react";
import { SpotDiffBoard } from "@/components/spot-diff/spot-diff-board";
import { Button } from "@/components/ui/button";
import {
  SPOT_DIFF_WRONG_PENALTY_MS,
  formatSpotTime,
  type SpotDiffMode,
  type SpotDiffPlayStyle,
  type SpotShape,
} from "@/lib/minigames/spot-diff-logic";
import { playSpotSound } from "@/lib/minigames/spot-diff-sounds";
import type { MinigamePlayerPublic } from "@/lib/minigames/shared-types";
import { cn } from "@/lib/utils";

type FoundPublic = { id: number; x: number; y: number; radius: number; foundBy?: string };

type Props = {
  width: number;
  height: number;
  left: SpotShape[];
  right: SpotShape[];
  found: FoundPublic[];
  totalDiffs: number;
  scores: Record<string, number>;
  combos: Record<string, number>;
  wrongCounts: Record<string, number>;
  hintsUsed: Record<string, number>;
  hintFlash: { x: number; y: number; until: number } | null;
  mode: SpotDiffMode;
  playStyle?: SpotDiffPlayStyle;
  round?: number;
  puzzlesCleared?: number;
  puzzleTitle?: string;
  imageLeft?: string;
  imageRight?: string;
  theme: string;
  timeLeftMs: number;
  paused: boolean;
  lastFeedback: { ok: boolean; message: string } | null;
  userId?: string;
  isSpectator: boolean;
  finished?: boolean;
  players: MinigamePlayerPublic[];
  onMove: (
    move: { x: number; y: number; side: "left" | "right" } | { hint: true } | { pause: true } | { resume: true }
  ) => Promise<boolean>;
};

function playerName(players: MinigamePlayerPublic[], id: string) {
  return players.find((p) => p.userId === id)?.username ?? "플레이어";
}

export function SpotDiffGamePanel({
  width,
  height,
  left,
  right,
  found,
  totalDiffs,
  scores,
  combos,
  wrongCounts,
  hintsUsed,
  hintFlash,
  mode,
  playStyle = "normal",
  round = 1,
  puzzlesCleared = 0,
  puzzleTitle,
  imageLeft,
  imageRight,
  theme,
  timeLeftMs,
  paused,
  lastFeedback,
  userId,
  isSpectator,
  finished,
  players,
  onMove,
}: Props) {
  const [placing, setPlacing] = useState(false);
  const [localPause, setLocalPause] = useState(false);
  const canPlay = !isSpectator && !finished && !paused && !localPause;
  const myScore = userId ? scores[userId] ?? 0 : 0;
  const myCombo = userId ? combos[userId] ?? 0 : 0;
  const urgent = timeLeftMs <= 30_000 && !finished && !paused;

  const hintActive =
    hintFlash && hintFlash.until > Date.now()
      ? { x: hintFlash.x, y: hintFlash.y }
      : null;

  useEffect(() => {
    if (!lastFeedback || finished) return;
    if (lastFeedback.ok) {
      if (lastFeedback.message.includes("클리어")) playSpotSound("clear");
      else if (lastFeedback.message.includes("힌트")) playSpotSound("hint");
      else playSpotSound("correct");
    } else {
      playSpotSound("wrong");
    }
  }, [lastFeedback, finished]);

  async function act(move: Parameters<Props["onMove"]>[0]) {
    if (!canPlay && !("pause" in move) && !("resume" in move)) return;
    setPlacing(true);
    try {
      await onMove(move);
    } finally {
      setPlacing(false);
    }
  }

  const modeLabel =
    playStyle === "infinite"
      ? `무한 · ${puzzlesCleared}판 클리어 · 라운드 ${round}`
      : mode === "solo"
        ? "솔로"
        : mode === "versus"
          ? "대결 — 먼저 찾은 사람 점수"
          : "협동 — 함께 찾기";

  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-folk-cobalt/20 bg-folk-gold/10 px-4 py-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-medium">
            {puzzleTitle ?? theme} · {modeLabel}
          </span>
          <span className={cn("font-mono tabular-nums flex items-center gap-1", urgent && "text-red-600 font-bold")}>
            <Timer className={cn("h-4 w-4", urgent && "animate-pulse")} />
            {formatSpotTime(timeLeftMs)}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span>
            찾은 개수 <strong>{found.length}</strong> / {totalDiffs}
          </span>
          {userId && !isSpectator && (
            <>
              <span>내 점수 {myScore}</span>
              {myCombo > 1 && <span className="text-amber-700">🔥 {myCombo}콤보</span>}
              {(wrongCounts[userId] ?? 0) > 0 && (
                <span className="text-muted-foreground text-xs">오답 {wrongCounts[userId]}</span>
              )}
            </>
          )}
        </div>
        {mode !== "solo" && (
          <div className="flex flex-wrap gap-2 text-xs">
            {players.map((p) => (
              <span
                key={p.userId}
                className={cn(
                  "rounded-md border px-2 py-0.5",
                  p.userId === userId && "border-folk-cobalt bg-folk-cobalt/10"
                )}
              >
                {p.username} {scores[p.userId] ?? 0}점
              </span>
            ))}
          </div>
        )}
        {lastFeedback && !finished && (
          <p className={cn("text-xs font-medium", lastFeedback.ok ? "text-emerald-700" : "text-red-600")}>
            {lastFeedback.message}
          </p>
        )}
      </div>

      <SpotDiffBoard
        width={width}
        height={height}
        left={left}
        right={right}
        imageLeft={imageLeft}
        imageRight={imageRight}
        found={found.map((f) => ({
          x: f.x,
          y: f.y,
          radius: f.radius,
          foundBy: f.foundBy,
        }))}
        hintFlash={hintActive}
        disabled={!canPlay}
        placing={placing}
        onTap={(side, x, y) => void act({ x, y, side })}
      />

      <p className="text-center text-xs text-muted-foreground">
        정답 클릭 → 원 표시 · 오답 −{SPOT_DIFF_WRONG_PENALTY_MS / 1000}초 · 핀치/버튼 확대
      </p>

      {!isSpectator && !finished && (
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canPlay}
            onClick={() => void act({ hint: true })}
          >
            <Lightbulb className="h-4 w-4 mr-1" />
            힌트 (−15초)
            {userId && (hintsUsed[userId] ?? 0) > 0 ? ` · ${hintsUsed[userId]}회` : ""}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (localPause || paused) {
                setLocalPause(false);
                void act({ resume: true });
              } else {
                setLocalPause(true);
                void act({ pause: true });
              }
            }}
          >
            {localPause || paused ? (
              <>
                <Play className="h-4 w-4 mr-1" />
                재개
              </>
            ) : (
              <>
                <Pause className="h-4 w-4 mr-1" />
                일시정지
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
