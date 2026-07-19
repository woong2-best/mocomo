export type TttMark = "X" | "O";
export type TttCell = TttMark | null;

export type TttGameState = {
  board: TttCell[];
  turn: TttMark;
  winner: TttMark | "draw" | null;
  xPlayerId: string;
  oPlayerId: string;
};

export function createTttState(hostId: string, guestId: string): TttGameState {
  return {
    board: Array(9).fill(null),
    turn: "X",
    winner: null,
    xPlayerId: hostId,
    oPlayerId: guestId,
  };
}

function lineWinner(board: TttCell[]): TttMark | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

export function applyTttMove(
  state: TttGameState,
  index: number,
  playerId: string
): TttGameState | null {
  if (state.winner || index < 0 || index > 8 || state.board[index]) return null;
  const mark: TttMark = state.turn;
  const expected = mark === "X" ? state.xPlayerId : state.oPlayerId;
  if (playerId !== expected) return null;

  const board = [...state.board];
  board[index] = mark;
  const winnerMark = lineWinner(board);
  const full = board.every(Boolean);
  return {
    ...state,
    board,
    turn: mark === "X" ? "O" : "X",
    winner: winnerMark ?? (full ? "draw" : null),
  };
}

export function tttResultForPlayer(
  state: TttGameState,
  playerId: string
): "win" | "lose" | "draw" | null {
  if (!state.winner) return null;
  if (state.winner === "draw") return "draw";
  const winnerId = state.winner === "X" ? state.xPlayerId : state.oPlayerId;
  return winnerId === playerId ? "win" : "lose";
}
