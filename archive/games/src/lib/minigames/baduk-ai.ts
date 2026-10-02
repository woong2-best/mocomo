import {
  boardSize,
  isLegalBadukMove,
  tryBadukPlay,
  type BadukBoard,
  type BadukPoint,
} from "./baduk-logic";
import type { MinigameAiDifficulty } from "./minigame-cpu";

function hasNeighbor(board: BadukBoard, x: number, y: number, radius = 2): boolean {
  const s = boardSize(board);
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= s || ny < 0 || ny >= s) continue;
      if (board[ny]![nx] !== 0) return true;
    }
  }
  return false;
}

export function getBadukCandidatePoints(board: BadukBoard): BadukPoint[] {
  const s = boardSize(board);
  const empty = board.every((row) => row.every((c) => c === 0));
  if (empty) return [{ x: Math.floor(s / 2), y: Math.floor(s / 2) }];

  const pts: BadukPoint[] = [];
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      if (board[y]![x] !== 0) continue;
      if (hasNeighbor(board, x, y)) pts.push({ x, y });
    }
  }
  return pts.length ? pts : [{ x: Math.floor(s / 2), y: Math.floor(s / 2) }];
}

function evaluateMove(
  board: BadukBoard,
  x: number,
  y: number,
  turn: 1 | 2,
  koPoint: BadukPoint | null
): number {
  const result = tryBadukPlay(board, x, y, turn, koPoint);
  if (!result.ok || !result.board) return -9999;
  let score = (result.captured ?? 0) * 120;
  const s = boardSize(board);
  const cx = Math.floor(s / 2);
  const cy = Math.floor(s / 2);
  score -= Math.abs(x - cx) + Math.abs(y - cy);
  return score;
}

function pickEasy(
  board: BadukBoard,
  turn: 1 | 2,
  koPoint: BadukPoint | null,
  rng: () => number
): BadukPoint | { pass: true } {
  const legal = getBadukCandidatePoints(board).filter((p) =>
    isLegalBadukMove(board, p, turn, koPoint)
  );
  if (!legal.length) return { pass: true };
  if (rng() < 0.22) return { pass: true };
  return legal[Math.floor(rng() * legal.length)]!;
}

function pickNormal(
  board: BadukBoard,
  turn: 1 | 2,
  koPoint: BadukPoint | null,
  rng: () => number
): BadukPoint | { pass: true } {
  const legal = getBadukCandidatePoints(board).filter((p) =>
    isLegalBadukMove(board, p, turn, koPoint)
  );
  if (!legal.length) return { pass: true };

  let best = legal[0]!;
  let bestScore = -Infinity;
  for (const p of legal) {
    const s = evaluateMove(board, p.x, p.y, turn, koPoint);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  if (rng() < 0.08 && legal.length > 1) return legal[Math.floor(rng() * Math.min(3, legal.length))]!;
  return best;
}

function pickHard(
  board: BadukBoard,
  turn: 1 | 2,
  koPoint: BadukPoint | null
): BadukPoint | { pass: true } {
  const legal = getBadukCandidatePoints(board).filter((p) =>
    isLegalBadukMove(board, p, turn, koPoint)
  );
  if (!legal.length) return { pass: true };

  let best = legal[0]!;
  let bestScore = -Infinity;
  for (const p of legal.slice(0, 40)) {
    const result = tryBadukPlay(board, p.x, p.y, turn, koPoint);
    if (!result.ok || !result.board) continue;
    let score = (result.captured ?? 0) * 150;
    const opp = turn === 1 ? 2 : 1;
    const replies = getBadukCandidatePoints(result.board)
      .filter((r) => isLegalBadukMove(result.board!, r, opp, result.koPoint ?? null))
      .slice(0, 6);
    if (replies.length) {
      let worst = Infinity;
      for (const r of replies) {
        const rr = tryBadukPlay(result.board!, r.x, r.y, opp, result.koPoint ?? null);
        if (!rr.ok) continue;
        worst = Math.min(worst, (rr.captured ?? 0) * 100);
      }
      score -= worst;
    }
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

export function pickBadukAiMove(
  board: BadukBoard,
  turn: 1 | 2,
  koPoint: BadukPoint | null,
  difficulty: MinigameAiDifficulty,
  rng: () => number = Math.random
): BadukPoint | { pass: true } {
  switch (difficulty) {
    case "easy":
      return pickEasy(board, turn, koPoint, rng);
    case "normal":
      return pickNormal(board, turn, koPoint, rng);
    case "hard":
      return pickHard(board, turn, koPoint);
    default:
      return pickNormal(board, turn, koPoint, rng);
  }
}
