"use client";

import { useState } from "react";
import { ChessGamePanel } from "@/components/chess/chess-game-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OmokGamePanel } from "@/components/omok/omok-game-panel";
import { OmokBoard } from "@/components/omok/omok-board";
import { ReversiGamePanel } from "@/components/reversi/reversi-game-panel";
import type { SpotDiffMode, SpotDiffPlayStyle, SpotShape } from "@/lib/minigames/spot-diff-logic";
import { SpotDiffGamePanel } from "@/components/spot-diff/spot-diff-game-panel";
import { PianoRushGamePanel } from "@/components/piano-rush/piano-rush-game-panel";
import { ParkingRushGamePanel, type ParkingRushPlayerStats } from "@/components/parking-rush/parking-rush-game-panel";
import { TowerRushGamePanel, type TowerRushPlayerStats } from "@/components/tower-rush/tower-rush-game-panel";
import type { PianoChartNote, PianoRushMode } from "@/lib/minigames/piano-rush-logic";
import type { ParkingRushMode } from "@/lib/minigames/parking-rush-logic";
import type { TowerRushMode } from "@/lib/minigames/tower-rush-logic";
import { AlkkagiBoard } from "@/components/minigames/alkkagi-board";
import { WordChainPanel } from "@/components/minigames/word-chain-panel";
import { BadukGamePanel } from "@/components/baduk/baduk-game-panel";
import type { Stone } from "@/lib/minigames/baduk-logic";
import { JanggiGamePanel } from "@/components/janggi/janggi-game-panel";
import type { JanggiBoard, JanggiMove } from "@/lib/minigames/janggi-logic";
import { RPS_LABELS } from "@/lib/minigames/rps-logic";
import type { MinigamePublicState, RpsChoice } from "@/lib/minigames/shared-types";
import type { AlkkagiStone } from "@/lib/minigames/alkkagi-physics";
import { cn } from "@/lib/utils";

type Props = {
  gameId: string;
  state: MinigamePublicState;
  userId?: string;
  isSpectator: boolean;
  onMove: (move: unknown) => Promise<boolean>;
  error: string | null;
  onClearError: () => void;
};

