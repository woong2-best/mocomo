"use client";

import { useEffect, useRef, useState } from "react";
import { Crown, Flame, Music2, Swords, Timer, Zap } from "lucide-react";
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
  playFeverStart,
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
  elapsedMs,
  timeLeftMs,
  stats,
  lastFeedback,
  userId,
  isSpectator,
  finished,
  players,
  onMove,
}: Props) {
  const feverPlayed = useRef(false);
  const [placing, setPlacing] = useState(false);
  const [scorePop, setScorePop] = useState(false);
  const myStats = userId ? stats[userId] : undefined;
  const canPlay = !isSpectator && !finished && phase === "playing" && !myStats?.eliminated;
  const now = Date.now();
  const shake = !!(myStats && myStats.debuffShakeUntil > now);
  const speedBoost = !!(myStats && myStats.debuffSpeedUntil > now);
  const lastJudge = userId ? lastFeedback[userId]?.judge : null;
  const combo = myStats?.combo ?? 0;
  const fever = combo >= 30;
  const progressPct =
    durationMs > 0 && phase === "playing"
      ? Math.min(100, Math.max(0, ((durationMs - timeLeftMs) / durationMs) * 100))
      : finished
        ? 100
        : 0;

  const opponents = players.filter((p) => p.userId !== userId);

  useEffect(() => {
    if (!userId || !lastFeedback[userId]) return;
    const fb = lastFeedback[userId]!;
    if (fb.judge === "ATTACK") playAttackReceived();
    if (fb.judge === "PERFECT" || fb.judge === "GREAT") {
      setScorePop(true);
      const t = window.setTimeout(() => setScorePop(false), 400);
      return () => clearTimeout(t);
    }
  }, [lastFeedback, userId]);

  useEffect(() => {
    if (fever && !feverPlayed.current && phase === "playing") {
      feverPlayed.current = true;
      playFeverStart();
    }
    if (combo < 30) feverPlayed.current = false;
  }, [fever, combo, phase]);

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
  }, [phase, startedAt, finished, isSpectator, audioUrl, audioOffsetMs, notes]);

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
    if (!canPlay || placing || combo < PIANO_RUSH_ATTACK_COMBO) return;
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
      <div
        className={cn(
          "rounded-2xl border px-4 py-3 space-y-3 overflow-hidden relative",
          fever
            ? "border-yellow-400/40 bg-gradient-to-br from-yellow-950/30 via-violet-950/50 to-black/60"
            : "border-violet-500/30 bg-gradient-to-br from-violet-950/50 via-indigo-950/30 to-black/50"
        )}
      >
        {fever && (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(250,204,21,0.12),transparent_60%)] pointer-events-none" />
        )}
        <div className="relative flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <Music2 className={cn("h-5 w-5 shrink-0 mt-0.5", fever ? "text-yellow-300" : "text-violet-300")} />
            <div className="min-w-0">
              <p className="font-bold text-violet-50 truncate">{chartTitle}</p>
              <p className="text-xs text-muted-foreground truncate">
                {chartArtist} · {PIANO_CATEGORY_LABELS[category as keyof typeof PIANO_CATEGORY_LABELS] ?? category} ·{" "}
                {difficulty} · {bpm} BPM
                {audioUrl ? ` · ${license ?? "CC PD"}` : ""}
              </p>
            </div>
          </div>
          <span className="rounded-lg bg-violet-600/40 px-2.5 py-1 text-xs font-bold text-violet-100 border border-violet-400/30">
            {PIANO_MODE_LABELS[mode]}
          </span>
        </div>

        <div className="relative h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              fever ? "bg-gradient-to-r from-yellow-400 to-orange-500" : "bg-gradient-to-r from-violet-500 to-cyan-400"
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="relative flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5 text-violet-200">
            <Timer className="h-4 w-4" />
            {finished ? "종료" : phase === "countdown" ? "준비…" : `${Math.ceil(timeLeftMs / 1000)}초`}
          </span>
          {myStats && (
            <>
              <span
                className={cn(
                  "font-black text-yellow-300 tabular-nums",
                  scorePop && "animate-[pianoScorePop_0.4s_ease-out]"
                )}
              >
                {myStats.score.toLocaleString()}
              </span>
              <span
                className={cn(
                  "font-bold tabular-nums inline-flex items-center gap-1",
                  fever ? "text-yellow-300 animate-pulse" : "text-emerald-400"
                )}
              >
                {fever && <Flame className="h-4 w-4" />}
                {myStats.combo} COMBO
              </span>
              <span className="text-sky-300">{myStats.accuracy}%</span>
              {mode === "battle" && <span className="text-red-400 font-bold">♥ {myStats.lives}</span>}
            </>
          )}
        </div>

        {mode !== "solo" && opponents.length > 0 && (
          <div className="relative flex flex-wrap gap-2">
            {opponents.map((p) => {
              const st = stats[p.userId];
              if (!st) return null;
              return (
                <div
                  key={p.userId}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-xs backdrop-blur-sm",
                    st.eliminated ? "border-red-900/50 opacity-50" : "border-white/20 bg-black/30"
                  )}
                >
                  <span className="font-semibold">{playerName(players, p.userId)}</span>
                  <span className="ml-2 text-yellow-200 font-bold">{st.score}</span>
                  <span className="ml-1 text-emerald-400">{st.combo}c</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isSpectator && (
        <p className="text-center text-xs text-muted-foreground">관전 중 · 실시간 점수</p>
      )}

      {myStats?.eliminated && !finished && (
        <p className="text-center text-sm text-red-400 font-bold">탈락 — 관전 계속 가능</p>
      )}

      <div className={cn(shake && "motion-safe:animate-[shake_0.35s_ease-in-out_infinite]")}>
        <PianoRushLanes
          notes={notes}
          startedAt={startedAt}
          phase={phase}
          elapsedMs={elapsedMs}
          hitNotes={hitNotes}
          bpm={bpm}
          combo={combo}
          lastJudge={lastJudge}
          disabled={!canPlay || placing}
          shake={shake}
          speedBoost={speedBoost}
          onMove={(m) => void sendMove(m)}
        />
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        PC: D F J K · 모바일: 네온 패드 · 롱 홀드 · 슬라이드 드래그 · 30콤보 FEVER
      </p>

      {canPlay && mode === "duel" && combo >= PIANO_RUSH_ATTACK_COMBO && (
        <div className="flex justify-center">
          <Button
            type="button"
            size="sm"
            className="rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 font-bold shadow-lg shadow-orange-900/40"
            onClick={() => void sendAttack()}
          >
            <Zap className="h-4 w-4 mr-1" />
            공격 ({PIANO_RUSH_ATTACK_COMBO}콤보)
          </Button>
        </div>
      )}

      {finished && userId && myStats && (
        <div className="rounded-2xl border border-violet-500/40 bg-gradient-to-b from-violet-950/50 to-black/60 p-5 text-center space-y-2 shadow-xl">
          <Crown className="h-8 w-8 mx-auto text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]" />
          <p className="font-black text-2xl text-yellow-100">{myStats.score.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">
            정확도 {myStats.accuracy}% · 최대 {myStats.maxCombo} COMBO
          </p>
        </div>
      )}

      {mode === "duel" && !finished && (
        <div className="flex items-center justify-center gap-1 text-xs text-violet-300/80">
          <Swords className="h-3 w-3" />
          실시간 1:1 · 서버 판정
        </div>
      )}
    </div>
  );
}
