import type { OmokBoard, Stone } from "./omok-logic";
import { OMOK_BOARD_SIZE, checkOmokWin } from "./omok-logic";

/** 렌주 금수 MVP — 3-3, 4-4, 6목+ (흑만) */
export function isRenjuForbidden(board: OmokBoard, x: number, y: number): boolean {
  if (board[y]![x] !== 0) return true;
  const trial = board.map((row) => [...row] as Stone[]);
  trial[y]![x] = 1;
  if (checkOmokWin(trial, x, y, 1)) return false;
  if (countOpenThrees(trial, x, y) >= 2) return true;
  if (countFours(trial, x, y) >= 2) return true;
  if (hasOverline(trial, x, y)) return true;
  return false;
}

function hasOverline(board: OmokBoard, x: number, y: number): boolean {
  const dirs: [number, number][] = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (const [dx, dy] of dirs) {
    let c = 1;
    for (let i = 1; i < 6; i++) {
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (nx < 0 || nx >= OMOK_BOARD_SIZE || ny < 0 || ny >= OMOK_BOARD_SIZE || board[ny]![nx] !== 1) break;
      c++;
    }
    for (let i = 1; i < 6; i++) {
      const nx = x - dx * i;
      const ny = y - dy * i;
      if (nx < 0 || nx >= OMOK_BOARD_SIZE || ny < 0 || ny >= OMOK_BOARD_SIZE || board[ny]![nx] !== 1) break;
      c++;
    }
    if (c >= 6) return true;
  }
  return false;
}

function countOpenThrees(board: OmokBoard, x: number, y: number): number {
  return countPattern(board, x, y, 3, true);
}

function countFours(board: OmokBoard, x: number, y: number): number {
  return countPattern(board, x, y, 4, false);
}

function countPattern(board: OmokBoard, x: number, y: number, need: number, requireOpen: boolean): number {
  const dirs: [number, number][] = [[1, 0], [0, 1], [1, 1], [1, -1]];
  let total = 0;
  for (const [dx, dy] of dirs) {
    let count = 1;
    let openEnds = 0;
    for (let i = 1; i < need; i++) {
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (nx < 0 || nx >= OMOK_BOARD_SIZE || ny < 0 || ny >= OMOK_BOARD_SIZE) break;
      if (board[ny]![nx] === 1) count++;
      else if (board[ny]![nx] === 0) {
        openEnds++;
        break;
      } else break;
    }
    for (let i = 1; i < need; i++) {
      const nx = x - dx * i;
      const ny = y - dy * i;
      if (nx < 0 || nx >= OMOK_BOARD_SIZE || ny < 0 || ny >= OMOK_BOARD_SIZE) break;
      if (board[ny]![nx] === 1) count++;
      else if (board[ny]![nx] === 0) {
        openEnds++;
        break;
      } else break;
    }
    if (count === need && (!requireOpen || openEnds >= 1)) total++;
  }
  return total;
}