export function GameActiveView({ gameId, state, userId, isSpectator, onMove, error }: Props) {
  const g = (state as { game?: Record<string, unknown> | null }).game;
  if (!g) return null;

  switch (gameId) {
    case "omok":
      return (
        <OmokGamePanel
          board={g.board as number[][]}
          turn={(g.turn as "black" | "white") ?? "black"}
          turnUserId={g.turnUserId as string | null}
          blackUserId={g.blackUserId as string}
          whiteUserId={g.whiteUserId as string}
          lastMove={(g.lastMove as { x: number; y: number } | null) ?? null}
          winLine={(g.winLine as { x: number; y: number }[] | null) ?? null}
          timeLeft={(g.timeLeft as number) ?? 0}
          turnLimit={(g.turnLimit as number) ?? 20}
          ruleMode={(g.ruleMode as "free" | "renju") ?? "free"}
          moveCount={(g.moveCount as number) ?? 0}
          userId={userId}
          isSpectator={isSpectator}
          finished={state.status === "finished"}
          players={state.players}
          aiDifficulty={state.omokMode === "solo" ? state.omokAiDifficulty : undefined}
          onMove={onMove}
        />
      );
    case "reversi":
      return (
        <ReversiGamePanel
          board={g.board as number[][]}
          turn={g.turn as 1 | 2}
          turnUserId={g.turnUserId as string | null}
          blackUserId={g.blackUserId as string}
          whiteUserId={g.whiteUserId as string}
          validMoves={(g.validMoves as { x: number; y: number }[]) ?? []}
          scores={(g.scores as { black: number; white: number }) ?? { black: 2, white: 2 }}
          passStreak={(g.passStreak as number) ?? 0}
          lastMove={(g.lastMove as { x: number; y: number } | null) ?? null}
          lastNotice={(g.lastNotice as string | null) ?? null}
          useTurnTimer={!!g.useTurnTimer}
          timeLeft={(g.timeLeft as number) ?? 0}
          turnLimit={(g.turnLimit as number) ?? 30}
          finalScore={(g.finalScore as { black: number; white: number } | null) ?? null}
          userId={userId}
          isSpectator={isSpectator}
          finished={state.status === "finished"}
          players={state.players}
          onMove={onMove}
        />
      );
    case "chess":
      return (
        <ChessGamePanel
          fen={g.fen as string}
          turnUserId={g.turnUserId as string | null}
          whiteUserId={g.whiteUserId as string}
          blackUserId={g.blackUserId as string}
          isCheck={!!g.isCheck}
          isCheckmate={!!g.isCheckmate}
          isStalemate={!!g.isStalemate}
          isDraw={!!g.isDraw}
          lastMove={(g.lastMove as { from: string; to: string; san?: string } | null) ?? null}
          halfmoveClock={(g.halfmoveClock as number) ?? 0}
          drawOfferFrom={(g.drawOfferFrom as string | null) ?? null}
          useTurnTimer={!!g.useTurnTimer}
          timeLeft={(g.timeLeft as number) ?? 0}
          turnLimit={(g.turnLimit as number) ?? 30}
          pgn={(g.pgn as string[]) ?? []}
          userId={userId}
          isSpectator={isSpectator}
          finished={state.status === "finished"}
          players={state.players}
          onMove={onMove}
        />
      );
    case "janggi":
      return (
        <JanggiGamePanel
          board={g.board as JanggiBoard}
          turnRed={!!g.turnRed}
          turnUserId={g.turnUserId as string | null}
          redUserId={g.redUserId as string}
          blueUserId={g.blueUserId as string}
          lastMove={(g.lastMove as JanggiMove | null) ?? null}
          checkRed={!!g.checkRed}
          checkBlue={!!g.checkBlue}
          timeLeft={(g.timeLeft as number) ?? 0}
          turnLimit={(g.turnLimit as number) ?? 20}
          userId={userId}
          isSpectator={isSpectator}
          finished={state.status === "finished"}
          players={state.players}
          onMove={onMove}
          onResign={
            userId === g.turnUserId && !isSpectator && state.status !== "finished"
              ? () => void onMove({ resign: true })
              : undefined
          }
        />
      );
    case "baduk":
      return (
        <BadukGamePanel
          board={g.board as Stone[][]}
          boardSize={(g.boardSize as number) ?? (g.board as Stone[][])?.length ?? 19}
          turn={(g.turn as 1 | 2) ?? 1}
          turnUserId={g.turnUserId as string | null}
          blackUserId={g.blackUserId as string}
          whiteUserId={g.whiteUserId as string}
          captures={(g.captures as { black: number; white: number }) ?? { black: 0, white: 0 }}
          passStreak={(g.passStreak as number) ?? 0}
          lastMove={(g.lastMove as { x: number; y: number } | null) ?? null}
          timeLeft={(g.timeLeft as number) ?? 0}
          turnLimit={(g.turnLimit as number) ?? 30}
          komi={(g.komi as number) ?? 6.5}
          finalScore={
            (g.finalScore as {
              black: number;
              white: number;
              blackTerritory: number;
              whiteTerritory: number;
              blackCaptures: number;
              whiteCaptures: number;
              komi: number;
            } | null) ?? null
          }
          userId={userId}
          isSpectator={isSpectator}
          finished={state.status === "finished"}
          players={state.players}
          onMove={onMove}
        />
      );
    case "alkkagi":
      return (
        <AlkkagiBoard
          stones={(g.stones as AlkkagiStone[]) ?? []}
          turnUserId={g.turnUserId as string}
          userId={userId}
          isSpectator={isSpectator}
          width={(g.width as number) ?? 520}
          height={(g.height as number) ?? 520}
          scores={(g.scores as Record<string, number>) ?? {}}
          stoneCounts={(g.stoneCounts as Record<string, number>) ?? {}}
          timeLeft={(g.timeLeft as number) ?? 0}
          turnLimit={(g.turnLimit as number) ?? 20}
          phase={(g.phase as string) ?? "waiting"}
          lastKnockouts={(g.lastKnockouts as number) ?? 0}
          lastShooterId={(g.lastShooterId as string | null) ?? null}
          lastShot={
            (g.lastShot as {
              stoneId: string;
              angle: number;
              power: number;
              shooterId: string;
              seq: number;
            } | null) ?? null
          }
          players={state.players}
          blackPlayerId={(g.blackPlayerId as string | null) ?? null}
          whitePlayerId={(g.whitePlayerId as string | null) ?? null}
          onMove={onMove}
        />
      );
    case "rps":
      return <RpsView g={g} userId={userId} isSpectator={isSpectator} onMove={onMove} />;
    case "word-chain":
      return (
        <WordChainPanel
          currentWord={(g.currentWord as string | null) ?? null}
          turnUserId={(g.turnUserId as string | null) ?? null}
          usedWords={(g.usedWords as string[]) ?? []}
          timeLeft={(g.timeLeft as number) ?? 0}
          turnLimit={(g.turnLimit as number) ?? 20}
          requiredChar={(g.requiredChar as string | null) ?? null}
          history={
            (g.history as {
              userId: string;
              word: string;
              status: "ok" | "fail" | "timeout";
              reason?: string;
              at: number;
            }[]) ?? []
          }
          eliminated={(g.eliminated as string[]) ?? []}
          scores={(g.scores as Record<string, number>) ?? {}}
          userId={userId}
          isSpectator={isSpectator}
          finished={state.status === "finished"}
          players={state.players}
          onMove={onMove}
        />
      );
    case "chosung-quiz":
    case "word-guess":
    case "number-guess":
      return <QuizInputView g={g} userId={userId} isSpectator={isSpectator} onMove={onMove} gameId={gameId} />;
    case "memory-cards":
    case "picture-match":
      return <MemoryView g={g} userId={userId} isSpectator={isSpectator} onMove={onMove} />;
    case "slide-puzzle":
      return <SlideView g={g} userId={userId} isSpectator={isSpectator} onMove={onMove} />;
    case "spot-diff":
      return (
        <SpotDiffGamePanel
          width={(g.width as number) ?? 400}
          height={(g.height as number) ?? 260}
          left={(g.left as SpotShape[]) ?? []}
          right={(g.right as SpotShape[]) ?? []}
          imageLeft={g.imageLeft as string | undefined}
          imageRight={g.imageRight as string | undefined}
          puzzleTitle={g.puzzleTitle as string | undefined}
          found={(g.found as { id: number; x: number; y: number; radius: number; foundBy?: string }[]) ?? []}
          totalDiffs={(g.totalDiffs as number) ?? 7}
          scores={(g.scores as Record<string, number>) ?? {}}
          combos={(g.combos as Record<string, number>) ?? {}}
          wrongCounts={(g.wrongCounts as Record<string, number>) ?? {}}
          hintsUsed={(g.hintsUsed as Record<string, number>) ?? {}}
          hintFlash={(g.hintFlash as { x: number; y: number; until: number } | null) ?? null}
          mode={(g.mode as SpotDiffMode) ?? "solo"}
          playStyle={(g.playStyle as SpotDiffPlayStyle) ?? "normal"}
          round={(g.round as number) ?? 1}
          puzzlesCleared={(g.puzzlesCleared as number) ?? 0}
          theme={(g.theme as string) ?? "풍경"}
          timeLeftMs={(g.timeLeftMs as number) ?? 0}
          paused={!!g.paused}
          lastFeedback={
            g.lastFeedback && userId && (g.lastFeedback as { userId: string }).userId === userId
              ? (g.lastFeedback as { ok: boolean; message: string })
              : null
          }
          userId={userId}
          isSpectator={isSpectator}
          finished={state.status === "finished"}
          players={state.players}
          onMove={onMove}
        />
      );
    case "piano-rush":
      return (
        <PianoRushGamePanel
          chartTitle={(g.chartTitle as string) ?? "곡"}
          chartArtist={(g.chartArtist as string) ?? ""}
          category={(g.category as string) ?? "piano"}
          difficulty={(g.difficulty as string) ?? "NORMAL"}
          bpm={(g.bpm as number) ?? 120}
          durationMs={(g.durationMs as number) ?? 60000}
          notes={(g.notes as PianoChartNote[]) ?? []}
          audioUrl={g.audioUrl as string | undefined}
          audioOffsetMs={(g.audioOffsetMs as number) ?? 0}
          license={g.license as string | undefined}
          mode={(g.mode as PianoRushMode) ?? "duel"}
          phase={(g.phase as "countdown" | "playing" | "finished") ?? "countdown"}
          startedAt={(g.startedAt as number) ?? Date.now()}
          elapsedMs={(g.elapsedMs as number) ?? 0}
          timeLeftMs={(g.timeLeftMs as number) ?? 0}
          stats={(g.stats as Record<string, { score: number; combo: number; maxCombo: number; accuracy: number; lives: number; eliminated: boolean; debuffShakeUntil: number; debuffSpeedUntil: number; hitNotes?: string[] }>) ?? {}}
          lastFeedback={(g.lastFeedback as Record<string, { judge: string; message: string } | null>) ?? {}}
          userId={userId}
          isSpectator={isSpectator}
          finished={state.status === "finished"}
          players={state.players}
          onMove={onMove}
        />
      );
    case "parking-rush":
      return (
        <ParkingRushGamePanel
          levelName={(g.levelName as string) ?? "주차장"}
          mapType={(g.mapType as string) ?? "parking_lot"}
          difficulty={(g.difficulty as string) ?? "beginner"}
          mode={(g.mode as ParkingRushMode) ?? "solo"}
          phase={(g.phase as "countdown" | "playing" | "finished") ?? "countdown"}
          startedAt={(g.startedAt as number) ?? Date.now()}
          timeLeftMs={(g.timeLeftMs as number) ?? 0}
          walls={(g.walls as unknown[]) ?? []}
          obstacles={(g.obstacles as unknown[]) ?? []}
          parkingSpots={(g.parkingSpots as unknown[]) ?? []}
          bounds={(g.bounds as { x: number; y: number; w: number; h: number }) ?? undefined}
          groundColor={(g.groundColor as string) ?? "#2a3444"}
          accentColor={(g.accentColor as string) ?? "#22d3ee"}
          stats={(g.stats as Record<string, ParkingRushPlayerStats>) ?? {}}
          playerOrder={(g.playerOrder as string[]) ?? []}
          finishOrder={(g.finishOrder as string[]) ?? []}
          userId={userId}
          isSpectator={isSpectator}
          finished={state.status === "finished"}
          players={state.players}
          onMove={onMove}
        />
      );
    case "tower-rush":
      return (
        <TowerRushGamePanel
          mapId={(g.mapId as string) ?? "city"}
          mapName={(g.mapName as string) ?? "도심"}
          mode={(g.mode as TowerRushMode) ?? "solo"}
          phase={(g.phase as "countdown" | "playing" | "finished") ?? "countdown"}
          startedAt={(g.startedAt as number) ?? Date.now()}
          timeLeftMs={(g.timeLeftMs as number) ?? 0}
          stats={(g.stats as Record<string, TowerRushPlayerStats>) ?? {}}
          playerOrder={(g.playerOrder as string[]) ?? []}
          finishOrder={(g.finishOrder as string[]) ?? []}
          userId={userId}
          isSpectator={isSpectator}
          finished={state.status === "finished"}
          players={state.players}
          onDrop={() => onMove({ drop: true })}
        />
      );
    case "jigsaw":
      return <JigsawView g={g} userId={userId} isSpectator={isSpectator} onMove={onMove} />;
    default:
      return <p className="text-sm text-muted-foreground text-center">UI 준비 중</p>;
  }
}

