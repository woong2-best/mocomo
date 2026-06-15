import type { MinigameAiDifficulty } from "./minigame-cpu";
import {
  applyReversiMove,
  countReversiDiscs,
  flipsForMove,
  getValidReversiMoves,
  oppositeReversiPlayer,
  REVERSI_SIZE,
  type ReversiBoard,
} from "./reversi-logic";

const CORNERS: [number, number][] = [
  [0, 0],
  [7, 0],
  [0, 7],
  [7, 7],
];

function evaluateBoard(board: ReversiBoard, player: 1 | 2): number {
  const { black, white } = countReversiDiscs(board);
  const mine = player === 1 ? black : white;
  const theirs = player === 1 ? white : black;
  let score = (mine - theirs) * 10;

  const myMoves = getValidReversiMoves(board, player).length;
  const oppMoves = getValidReversiMoves(board, oppositeReversiPlayer(player)).length;
  score += myMoves * 8;
  score -= oppMoves * 6;

  for (const [x, y] of CORNERS) {
    const c = board[y]![x]!;
    if (c === player) score += 120;
    else if (c === oppositeReversiPlayer(player)) score -= 100;
  }

  return score;
}

function pickEasy(board: ReversiBoard, player: 1 | 2, rng: () => number): [number, number] | "pass" {
  const moves = getValidReversiMoves(board, player);
  if (!moves.length) return "pass";
  if (rng() < 0.35) return moves[Math.floor(rng() * moves.length)]!;

  const scored = moves.map(([x, y]) => ({
    x,
    y,
    flips: flipsForMove(board, x, y, player).length,
  }));
  scored.sort((a, b) => b.flips - a.flips);
  const top = scored.slice(0, Math.min(4, scored.length));
  return [top[Math.floor(rng() * top.length)]!.x, top[Math.floor(rng() * top.length)]!.y];
}

function pickNormal(board: ReversiBoard, player: 1 | 2, rng: () => number): [number, number] | "pass" {
  const moves = getValidReversiMoves(board, player);
  if (!moves.length) return "pass";

  let best: [number, number] = moves[0]!;
  let bestScore = -Infinity;
  for (const [x, y] of moves) {
    const next = applyReversiMove(board, x, y, player);
    let score = evaluateBoard(next, player);
    score += flipsForMove(board, x, y, player).length * 3;
    if (CORNERS.some(([cx, cy]) => cx === x && cy === y)) score += 80;
    if (score > bestScore) {
      bestScore = score;
      best = [x, y];
    }
  }
  if (rng() < 0.1 && moves.length > 1) {
    return moves[Math.floor(rng() * Math.min(3, moves.length))]!;
  }
  return best;
}

function minimax(
  board: ReversiBoard,
  player: 1 | 2,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: 1 | 2
): number {
  if (depth === 0) return evaluateBoard(board, maximizing);

  const moves = getValidReversiMoves(board, player);
  if (!moves.length) {
    const oppMoves = getValidReversiMoves(board, oppositeReversiPlayer(player));
    if (!oppMoves.length) return evaluateBoard(board, maximizing);
    return minimax(board, oppositeReversiPlayer(player), depth - 1, alpha, beta, maximizing);
  }

  if (player === maximizing) {
    let best = -Infinity;
    for (const [x, y] of moves.slice(0, 12)) {
      const next = applyReversiMove(board, x, y, player);
      const val = minimax(next, oppositeReversiPlayer(player), depth - 1, alpha, beta, maximizing);
      best = Math.max(best, val);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const [x, y] of moves.slice(0, 12)) {
    const next = applyReversiMove(board, x, y, player);
    const val = minimax(next, oppositeReversiPlayer(player), depth - 1, alpha, beta, maximizing);
    best = Math.min(best, val);
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

function pickHard(board: ReversiBoard, player: 1 | 2): [number, number] | "pass" {
  const moves = getValidReversiMoves(board, player);
  if (!moves.length) return "pass";

  let best: [number, number] = moves[0]!;
  let bestScore = -Infinity;
  for (const [x, y] of moves) {
    const next = applyReversiMove(board, x, y, player);
    const score = minimax(next, oppositeReversiPlayer(player), 4, -Infinity, Infinity, player);
    if (score > bestScore) {
      bestScore = score;
      best = [x, y];
    }
  }
  return best;
}

export function pickReversiAiMove(
  board: ReversiBoard,
  player: 1 | 2,
  difficulty: MinigameAiDifficulty,
  rng: () => number = Math.random
): { x: number; y: number } | { pass: true } {
  let pick: [number, number] | "pass";
  switch (difficulty) {
    case "easy":
      pick = pickEasy(board, player, rng);
      break;
    case "normal":
      pick = pickNormal(board, player, rng);
      break;
    case "hard":
      pick = pickHard(board, player);
      break;
    default:
      pick = pickNormal(board, player, rng);
  }
  if (pick === "pass") return { pass: true };
  return { x: pick[0], y: pick[1] };
}
