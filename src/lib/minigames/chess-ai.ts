import { Chess, type Move } from "chess.js";
import type { MinigameAiDifficulty } from "./minigame-cpu";

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20_000,
};

function evaluateFen(fen: string, forWhite: boolean): number {
  const chess = new Chess(fen);
  let score = 0;
  const board = chess.board();
  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      const v = PIECE_VALUES[cell.type] ?? 0;
      score += cell.color === "w" ? v : -v;
    }
  }
  if (chess.inCheck()) score += chess.turn() === "w" ? -30 : 30;
  return forWhite ? score : -score;
}

function orderMoves(chess: Chess, moves: Move[]): Move[] {
  return [...moves].sort((a, b) => {
    const capA = a.captured ? (PIECE_VALUES[a.captured] ?? 0) : 0;
    const capB = b.captured ? (PIECE_VALUES[b.captured] ?? 0) : 0;
    return capB - capA;
  });
}

function pickEasy(chess: Chess, rng: () => number): Move | null {
  const moves = chess.moves({ verbose: true }) as Move[];
  if (!moves.length) return null;
  if (rng() < 0.3) return moves[Math.floor(rng() * moves.length)]!;
  const captures = moves.filter((m) => m.captured);
  if (captures.length && rng() < 0.55) return captures[Math.floor(rng() * captures.length)]!;
  return moves[Math.floor(rng() * moves.length)]!;
}

function pickNormal(chess: Chess, rng: () => number): Move | null {
  const moves = orderMoves(chess, chess.moves({ verbose: true }) as Move[]);
  if (!moves.length) return null;
  const forWhite = chess.turn() === "w";
  let best = moves[0]!;
  let bestScore = -Infinity;
  for (const m of moves.slice(0, 16)) {
    const next = new Chess(chess.fen());
    next.move(m);
    const score = evaluateFen(next.fen(), forWhite);
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  if (rng() < 0.12 && moves.length > 1) return moves[Math.floor(rng() * Math.min(3, moves.length))]!;
  return best;
}

function minimax(chess: Chess, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (depth === 0 || chess.isGameOver()) return evaluateFen(chess.fen(), maximizing);

  const moves = orderMoves(chess, chess.moves({ verbose: true }) as Move[]);
  if (chess.turn() === (maximizing ? "w" : "b")) {
    let best = -Infinity;
    for (const m of moves.slice(0, 24)) {
      const next = new Chess(chess.fen());
      next.move(m);
      const val = minimax(next, depth - 1, alpha, beta, maximizing);
      best = Math.max(best, val);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const m of moves.slice(0, 24)) {
    const next = new Chess(chess.fen());
    next.move(m);
    const val = minimax(next, depth - 1, alpha, beta, maximizing);
    best = Math.min(best, val);
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

function pickHard(chess: Chess): Move | null {
  const moves = orderMoves(chess, chess.moves({ verbose: true }) as Move[]);
  if (!moves.length) return null;
  const forWhite = chess.turn() === "w";
  let best = moves[0]!;
  let bestScore = -Infinity;
  for (const m of moves.slice(0, 20)) {
    const next = new Chess(chess.fen());
    next.move(m);
    const score = minimax(next, 3, -Infinity, Infinity, forWhite);
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

export type ChessAiMove = { from: string; to: string; promotion?: "q" | "r" | "b" | "n" };

export function pickChessAiMove(
  fen: string,
  difficulty: MinigameAiDifficulty,
  rng: () => number = Math.random
): ChessAiMove | null {
  const chess = new Chess(fen);
  let move: Move | null;
  switch (difficulty) {
    case "easy":
      move = pickEasy(chess, rng);
      break;
    case "normal":
      move = pickNormal(chess, rng);
      break;
    case "hard":
      move = pickHard(chess);
      break;
    default:
      move = pickNormal(chess, rng);
  }
  if (!move) return null;
  return {
    from: move.from,
    to: move.to,
    promotion: move.promotion as ChessAiMove["promotion"],
  };
}