function BoardView({
  board,
  lastMove,
  turnUserId,
  userId,
  isSpectator,
  onCell,
  label,
  extra,
}: {
  board: number[][];
  lastMove?: { x: number; y: number } | null;
  turnUserId: string | null;
  userId?: string;
  isSpectator: boolean;
  onCell: (x: number, y: number) => void;
  label: string;
  extra?: React.ReactNode;
}) {
  const myTurn = turnUserId === userId && !isSpectator;
  return (
    <Card className="border-2 border-folk-cobalt/20 overflow-x-auto">
      <CardContent className="p-4 flex flex-col items-center gap-3">
        <p className="text-sm font-semibold">{myTurn ? "내 턴" : label}</p>
        {extra}
        <OmokBoard board={board} lastMove={lastMove} disabled={!myTurn} onCellClick={onCell} />
      </CardContent>
    </Card>
  );
}

function RpsView({ g, userId, isSpectator, onMove }: { g: Record<string, unknown>; userId?: string; isSpectator: boolean; onMove: Props["onMove"] }) {
  const picks = g.picks as Record<string, RpsChoice | null>;
  const canPick = g.phase === "pick" && userId && picks[userId] == null && !isSpectator;
  return (
    <Card className="border-2 border-folk-cobalt/20">
      <CardContent className="p-6 text-center space-y-3">
        <p className="text-sm">{g.round as number} / {g.maxRounds as number}판</p>
        {canPick && (
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
            {(["rock", "paper", "scissors"] as RpsChoice[]).map((c) => (
              <Button key={c} className="rounded-xl" onClick={() => onMove(c)}>{RPS_LABELS[c]}</Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuizInputView({ g, userId, isSpectator, onMove, gameId }: { g: Record<string, unknown>; userId?: string; isSpectator: boolean; onMove: Props["onMove"]; gameId: string }) {
  const [val, setVal] = useState("");
  const myTurn = g.turnUserId === userId && !isSpectator;
  return (
    <Card className="border-2 border-folk-cobalt/20">
      <CardContent className="p-6 space-y-3 text-center">
        {gameId === "chosung-quiz" && <p className="text-3xl font-bold tracking-widest">{g.chosung as string}</p>}
        {gameId === "number-guess" && <p className="text-sm">{g.min as number} ~ {g.max as number} · {g.remaining as number}회 남음</p>}
        {gameId === "word-guess" && <p className="text-xs text-muted-foreground">한글 단어 추측</p>}
        {(g.guesses as unknown[])?.length > 0 && (
          <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
            {(g.guesses as { word?: string; value?: number; hint?: string; feedback?: string }[]).slice(-6).map((x, i) => (
              <p key={i}>{x.word ?? x.value} → {x.feedback ?? x.hint}</p>
            ))}
          </div>
        )}
        {myTurn && (
          <form onSubmit={(e) => { e.preventDefault(); void onMove(gameId === "number-guess" ? Number(val) : val).then(() => setVal("")); }} className="flex gap-2">
            <Input value={val} onChange={(e) => setVal(e.target.value)} type={gameId === "number-guess" ? "number" : "text"} />
            <Button type="submit">확인</Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function MemoryView({ g, userId, isSpectator, onMove }: { g: Record<string, unknown>; userId?: string; isSpectator: boolean; onMove: Props["onMove"] }) {
  const deckSize = g.deckSize as number;
  const revealed = new Set(g.revealed as number[]);
  const matched = new Set(g.matched as number[]);
  const myTurn = g.turnUserId === userId && !isSpectator;
  return (
    <Card className="border-2 border-folk-cobalt/20">
      <CardContent className="p-4 grid grid-cols-4 sm:grid-cols-8 gap-2">
        {Array.from({ length: deckSize }, (_, i) => (
          <button
            key={i}
            type="button"
            disabled={!myTurn || matched.has(i)}
            onClick={() => onMove(i)}
            className={cn(
              "aspect-square rounded-lg border-2 text-xs font-bold",
              matched.has(i) ? "opacity-30" : revealed.has(i) ? "bg-folk-gold/30" : "bg-folk-cobalt/10"
            )}
          >
            {matched.has(i) || revealed.has(i) ? `#${i}` : "?"}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function SlideView({ g, userId, isSpectator, onMove }: { g: Record<string, unknown>; userId?: string; isSpectator: boolean; onMove: Props["onMove"] }) {
  const boards = g.boards as Record<string, number[]>;
  const size = g.size as number;
  const tiles = userId ? boards[userId] : boards[Object.keys(boards)[0]!];
  if (!tiles) return null;
  const myTurn = !isSpectator && !!userId;
  return (
    <Card className="border-2 border-folk-cobalt/20">
      <CardContent className="p-4 flex flex-col items-center gap-3">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${size}, 48px)` }}>
          {tiles.map((t, i) => (
            <div key={i} className="w-12 h-12 flex items-center justify-center rounded border bg-muted/40 text-sm font-bold">
              {t === size * size - 1 ? "" : t + 1}
            </div>
          ))}
        </div>
        {myTurn && (
          <div className="grid grid-cols-2 gap-2">
            {(["up", "down", "left", "right"] as const).map((d) => (
              <Button key={d} variant="outline" className="rounded-lg" onClick={() => onMove(d)}>{d}</Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function JigsawView({ g, userId, isSpectator, onMove }: { g: Record<string, unknown>; userId?: string; isSpectator: boolean; onMove: Props["onMove"] }) {
  const pool = g.pool as number[];
  const placed = g.placed as Record<number, number>;
  const grid = g.grid as number;
  const [piece, setPiece] = useState<number | null>(null);
  const myTurn = g.turnUserId === userId && !isSpectator;
  return (
    <Card className="border-2 border-folk-cobalt/20">
      <CardContent className="p-4 space-y-3">
        <div className="grid gap-1 mx-auto w-fit" style={{ gridTemplateColumns: `repeat(${grid}, 40px)` }}>
          {Array.from({ length: grid * grid }, (_, slot) => (
            <button
              key={slot}
              type="button"
              disabled={!myTurn}
              onClick={() => piece != null && void onMove({ piece, slot }).then(() => setPiece(null))}
              className="w-10 h-10 border rounded bg-muted/30 text-xs"
            >
              {placed[slot] != null ? placed[slot] : slot}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {pool.map((p) => (
            <Button key={p} size="sm" variant={piece === p ? "default" : "outline"} disabled={!myTurn} onClick={() => setPiece(p)}>{p}</Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
