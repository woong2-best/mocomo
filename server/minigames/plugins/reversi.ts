import {
  applyReversiMove,
  boardToReversiNumbers,
  countReversiDiscs,
  createInitialReversiBoard,
  getValidReversiMoves,
  reversiGameOver,
  type ReversiBoard,
} from "../../../src/lib/minigames/reversi-logic";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type ReversiState = {
  board: ReversiBoard;
  turn: 1 | 2;
  blackUserId: string;
  whiteUserId: string;
  passStreak: number;
};

function gs(room: MinigameRoomInternal): ReversiState {
  return room.gameState as ReversiState;
}

export const reversiPlugin: MinigamePlugin = {
  id: "reversi",
  minPlayers: 2,
  maxPlayers: 2,
  maxPlayersPublic: 2,
  autoStartOnPublicMatch: true,

  initGameState(room) {
    const ids = [...room.players.keys()];
    const blackUserId = room.hostId;
    const whiteUserId = ids.find((id) => id !== blackUserId) ?? ids[1]!;
    for (const p of room.players.values()) {
      p.role = p.userId === blackUserId ? "black" : "white";
      p.ready = true;
    }
    return {
      board: createInitialReversiBoard(),
      turn: 1,
      blackUserId,
      whiteUserId,
      passStreak: 0,
    };
  },

  toPublicState(room) {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const state = gs(room);
    const turnUserId = state.turn === 1 ? state.blackUserId : state.whiteUserId;
    const valid = getValidReversiMoves(state.board, state.turn);
    return {
      ...base,
      game: {
        board: boardToReversiNumbers(state.board),
        turn: state.turn,
        turnUserId,
        blackUserId: state.blackUserId,
        whiteUserId: state.whiteUserId,
        validMoves: valid.map(([x, y]) => ({ x, y })),
        scores: countReversiDiscs(state.board),
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임이 진행 중이 아닙니다.";
    const state = gs(room);
    const turnUserId = state.turn === 1 ? state.blackUserId : state.whiteUserId;
    if (userId !== turnUserId) return "상대 턴입니다.";
    const m = move as { x?: number; y?: number; pass?: boolean };
    if (m.pass) {
      if (getValidReversiMoves(state.board, state.turn).length > 0) return "둘 수 있는 곳이 있습니다.";
      return null;
    }
    if (typeof m.x !== "number" || typeof m.y !== "number") return "잘못된 수입니다.";
    const valid = getValidReversiMoves(state.board, state.turn);
    if (!valid.some(([x, y]) => x === m.x && y === m.y)) return "불법 수입니다.";
    return null;
  },

  applyMove(room, userId, move) {
    const state = gs(room);
    const m = move as { x?: number; y?: number; pass?: boolean };
    if (m.pass) {
      state.passStreak++;
      state.turn = state.turn === 1 ? 2 : 1;
      room.moveHistory.push({ userId, pass: true });
      return;
    }
    state.board = applyReversiMove(state.board, m.x!, m.y!, state.turn);
    state.passStreak = 0;
    state.turn = state.turn === 1 ? 2 : 1;
    room.moveHistory.push({ userId, x: m.x, y: m.y });
  },

  checkWin(room) {
    const state = gs(room);
    const curValid = getValidReversiMoves(state.board, state.turn);
    const opp = state.turn === 1 ? 2 : 1;
    const oppValid = getValidReversiMoves(state.board, opp);
    if (curValid.length === 0 && oppValid.length === 0) {
      const { black, white } = countReversiDiscs(state.board);
      if (black === white) return { winnerId: "", resultMessage: "무승부" };
      const winnerId = black > white ? state.blackUserId : state.whiteUserId;
      return { winnerId, resultMessage: `${black}:${white} 승리` };
    }
    if (state.passStreak >= 2 || reversiGameOver(state.board)) {
      const { black, white } = countReversiDiscs(state.board);
      if (black === white) return { winnerId: "", resultMessage: "무승부" };
      const winnerId = black > white ? state.blackUserId : state.whiteUserId;
      return { winnerId, resultMessage: `${black}:${white} 승리` };
    }
    return null;
  },
};
