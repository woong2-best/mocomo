"use client";

import { useState } from "react";
import { Chess } from "chess.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OmokBoard } from "@/components/omok/omok-board";
import { AlkkagiBoard } from "@/components/minigames/alkkagi-board";
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
        <BoardView
          board={g.board as number[][]}
          lastMove={g.lastMove as { x: number; y: number } | null}
          turnUserId={g.turnUserId as string | null}
          userId={userId}
          isSpectator={isSpectator}
          onCell={(x, y) => onMove({ x, y })}
          label={`${g.turn === "black" ? "흑" : "백"} 턴`}
        />
      );
    case "reversi":
      return (
        <BoardView
          board={g.board as number[][]}
          turnUserId={g.turnUserId as string | null}
          userId={userId}
          isSpectator={isSpectator}
          onCell={(x, y) => onMove({ x, y })}
          label={`점수 흑${(g.scores as { black: number }).black} : 백${(g.scores as { white: number }).white}`}
          extra={
            userId === g.turnUserId && !isSpectator ? (
              <Button variant="outline" size="sm" className="rounded-lg" onClick={() => onMove({ pass: true })}>
                패스
              </Button>
            ) : null
          }
        />
      );
    case "chess":
      return <ChessView g={g} userId={userId} isSpectator={isSpectator} onMove={onMove} />;
    case "janggi":
      return (
        <JanggiView g={g} userId={userId} isSpectator={isSpectator} onMove={onMove} />
      );
    case "baduk":
      return (
        <BadukView g={g} userId={userId} isSpectator={isSpectator} onMove={onMove} />
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
      return <WordChainView g={g} userId={userId} isSpectator={isSpectator} onMove={onMove} />;
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
      return <SpotDiffView g={g} userId={userId} isSpectator={isSpectator} onMove={onMove} />;
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
        <OmokBoard board={board} lastMove={lastMove} disabled={!myTurn} onCellClick={onCell} turnUserId={turnUserId} />
      </CardContent>
    </Card>
  );
}

