/** 리버시(오셀로) 8×8 — 8방향 뒤집기 엔진 */

export const REVERSI_SIZE = 8;
export const REVERSI_TURN_MS = 30_000;

export type ReversiCell = 0 | 1 | 2; // empty, black, white
export type ReversiBoard = ReversiCell[][];

const DIRS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

export function oppositeReversiPlayer(player: 1 | 2): 1 | 2 {
  return player === 1 ? 2 : 1;
}

export function createInitialReversiBoard(): ReversiBoard {
  const b: ReversiBoard = Array.from({ length: REVERSI_SIZE }, () =>
    Array.from({ length: REVERSI_SIZE }, () => 0 as ReversiCell)
  );
  b[3]![3] = 2;
  b[3]![4] = 1;
  b[4]![3] = 1;
  b[4]![4] = 2;
  return b;
}

function inBounds(x: number, y: number) {
  return x >= 0 && x < REVERSI_SIZE && y >= 0 && y < REVERSI_SIZE;
}

/** 8방향 탐색 — 해당 칸에 두었을 때 뒤집히는 좌표 목록 */
export function flipsForMove(board: ReversiBoard, x: number, y: number, player: 1 | 2): [number, number][] {
  if (board[y]?.[x] !== 0) return [];
  const opp = oppositeReversiPlayer(player);
  const all: [number, number][] = [];
  for (const [dx, dy] of DIRS) {
    const line: [number, number][] = [];
    let cx = x + dx;
    let cy = y + dy;
    while (inBounds(cx, cy) && board[cy]![cx] === opp) {
      line.push([cx, cy]);
      cx += dx;
      cy += dy;
    }
    if (line.length && inBounds(cx, cy) && board[cy]![cx] === player) {
      all.push(...line);
    }
  }
  return all;
}

export function isLegalReversiMove(board: ReversiBoard, x: number, y: number, player: 1 | 2): boolean {
  return flipsForMove(board, x, y, player).length > 0;
}

export function getValidReversiMoves(board: ReversiBoard, player: 1 | 2): [number, number][] {
  const moves: [number, number][] = [];
  for (let y = 0; y < REVERSI_SIZE; y++) {
    for (let x = 0; x < REVERSI_SIZE; x++) {
      if (isLegalReversiMove(board, x, y, player)) moves.push([x, y]);
    }
  }
  return moves;
}

export function applyReversiMove(board: ReversiBoard, x: number, y: number, player: 1 | 2): ReversiBoard {
  const next = board.map((row) => [...row] as ReversiCell[]);
  const flips = flipsForMove(next, x, y, player);
  next[y]![x] = player;
  for (const [fx, fy] of flips) next[fy]![fx] = player;
  return next;
}

export function tryReversiMove(
  board: ReversiBoard,
  x: number,
  y: number,
  player: 1 | 2
): { ok: true; board: ReversiBoard; flipped: number } | { ok: false; reason: string } {
  if (!inBounds(x, y)) return { ok: false, reason: "범위를 벗어났습니다." };
  const flips = flipsForMove(board, x, y, player);
  if (!flips.length) return { ok: false, reason: "뒤집을 돌이 없습니다." };
  return { ok: true, board: applyReversiMove(board, x, y, player), flipped: flips.length };
}

export function countReversiDiscs(board: ReversiBoard): { black: number; white: number } {
  let black = 0;
  let white = 0;
  for (const row of board) {
    for (const c of row) {
      if (c === 1) black++;
      if (c === 2) white++;
    }
  }
  return { black, white };
}

export function isReversiBoardFull(board: ReversiBoard): boolean {
  for (let y = 0; y < REVERSI_SIZE; y++) {
    for (let x = 0; x < REVERSI_SIZE; x++) {
      if (board[y]![x] === 0) return false;
    }
  }
  return true;
}

export function reversiGameOver(board: ReversiBoard): boolean {
  if (isReversiBoardFull(board)) return true;
  return getValidReversiMoves(board, 1).length === 0 && getValidReversiMoves(board, 2).length === 0;
}

export function scoreReversiGame(board: ReversiBoard): {
  black: number;
  white: number;
  winner: 1 | 2 | 0;
} {
  const { black, white } = countReversiDiscs(board);
  const winner = black > white ? 1 : white > black ? 2 : 0;
  return { black, white, winner };
}

export function formatReversiResult(
  black: number,
  white: number,
  blackUserId: string,
  whiteUserId: string
): { winnerId: string; resultMessage: string } {
  if (black === white) {
    return { winnerId: "", resultMessage: `무승부 (${black}:${white})` };
  }
  const winnerId = black > white ? blackUserId : whiteUserId;
  const side = black > white ? "흑" : "백";
  return { winnerId, resultMessage: `${side} 승 (${black}:${white})` };
}

export function boardToReversiNumbers(board: ReversiBoard): number[][] {
  return board.map((r) => [...r]);
}

export function validMovesSet(board: ReversiBoard, player: 1 | 2): Set<string> {
  return new Set(getValidReversiMoves(board, player).map(([x, y]) => `${x},${y}`));
}
