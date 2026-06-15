import {
  checkOmokWin,
  cloneOmokBoard,
  OMOK_BOARD_SIZE,
  type OmokBoard,
  type OmokPoint,
  type Stone,
} from "./omok-logic";
import { isRenjuForbidden } from "./renju-logic";

export type OmokAiDifficulty = "easy" | "normal" | "hard";

export const OMOK_CPU_USER_ID = "__omok_cpu__";
export const OMOK_CPU_USERNAME = "CPU";

const CENTER = Math.floor(OMOK_BOARD_SIZE / 2);

type ScoredMove = { x: number; y: number; score: number };

function stoneForTurn(turn: "black" | "white"): 1 | 2 {
  return turn === "black" ? 1 : 2;
}

function opponentStone(stone: 1 | 2): 1 | 2 {
  return stone === 1 ? 2 : 1;
}

function isLegalMove(
  board: OmokBoard,
  x: number,
  y: number,
  turn: "black" | "white",
  ruleMode: "free" | "renju"
): boolean {
  if (board[y]![x] !== 0) return false;
  if (ruleMode === "renju" && turn === "black" && isRenjuForbidden(board, x, y)) return false;
  return true;
}

function hasNeighbor(board: OmokBoard, x: number, y: number, radius = 2): boolean {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= OMOK_BOARD_SIZE || ny < 0 || ny >= OMOK_BOARD_SIZE) continue;
      if (board[ny]![nx] !== 0) return true;
    }
  }
  return false;
}

export function getOmokCandidateMoves(board: OmokBoard): OmokPoint[] {
  const occupied = board.some((row) => row.some((c) => c !== 0));
  if (!occupied) return [{ x: CENTER, y: CENTER }];

  const moves: OmokPoint[] = [];
  for (let y = 0; y < OMOK_BOARD_SIZE; y++) {
    for (let x = 0; x < OMOK_BOARD_SIZE; x++) {
      if (board[y]![x] !== 0) continue;
      if (hasNeighbor(board, x, y)) moves.push({ x, y });
    }
  }
  return moves.length ? moves : [{ x: CENTER, y: CENTER }];
}

function linePatternScore(count: number, openEnds: number): number {
  if (count >= 5) return 1_000_000;
  if (count === 4) return openEnds === 2 ? 80_000 : 8_000;
  if (count === 3) return openEnds === 2 ? 3_000 : 300;
  if (count === 2) return openEnds === 2 ? 80 : 12;
  return openEnds === 2 ? 4 : 1;
}

function analyzeDirection(
  board: OmokBoard,
  x: number,
  y: number,
  dx: number,
  dy: number,
  stone: 1 | 2
): number {
  let count = 1;
  let openEnds = 0;

  for (let i = 1; i < 5; i++) {
    const nx = x + dx * i;
    const ny = y + dy * i;
    if (nx < 0 || nx >= OMOK_BOARD_SIZE || ny < 0 || ny >= OMOK_BOARD_SIZE) break;
    if (board[ny]![nx] === stone) count++;
    else {
      if (board[ny]![nx] === 0) openEnds++;
      break;
    }
  }
  for (let i = 1; i < 5; i++) {
    const nx = x - dx * i;
    const ny = y - dy * i;
    if (nx < 0 || nx >= OMOK_BOARD_SIZE || ny < 0 || ny >= OMOK_BOARD_SIZE) break;
    if (board[ny]![nx] === stone) count++;
    else {
      if (board[ny]![nx] === 0) openEnds++;
      break;
    }
  }

  return linePatternScore(count, openEnds);
}

function evaluateMove(board: OmokBoard, x: number, y: number, stone: 1 | 2): number {
  const trial = cloneOmokBoard(board);
  trial[y]![x] = stone;
  if (checkOmokWin(trial, x, y, stone)) return 2_000_000;

  let score = 0;
  const dirs: [number, number][] = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  for (const [dx, dy] of dirs) {
    score += analyzeDirection(trial, x, y, dx, dy, stone);
  }

  const dist = Math.abs(x - CENTER) + Math.abs(y - CENTER);
  score += Math.max(0, 12 - dist);
  return score;
}