function ChessView({ g, userId, isSpectator, onMove }: { g: Record<string, unknown>; userId?: string; isSpectator: boolean; onMove: Props["onMove"] }) {
  const [sel, setSel] = useState<string | null>(null);
  const fen = g.fen as string;
  const chess = new Chess(fen);
  const board = chess.board();
  const myTurn = g.turnUserId === userId && !isSpectator;

  return (
    <Card className="border-2 border-folk-cobalt/20">
      <CardContent className="p-4 space-y-3">
        <p className="text-sm text-center font-semibold">
          {g.isCheck ? "체크! · " : ""}
          {myTurn ? "내 턴" : "상대 턴"}
        </p>
        <div className="grid grid-cols-8 gap-0 mx-auto w-fit border">
          {board.flatMap((row, yi) =>
            row.map((cell, xi) => {
              const sq = `${"abcdefgh"[xi]}${8 - yi}`;
              const light = (xi + yi) % 2 === 0;
              return (
                <button
                  key={sq}
                  type="button"
                  disabled={!myTurn}
                  onClick={() => {
                    if (!sel) {
                      if (cell) setSel(sq);
                      return;
                    }
                    void onMove({ from: sel, to: sq }).then((ok) => ok && setSel(null));
                    setSel(null);
                  }}
                  className={cn(
                    "w-9 h-9 text-lg flex items-center justify-center",
                    light ? "bg-amber-100" : "bg-amber-700/40",
                    sel === sq && "ring-2 ring-folk-terracotta"
                  )}
                >
                  {cell ? pieceChar(cell.type, cell.color) : ""}
                </button>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function pieceChar(type: string, color: string) {
  const map: Record<string, string> = { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" };
  const c = map[type] ?? type;
  return color === "w" ? c : c;
}

function JanggiView({ g, userId, isSpectator, onMove }: { g: Record<string, unknown>; userId?: string; isSpectator: boolean; onMove: Props["onMove"] }) {
  const board = g.board as (string | null)[][];
  const [from, setFrom] = useState<{ x: number; y: number } | null>(null);
  const myTurn = g.turnUserId === userId && !isSpectator;
  return (
    <Card className="border-2 border-folk-cobalt/20 overflow-x-auto">
      <CardContent className="p-4">
        <div className="inline-grid gap-0" style={{ gridTemplateColumns: `repeat(${board[0]?.length ?? 9}, 1fr)` }}>
          {board.map((row, y) =>
            row.map((cell, x) => (
              <button
                key={`${x}-${y}`}
                type="button"
                disabled={!myTurn}
                onClick={() => {
                  if (!from) {
                    if (cell) setFrom({ x, y });
                    return;
                  }
                  void onMove({ fromX: from.x, fromY: from.y, toX: x, toY: y });
                  setFrom(null);
                }}
                className={cn("w-8 h-8 text-[10px] border", from?.x === x && from?.y === y && "ring-2 ring-folk-terracotta")}
              >
                {cell ? String(cell).slice(1) : ""}
              </button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BadukView({ g, userId, isSpectator, onMove }: { g: Record<string, unknown>; userId?: string; isSpectator: boolean; onMove: Props["onMove"] }) {
  const board = g.board as number[][];
  const myTurn = g.turnUserId === userId && !isSpectator;
  return (
    <Card className="border-2 border-folk-cobalt/20 overflow-x-auto">
      <CardContent className="p-4 flex flex-col items-center gap-3">
        <div className="inline-grid gap-0" style={{ gridTemplateColumns: `repeat(${board[0]?.length ?? 9}, 1fr)` }}>
          {board.map((row, y) =>
            row.map((cell, x) => (
              <button
                key={`${x}-${y}`}
                type="button"
                disabled={!myTurn || cell !== 0}
                onClick={() => onMove({ x, y })}
                className="w-8 h-8 border border-amber-900/20 flex items-center justify-center"
              >
                {cell === 1 ? <span className="w-5 h-5 rounded-full bg-neutral-900" /> : cell === 2 ? <span className="w-5 h-5 rounded-full bg-white border" /> : null}
              </button>
            ))
          )}
        </div>
        {myTurn && (
          <Button variant="outline" size="sm" className="rounded-lg" onClick={() => onMove({ pass: true })}>
            패스
          </Button>
        )}
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

function WordChainView({ g, userId, isSpectator, onMove }: { g: Record<string, unknown>; userId?: string; isSpectator: boolean; onMove: Props["onMove"] }) {
  const [word, setWord] = useState("");
  const myTurn = g.turnUserId === userId && !isSpectator;
  return (
    <Card className="border-2 border-folk-cobalt/20">
      <CardContent className="p-6 space-y-3 text-center">
        <p className="text-2xl font-bold">{(g.currentWord as string) ?? "시작"}</p>
        <p className="text-sm text-folk-terracotta">{g.timeLeft as number}초</p>
        {myTurn && (
          <form onSubmit={(e) => { e.preventDefault(); void onMove(word).then(() => setWord("")); }} className="flex gap-2">
            <Input value={word} onChange={(e) => setWord(e.target.value)} />
            <Button type="submit">제출</Button>
          </form>
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

function SpotDiffView({ g, userId, isSpectator, onMove }: { g: Record<string, unknown>; userId?: string; isSpectator: boolean; onMove: Props["onMove"] }) {
  const right = g.right as number[][];
  const found = new Set((g.found as { x: number; y: number }[]).map((f) => `${f.x},${f.y}`));
  const myTurn = g.turnUserId === userId && !isSpectator;
  return (
    <Card className="border-2 border-folk-cobalt/20">
      <CardContent className="p-4 space-y-2 text-center">
        <p className="text-sm">{g.timeLeft as number}초 · {found.size}/{g.totalDiffs as number}</p>
        <div className="inline-grid gap-0" style={{ gridTemplateColumns: `repeat(${right[0]?.length ?? 8}, 28px)` }}>
          {right.map((row, y) =>
            row.map((cell, x) => (
              <button
                key={`${x}-${y}`}
                type="button"
                disabled={!myTurn || found.has(`${x},${y}`)}
                onClick={() => onMove({ x, y })}
                className={cn("w-7 h-7 border text-[10px]", found.has(`${x},${y}`) && "ring-2 ring-emerald-500")}
                style={{ background: `hsl(${cell * 50}, 60%, 55%)` }}
              />
            ))
          )}
        </div>
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
