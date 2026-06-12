/** 리버시(오셀로) 8×8 */

export const REVERSI_SIZE = 8;
export type ReversiCell = 0 | 1 | 2; // empty, black, white
export type ReversiBoard = ReversiCell[][];

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

const DIRS: [number, number][] = [
  [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1],
];

function inBounds(x: number, y: number) {
  return x >= 0 && x < REVERSI_SIZE && y >= 0 && y < REVERSI_SIZE;
}

function flipsForMove(board: ReversiBoard, x: number, y: number, player: 1 | 2): [number, number][] {
  if (board[y]![x] !== 0) return [];
  const opp = player === 1 ? 2 : 1;
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

export function getValidReversiMoves(board: ReversiBoard, player: 1 | 2): [number, number][] {
  const moves: [number, number][] = [];
  for (let y = 0; y < REVERSI_SIZE; y++) {
    for (let x = 0; x < REVERSI_SIZE; x++) {
      if (flipsForMove(board, x, y, player).length) moves.push([x, y]);
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

export function reversiGameOver(board: ReversiBoard): boolean {
  return getValidReversiMoves(board, 1).length === 0 && getValidReversiMoves(board, 2).length === 0;
}

export function boardToReversiNumbers(board: ReversiBoard): number[][] {
  return board.map((r) => [...r]);
}
