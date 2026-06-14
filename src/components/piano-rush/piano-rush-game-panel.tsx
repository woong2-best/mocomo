"use client";

import { useEffect, useState } from "react";
import { Crown, Swords, Timer, Zap } from "lucide-react";
import { PianoRushLanes } from "@/components/piano-rush/piano-rush-lanes";
import { Button } from "@/components/ui/button";
import {
  PIANO_CATEGORY_LABELS,
  PIANO_MODE_LABELS,
  PIANO_RUSH_ATTACK_COMBO,
  type PianoChartNote,
  type PianoRushMode,
  type PianoRushMove,
} from "@/lib/minigames/piano-rush-logic";
import {
  playAttackReceived,
  playJudgeSound,
  preloadChartTrack,
  startChartMelody,
  startChartTrack,
  stopAllChartAudio,
} from "@/lib/minigames/piano-rush-sounds";
import type { MinigamePlayerPublic } from "@/lib/minigames/shared-types";
import { cn } from "@/lib/utils";

type PlayerPublic = {
  score: number;
  combo: number;
  maxCombo: number;
  accuracy: number;
  lives: number;
  eliminated: boolean;
  debuffShakeUntil: number;
  debuffSpeedUntil: number;
  hitNotes?: string[];
};

type Props = {
  chartTitle: string;
  chartArtist: string;
  category: string;
  difficulty: string;
  bpm: number;
  durationMs: number;
  notes: PianoChartNote[];
  audioUrl?: string;
  audioOffsetMs?: number;
  license?: string;
  mode: PianoRushMode;
  phase: "countdown" | "playing" | "finished";
  startedAt: number;
  elapsedMs: number;
  timeLeftMs: number;
  stats: Record<string, PlayerPublic>;
  lastFeedback: Record<string, { judge: string; message: string } | null>;
  userId?: string;
  isSpectator: boolean;
  finished?: boolean;
  players: MinigamePlayerPublic[];
  onMove: (move: PianoRushMove) => Promise<boolean>;
};

function playerName(players: MinigamePlayerPublic[], id: string) {
  return players.find((p) => p.userId === id)?.username ?? "플레이어";
}

