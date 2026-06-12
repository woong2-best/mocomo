"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OmokBoard } from "@/components/omok/omok-board";
import { buildReplaySteps, snapshotAtStep } from "@/lib/minigames/replay";
import { getMinigameById } from "@/lib/minigames/registry";
import { getMinigameRoute } from "@/lib/minigames/game-meta";
import { Chess } from "chess.js";

type MatchData = {
  id: string;
  gameId: string;
  moves: unknown[];
  playerNames?: Record<string, string>;
  result?: string | null;
  initialState?: Record<string, unknown> | null;
};

export function MinigameReplayClient({ gameId, matchId }: { gameId: string; matchId: string }) {
  const [match, setMatch] = useState<MatchData | null>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    void fetch(`/api/minigames/matches/${matchId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.id) setMatch(d);
      });
  }, [matchId]);

  const moves = match?.moves ?? [];
  const steps = useMemo(
    () => buildReplaySteps(gameId, moves, match?.playerNames),
    [gameId, moves, match?.playerNames]
  );
  const snapshot = useMemo(
    () => snapshotAtStep(gameId, moves, step, match?.initialState),
    [gameId, moves, step, match?.initialState]
  );

  useEffect(() => {
    if (!playing || step >= moves.length) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStep((s) => s + 1), 800 / speed);
    return () => clearTimeout(t);
  }, [playing, step, moves.length, speed]);

  const game = getMinigameById(gameId);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Link href={getMinigameRoute(gameId)} className="text-xs text-muted-foreground hover:underline">
        ← {game?.name ?? gameId}
      </Link>
      <h1 className="text-xl font-display font-bold">리플레이</h1>
      {match?.result && <p className="text-sm text-muted-foreground">{match.result}</p>}

      <Card className="border-2 border-folk-cobalt/20">
        <CardContent className="p-4 flex flex-col items-center gap-4">
          {(gameId === "omok" || gameId === "reversi") && snapshot.board && (
            <OmokBoard board={snapshot.board} disabled />
          )}
          {gameId === "chess" && snapshot.fen && <ChessMiniBoard fen={snapshot.fen} />}
          {!snapshot.board && !snapshot.fen && (
            <p className="text-sm">{snapshot.label}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {step} / {moves.length}수
            {steps[step - 1]?.label ? ` · ${steps[step - 1]!.label}` : ""}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 items-center justify-center">
        <Button variant="outline" size="sm" onClick={() => setStep(0)} disabled={step === 0}>
          처음
        </Button>
        <Button variant="outline" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          이전
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPlaying((p) => !p)} disabled={moves.length === 0}>
          {playing ? "일시정지" : "재생"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setStep((s) => Math.min(moves.length, s + 1))} disabled={step >= moves.length}>
          다음
        </Button>
        <select className="text-xs border rounded-lg px-2 py-1" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
      </div>

      <div className="max-h-40 overflow-y-auto text-xs space-y-1 border rounded-lg p-2">
        {steps.map((s) => (
          <button
            key={s.index}
            type="button"
            className={`block w-full text-left px-2 py-1 rounded ${s.index + 1 === step ? "bg-folk-gold/30" : "hover:bg-muted"}`}
            onClick={() => setStep(s.index + 1)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChessMiniBoard({ fen }: { fen: string }) {
  const chess = new Chess(fen);
  const board = chess.board();
  return (
    <div className="grid grid-cols-8 gap-0 border w-fit">
      {board.flatMap((row, yi) =>
        row.map((cell, xi) => (
          <div key={`${xi}-${yi}`} className="w-7 h-7 flex items-center justify-center text-sm bg-amber-50">
            {cell ? cell.type : ""}
          </div>
        ))
      )}
    </div>
  );
}