function scoreMoves(
  board: OmokBoard,
  turn: "black" | "white",
  ruleMode: "free" | "renju"
): ScoredMove[] {
  const stone = stoneForTurn(turn);
  const opp = opponentStone(stone);
  const scored: ScoredMove[] = [];

  for (const { x, y } of getOmokCandidateMoves(board)) {
    if (!isLegalMove(board, x, y, turn, ruleMode)) continue;
    const attack = evaluateMove(board, x, y, stone);
    const defense = evaluateMove(board, x, y, opp);
    scored.push({ x, y, score: attack + defense * 0.92 });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function findImmediateWins(
  board: OmokBoard,
  turn: "black" | "white",
  ruleMode: "free" | "renju"
): OmokPoint[] {
  const stone = stoneForTurn(turn);
  const wins: OmokPoint[] = [];
  for (const { x, y } of getOmokCandidateMoves(board)) {
    if (!isLegalMove(board, x, y, turn, ruleMode)) continue;
    const trial = cloneOmokBoard(board);
    trial[y]![x] = stone;
    if (checkOmokWin(trial, x, y, stone)) wins.push({ x, y });
  }
  return wins;
}

function pickFromTop(scored: ScoredMove[], count: number, rng: () => number): OmokPoint {
  const slice = scored.slice(0, Math.max(1, Math.min(count, scored.length)));
  return slice[Math.floor(rng() * slice.length)]!;
}

function minimax(
  board: OmokBoard,
  turn: "black" | "white",
  ruleMode: "free" | "renju",
  depth: number,
  alpha: number,
  beta: number,
  maximizingStone: 1 | 2,
  aiStone: 1 | 2
): number {
  const wins = findImmediateWins(board, turn, ruleMode);
  if (wins.length) {
    const stone = stoneForTurn(turn);
    return stone === aiStone ? 900_000 - depth : -900_000 + depth;
  }

  if (depth === 0) {
    const scored = scoreMoves(board, turn, ruleMode);
    if (!scored.length) return 0;
    let evalScore = 0;
    for (const move of scored.slice(0, 6)) {
      const s = stoneForTurn(turn);
      evalScore += evaluateMove(board, move.x, move.y, aiStone);
      evalScore -= evaluateMove(board, move.x, move.y, opponentStone(aiStone)) * 0.9;
    }
    return evalScore;
  }

  const moves = scoreMoves(board, turn, ruleMode).slice(0, 8);
  if (!moves.length) return 0;

  const stone = stoneForTurn(turn);
  const isMax = stone === maximizingStone;

  if (isMax) {
    let best = -Infinity;
    for (const move of moves) {
      const next = cloneOmokBoard(board);
      next[move.y]![move.x] = stone;
      const nextTurn = turn === "black" ? "white" : "black";
      const val = minimax(next, nextTurn, ruleMode, depth - 1, alpha, beta, maximizingStone, aiStone);
      best = Math.max(best, val);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const move of moves) {
    const next = cloneOmokBoard(board);
    next[move.y]![move.x] = stone;
    const nextTurn = turn === "black" ? "white" : "black";
    const val = minimax(next, nextTurn, ruleMode, depth - 1, alpha, beta, maximizingStone, aiStone);
    best = Math.min(best, val);
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

function pickHardMove(
  board: OmokBoard,
  turn: "black" | "white",
  ruleMode: "free" | "renju"
): OmokPoint | null {
  const myWins = findImmediateWins(board, turn, ruleMode);
  if (myWins.length) return myWins[0]!;

  const oppTurn = turn === "black" ? "white" : "black";
  const oppWins = findImmediateWins(board, oppTurn, ruleMode);
  if (oppWins.length) return oppWins[0]!;

  const aiStone = stoneForTurn(turn);
  const candidates = scoreMoves(board, turn, ruleMode).slice(0, 10);
  if (!candidates.length) return null;

  let bestMove = candidates[0]!;
  let bestScore = -Infinity;
  for (const move of candidates) {
    const next = cloneOmokBoard(board);
    next[move.y]![move.x] = aiStone;
    const nextTurn = turn === "black" ? "white" : "black";
    const score = minimax(next, nextTurn, ruleMode, 3, -Infinity, Infinity, aiStone, aiStone);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}

function pickNormalMove(
  board: OmokBoard,
  turn: "black" | "white",
  ruleMode: "free" | "renju",
  rng: () => number
): OmokPoint | null {
  const myWins = findImmediateWins(board, turn, ruleMode);
  if (myWins.length) return myWins[0]!;

  const oppTurn = turn === "black" ? "white" : "black";
  const oppWins = findImmediateWins(board, oppTurn, ruleMode);
  if (oppWins.length) return oppWins[0]!;

  const scored = scoreMoves(board, turn, ruleMode);
  if (!scored.length) return null;
  return rng() < 0.12 ? pickFromTop(scored, 3, rng) : scored[0]!;
}

function pickEasyMove(
  board: OmokBoard,
  turn: "black" | "white",
  ruleMode: "free" | "renju",
  rng: () => number
): OmokPoint | null {
  const myWins = findImmediateWins(board, turn, ruleMode);
  if (myWins.length && rng() < 0.82) return myWins[0]!;

  const oppTurn = turn === "black" ? "white" : "black";
  const oppWins = findImmediateWins(board, oppTurn, ruleMode);
  if (oppWins.length && rng() < 0.58) return oppWins[0]!;

  const scored = scoreMoves(board, turn, ruleMode);
  if (!scored.length) return null;

  const roll = rng();
  if (roll < 0.28) {
    const legal = getOmokCandidateMoves(board).filter((m) => isLegalMove(board, m.x, m.y, turn, ruleMode));
    if (legal.length) return legal[Math.floor(rng() * legal.length)]!;
  }
  if (roll < 0.72) return pickFromTop(scored, 5, rng);
  return scored[0]!;
}

export function pickOmokAiMove(
  board: OmokBoard,
  turn: "black" | "white",
  ruleMode: "free" | "renju",
  difficulty: OmokAiDifficulty,
  rng: () => number = Math.random
): OmokPoint | null {
  switch (difficulty) {
    case "easy":
      return pickEasyMove(board, turn, ruleMode, rng);
    case "normal":
      return pickNormalMove(board, turn, ruleMode, rng);
    case "hard":
      return pickHardMove(board, turn, ruleMode);
    default:
      return pickNormalMove(board, turn, ruleMode, rng);
  }
}
