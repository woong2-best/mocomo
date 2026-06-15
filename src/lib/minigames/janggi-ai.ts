import {
  allLegalMoves,
  applyJanggiMove,
  isRedPiece,
  type JanggiBoard,
  type JanggiMove,
} from "./janggi-logic";
import type { MinigameAiDifficulty } from "./minigame-cpu";

function pieceValue(piece: string | null | undefined): number {
  if (!piece) return 0;
  const kind = piece.slice(1);
  switch (kind) {
    case "K":
      return 50_000;
    case "R":
      return 900;
    case "H":
      return 700;
    case "E":
      return 650;
    case "C":
      return 550;
    case "P":
      return 120;
    default:
      return 200;
  }
}

function evaluateBoard(board: JanggiBoard, turnRed: boolean): number {
  let score = 0;
  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      const v = pieceValue(cell);
      score += isRedPiece(cell) === turnRed ? v : -v;
    }
  }
  return score;
}

function pickEasy(board: JanggiBoard, turnRed: boolean, rng: () => number): JanggiMove | null {
  const moves = allLegalMoves(board, turnRed);
  if (!moves.length) return null;
  if (rng() < 0.35) return moves[Math.floor(rng() * moves.length)]!;
  const captures = moves.filter((m) => board[m.toY]?.[m.toX]);
  if (captures.length && rng() < 0.5) return captures[Math.floor(rng() * captures.length)]!;
  return moves[Math.floor(rng() * moves.length)]!;
}

function scoreMove(board: JanggiBoard, turnRed: boolean, move: JanggiMove): number {
  const captured = board[move.toY]?.[move.toX];
  const next = applyJanggiMove(board, move);
  let score = evaluateBoard(next, turnRed);
  if (captured) score += pieceValue(captured) * 1.2;
  return score;
}

function pickNormal(board: JanggiBoard, turnRed: boolean, rng: () => number): JanggiMove | null {
  const moves = allLegalMoves(board, turnRed);
  if (!moves.length) return null;
  let best = moves[0]!;
  let bestScore = -Infinity;
  for (const m of moves) {
    const s = scoreMove(board, turnRed, m);
    if (s > bestScore) {
      bestScore = s;
      best = m;
    }
  }
  if (rng() < 0.15 && moves.length > 1) return moves[Math.floor(rng() * Math.min(3, moves.length))]!;
  return best;
}

function pickHard(board: JanggiBoard, turnRed: boolean): JanggiMove | null {
  const moves = allLegalMoves(board, turnRed);
  if (!moves.length) return null;
  let best = moves[0]!;
  let bestScore = -Infinity;
  for (const m of moves.slice(0, 24)) {
    const next = applyJanggiMove(board, m);
    let score = evaluateBoard(next, turnRed);
    const replies = allLegalMoves(next, !turnRed).slice(0, 8);
    if (replies.length) {
      let worstReply = Infinity;
      for (const r of replies) {
        const after = applyJanggiMove(next, r);
        worstReply = Math.min(worstReply, evaluateBoard(after, turnRed));
      }
      score = worstReply;
    }
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

export function pickJanggiAiMove(
  board: JanggiBoard,
  turnRed: boolean,
  difficulty: MinigameAiDifficulty,
  rng: () => number = Math.random
): JanggiMove | null {
  switch (difficulty) {
    case "easy":
      return pickEasy(board, turnRed, rng);
    case "normal":
      return pickNormal(board, turnRed, rng);
    case "hard":
      return pickHard(board, turnRed);
    default:
      return pickNormal(board, turnRed, rng);
  }
}
