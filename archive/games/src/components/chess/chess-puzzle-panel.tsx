"use client";

import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import { ChevronLeft, ChevronRight, Lightbulb, RotateCcw, Trophy } from "lucide-react";
import { ChessBoard } from "@/components/chess/chess-board";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { tryChessMove, type ChessMoveInput } from "@/lib/minigames/chess-logic";
import { CHESS_PUZZLES, type ChessPuzzle } from "@/lib/minigames/chess-puzzles";
import { cn } from "@/lib/utils";

function movesMatch(a: ChessMoveInput, b: ChessMoveInput): boolean {
  return a.from === b.from && a.to === b.to && (a.promotion ?? "q") === (b.promotion ?? "q");
}

export function ChessPuzzlePanel() {
  const [index, setIndex] = useState(0);
  const [fen, setFen] = useState(CHESS_PUZZLES[0]!.fen);
  const [step, setStep] = useState(0);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  const puzzle: ChessPuzzle = CHESS_PUZZLES[index] ?? CHESS_PUZZLES[0]!;
  const orientation = useMemo(() => {
    const turn = new Chess(fen).turn();
    return turn === "w" ? "white" : "black";
  }, [fen]);

  function loadPuzzle(i: number) {
    const p = CHESS_PUZZLES[i];
    if (!p) return;
    setIndex(i);
    setFen(p.fen);
    setStep(0);
    setSolved(false);
    setWrong(false);
    setShowHint(false);
    setLastMove(null);
  }

  function resetPuzzle() {
    setFen(puzzle.fen);
    setStep(0);
    setSolved(false);
    setWrong(false);
    setShowHint(false);
    setLastMove(null);
  }

  function handleMove(move: ChessMoveInput) {
    if (solved) return;
    const expected = puzzle.solution[step];
    if (!expected || !movesMatch(move, expected)) {
      setWrong(true);
      setTimeout(() => setWrong(false), 1200);
      return;
    }
    const result = tryChessMove(fen, move);
    if (!result.ok) {
      setWrong(true);
      setTimeout(() => setWrong(false), 1200);
      return;
    }
    setLastMove({ from: move.from, to: move.to });
    const nextStep = step + 1;
    if (nextStep >= puzzle.solution.length) {
      setFen(result.fen);
      setSolved(true);
      setStep(nextStep);
      return;
    }
    setFen(result.fen);
    setStep(nextStep);
    setWrong(false);
  }

  return (
    <Card className="border-2 border-folk-cobalt/20">
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">체스 퍼즐</p>
            <h2 className="font-display font-bold text-lg">{puzzle.title}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {index + 1} / {CHESS_PUZZLES.length} · 난이도{" "}
              {puzzle.difficulty === "easy" ? "쉬움" : puzzle.difficulty === "medium" ? "보통" : "어려움"}
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={index === 0}
              onClick={() => loadPuzzle(index - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={index >= CHESS_PUZZLES.length - 1}
              onClick={() => loadPuzzle(index + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {solved ? (
          <div className="rounded-xl border border-emerald-300/60 bg-emerald-50/80 px-4 py-3 flex items-center gap-2 text-sm text-emerald-800">
            <Trophy className="h-4 w-4 shrink-0" />
            정답! {puzzle.solution.length}수로 퍼즐을 풀었습니다.
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {step === 0 ? "최선의 수를 찾으세요." : `${step + 1}수째 — 계속 진행하세요.`}
          </p>
        )}

        {wrong && (
          <p className="text-xs text-destructive font-medium">틀렸습니다. 다시 시도하세요.</p>
        )}

        <div className="flex justify-center">
          <ChessBoard
            fen={fen}
            orientation={orientation}
            lastMove={lastMove}
            disabled={solved}
            showCoordinates
            onMove={handleMove}
          />
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowHint((v) => !v)}>
            <Lightbulb className="h-4 w-4 mr-1" />
            힌트
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={resetPuzzle}>
            <RotateCcw className="h-4 w-4 mr-1" />
            다시
          </Button>
          {solved && index < CHESS_PUZZLES.length - 1 && (
            <Button type="button" size="sm" onClick={() => loadPuzzle(index + 1)}>
              다음 퍼즐
            </Button>
          )}
        </div>

        {showHint && (
          <p className={cn("text-xs text-center text-amber-800 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200")}>
            {puzzle.hint}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