export function PianoRushGamePanel({
  chartTitle,
  chartArtist,
  category,
  difficulty,
  bpm,
  durationMs,
  notes,
  audioUrl,
  audioOffsetMs,
  license,
  mode,
  phase,
  startedAt,
  timeLeftMs,
  stats,
  lastFeedback,
  userId,
  isSpectator,
  finished,
  players,
  onMove,
}: Props) {
  const [placing, setPlacing] = useState(false);
  const myStats = userId ? stats[userId] : undefined;
  const canPlay = !isSpectator && !finished && phase === "playing" && !myStats?.eliminated;
  const now = Date.now();
  const shake = !!(myStats && myStats.debuffShakeUntil > now);
  const speedBoost = !!(myStats && myStats.debuffSpeedUntil > now);

  const opponents = players.filter((p) => p.userId !== userId);

  useEffect(() => {
    if (!userId || !lastFeedback[userId]) return;
    const fb = lastFeedback[userId]!;
    if (fb.judge === "PERFECT" || fb.judge === "GREAT" || fb.judge === "GOOD" || fb.judge === "MISS") {
      playJudgeSound(fb.judge);
    }
    if (fb.judge === "ATTACK") playAttackReceived();
  }, [lastFeedback, userId]);

  useEffect(() => {
    if (audioUrl && (phase === "countdown" || phase === "playing")) {
      preloadChartTrack(audioUrl);
    }
  }, [audioUrl, phase]);

  useEffect(() => {
    if (phase !== "playing" || finished) {
      stopAllChartAudio();
      return;
    }
    if (audioUrl) {
      const stop = startChartTrack({ audioUrl, audioOffsetMs }, startedAt);
      return () => stop();
    }
    if (isSpectator) {
      stopAllChartAudio();
      return;
    }
    const stop = startChartMelody(notes, startedAt);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 멜로디/트랙은 곡 시작 시 1회만
  }, [phase, startedAt, finished, isSpectator, audioUrl, audioOffsetMs]);

  useEffect(() => () => stopAllChartAudio(), []);

  async function sendMove(move: PianoRushMove) {
    if (!canPlay || placing) return;
    setPlacing(true);
    try {
      await onMove(move);
    } finally {
      setPlacing(false);
    }
  }

  async function sendAttack() {
    if (!canPlay || placing || (myStats?.combo ?? 0) < PIANO_RUSH_ATTACK_COMBO) return;
    setPlacing(true);
    try {
      await onMove({ type: "attack" });
    } finally {
      setPlacing(false);
    }
  }

  const hitNotes = userId ? (stats[userId]?.hitNotes ?? []) : [];

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-950/40 to-black/40 px-4 py-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-violet-100">{chartTitle}</p>
            <p className="text-xs text-muted-foreground">
              {chartArtist} · {PIANO_CATEGORY_LABELS[category as keyof typeof PIANO_CATEGORY_LABELS] ?? category} ·{" "}
              {difficulty} · {bpm} BPM
              {audioUrl ? ` · ${license ?? "CC PD"}` : " · 합성음"}
            </p>
          </div>
          <span className="rounded-md bg-violet-600/30 px-2 py-0.5 text-xs font-medium text-violet-200">
            {PIANO_MODE_LABELS[mode]}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Timer className="h-4 w-4 text-violet-300" />
          <span>
            {finished
              ? "종료"
              : phase === "countdown"
                ? "시작 준비…"
                : `${Math.ceil(timeLeftMs / 1000)}초 남음`}
          </span>
          {myStats && (
            <>
              <span className="font-bold text-yellow-300">{myStats.score.toLocaleString()}점</span>
              <span className="text-emerald-400">{myStats.combo} 콤보</span>
              <span className="text-sky-300">{myStats.accuracy}%</span>
              {mode === "battle" && (
                <span className="text-red-400">♥ {myStats.lives}</span>
              )}
            </>
          )}
        </div>

        {mode !== "solo" && opponents.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {opponents.map((p) => {
              const st = stats[p.userId];
              if (!st) return null;
              return (
                <div
                  key={p.userId}
                  className={cn(
                    "rounded-lg border px-2 py-1 text-xs",
                    st.eliminated ? "border-red-900/50 opacity-50" : "border-white/15 bg-white/5"
                  )}
                >
                  <span className="font-medium">{playerName(players, p.userId)}</span>
                  <span className="ml-2 text-yellow-200">{st.score}</span>
                  <span className="ml-1 text-emerald-400">{st.combo}c</span>
                  {st.eliminated && <span className="ml-1 text-red-400">탈락</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isSpectator && (
        <p className="text-center text-xs text-muted-foreground">관전 중 · 실시간 점수 비교</p>
      )}

      {myStats?.eliminated && !finished && (
        <p className="text-center text-sm text-red-400 font-medium">탈락 — 관전을 계속할 수 있습니다</p>
      )}

      <div
        className={cn(shake && "motion-safe:animate-[wiggle_0.35s_ease-in-out_infinite]")}
        style={
          shake
            ? undefined
            : undefined
        }
      >
        <PianoRushLanes
          notes={notes}
          startedAt={startedAt}
          phase={phase}
          elapsedMs={0}
          hitNotes={hitNotes}
          disabled={!canPlay || placing}
          shake={shake}
          speedBoost={speedBoost}
          onMove={(m) => void sendMove(m)}
        />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        PC: D F J K · 모바일: 하단 버튼 · 롱노트는 길게 · 슬라이드는 드래그
      </p>

      {canPlay && mode === "duel" && (myStats?.combo ?? 0) >= PIANO_RUSH_ATTACK_COMBO && (
        <div className="flex justify-center">
          <Button type="button" size="sm" variant="secondary" onClick={() => void sendAttack()}>
            <Zap className="h-4 w-4 mr-1" />
            공격 ({PIANO_RUSH_ATTACK_COMBO}콤보)
          </Button>
        </div>
      )}

      {finished && userId && myStats && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-950/30 p-4 text-center space-y-1">
          <Crown className="h-6 w-6 mx-auto text-yellow-400" />
          <p className="font-bold text-lg">{myStats.score.toLocaleString()}점</p>
          <p className="text-sm text-muted-foreground">
            정확도 {myStats.accuracy}% · 최대 {myStats.maxCombo}콤보
          </p>
        </div>
      )}

      {mode === "duel" && !finished && (
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <Swords className="h-3 w-3" />
          실시간 1:1 · 서버 판정
        </div>
      )}
    </div>
  );
}
