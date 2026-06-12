export const OMOK_BOARD_SIZE = 15;

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
  const dirs: [number, number][] = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  for (const [dx, dy] of dirs) {
    let count = 1;
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
      count++;
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
      count++;
    }
    if (count >= 5) return true;
  }
  return false;
}

export function isOmokBoardFull(board: OmokBoard): boolean {
  return board.every((row) => row.every((c) => c !== 0));
}
