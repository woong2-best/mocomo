export const OMOK_BOARD_SIZE = 15;
export const OMOK_TURN_MS = 20_000;

export type Stone = 0 | 1 | 2;

export type OmokBoard = Stone[][];

export function createEmptyOmokBoard(): OmokBoard {
  return Array.from({ length: OMOK_BOARD_SIZE }, () =>
    Array.from({ length: OMOK_BOARD_SIZE }, () => 0 as Stone)
  );
}

export function cloneOmokBoard(board: OmokBoard): OmokBoard {
  return board.map((row) => [...row] as Stone[]);
}

export function boardToNumbers(board: OmokBoard): number[][] {
  return board.map((row) => [...row]);
}

export function checkOmokWin(board: OmokBoard, x: number, y: number, stone: 1 | 2): boolean {
  return getOmokWinLine(board, x, y, stone) !== null;
}

export type OmokPoint = { x: number; y: number };

/** 승리 5목 좌표 (마지막 수 기준) */
export function getOmokWinLine(
  board: OmokBoard,
  x: number,
  y: number,
  stone: 1 | 2
): OmokPoint[] | null {
  const dirs: [number, number][] = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  for (const [dx, dy] of dirs) {
    const line: OmokPoint[] = [{ x, y }];
    for (let i = 1; i < 5; i++) {
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (
        nx < 0 ||
        nx >= OMOK_BOARD_SIZE ||
        ny < 0 ||
        ny >= OMOK_BOARD_SIZE ||
        board[ny]![nx] !== stone
      )
        break;
      line.push({ x: nx, y: ny });
    }
    for (let i = 1; i < 5; i++) {
      const nx = x - dx * i;
      const ny = y - dy * i;
      if (
        nx < 0 ||
        nx >= OMOK_BOARD_SIZE ||
        ny < 0 ||
        ny >= OMOK_BOARD_SIZE ||
        board[ny]![nx] !== stone
      )
        break;
      line.unshift({ x: nx, y: ny });
    }
    if (line.length >= 5) {
      const idx = line.findIndex((c) => c.x === x && c.y === y);
      const start = Math.max(0, Math.min(idx - 2, line.length - 5));
      return line.slice(start, start + 5);
    }
  }
  return null;
}

export function isOmokBoardFull(board: OmokBoard): boolean {
  return board.every((row) => row.every((c) => c !== 0));
}
