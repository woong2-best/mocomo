import { Chess } from "chess.js";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type ChessGameState = {
  fen: string;
  whiteUserId: string;
  blackUserId: string;
  pgn: string[];
};

function gs(room: MinigameRoomInternal): ChessGameState {
  return room.gameState as ChessGameState;
}

export const chessPlugin: MinigamePlugin = {
  id: "chess",
  minPlayers: 2,
  maxPlayers: 2,
  maxPlayersPublic: 2,
  autoStartOnPublicMatch: true,

  initGameState(room) {
    const ids = [...room.players.keys()];
    const whiteUserId = room.hostId;
    const blackUserId = ids.find((id) => id !== whiteUserId) ?? ids[1]!;
    for (const p of room.players.values()) {
      p.role = p.userId === whiteUserId ? "white" : "black";
      p.ready = true;
    }
    const chess = new Chess();
    return { fen: chess.fen(), whiteUserId, blackUserId, pgn: [] };
  },

  toPublicState(room) {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const state = gs(room);
    const chess = new Chess(state.fen);
    const turnUserId = chess.turn() === "w" ? state.whiteUserId : state.blackUserId;
    return {
      ...base,
      game: {
        fen: state.fen,
        turnUserId,
        whiteUserId: state.whiteUserId,
        blackUserId: state.blackUserId,
        isCheck: chess.inCheck(),
        isCheckmate: chess.isCheckmate(),
        isStalemate: chess.isStalemate(),
        isDraw: chess.isDraw(),
        pgn: [...state.pgn],
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임이 진행 중이 아닙니다.";
    const state = gs(room);
    const chess = new Chess(state.fen);
    const turnUserId = chess.turn() === "w" ? state.whiteUserId : state.blackUserId;
    if (userId !== turnUserId) return "상대 턴입니다.";
    const m = move as { from?: string; to?: string; promotion?: string };
    if (!m.from || !m.to) return "잘못된 수입니다.";
    try {
      const result = chess.move({ from: m.from, to: m.to, promotion: m.promotion ?? "q" });
      if (!result) return "불법 수입니다.";
    } catch {
      return "불법 수입니다.";
    }
    return null;
  },

  applyMove(room, userId, move) {
    const state = gs(room);
    const chess = new Chess(state.fen);
    const m = move as { from: string; to: string; promotion?: string };
    const result = chess.move({ from: m.from, to: m.to, promotion: m.promotion ?? "q" });
    state.fen = chess.fen();
    if (result) state.pgn.push(result.san);
    room.moveHistory.push({ userId, move: m, san: result?.san });
  },

  checkWin(room) {
    const state = gs(room);
    const chess = new Chess(state.fen);
    if (chess.isCheckmate()) {
      const winner =
        chess.turn() === "w" ? state.blackUserId : state.whiteUserId;
      return { winnerId: winner, resultMessage: "체크메이트!" };
    }
    if (chess.isStalemate() || chess.isDraw()) {
      return { winnerId: "", resultMessage: "무승부입니다." };
    }
    return null;
  },
};
