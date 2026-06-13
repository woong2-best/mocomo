import { Chess } from "chess.js";
import {
  CHESS_TURN_MS,
  getChessStatus,
  getTurnUserId,
  isPromotionMove,
  parseHalfmoveClock,
  tryChessMove,
  type ChessMoveInput,
} from "../../../src/lib/minigames/chess-logic";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type ChessGameState = {
  fen: string;
  whiteUserId: string;
  blackUserId: string;
  pgn: string[];
  lastMove: { from: string; to: string; san?: string } | null;
  drawOfferFrom: string | null;
  turnEndsAt: number;
  timer: ReturnType<typeof setInterval> | null;
};

function gs(room: MinigameRoomInternal): ChessGameState {
  return room.gameState as ChessGameState;
}

function turnUserId(state: ChessGameState): string {
  return getTurnUserId(state.fen, state.whiteUserId, state.blackUserId);
}

function usesRoomClocks(room: MinigameRoomInternal): boolean {
  return !!room.timeControl && room.timeControl !== "unlimited";
}

function opponentOf(state: ChessGameState, userId: string): string {
  return userId === state.whiteUserId ? state.blackUserId : state.whiteUserId;
}

function resolveAfterMove(room: MinigameRoomInternal) {
  const state = gs(room);
  const status = getChessStatus(state.fen);
  const finish = (room as MinigameRoomInternal & { _finishGame?: (w: { winnerId: string; resultMessage: string }) => void })
    ._finishGame;
  if (!finish) return;

  if (status.isCheckmate) {
    const chess = new Chess(state.fen);
    const winner = chess.turn() === "w" ? state.blackUserId : state.whiteUserId;
    finish({ winnerId: winner, resultMessage: "체크메이트!" });
    return;
  }
  if (status.isStalemate) {
    finish({ winnerId: "", resultMessage: "스테일메이트 — 무승부" });
    return;
  }
  if (status.isDraw) {
    const half = parseHalfmoveClock(state.fen);
    const msg = half >= 100 ? "50수 규칙 — 무승부" : "무승부입니다.";
    finish({ winnerId: "", resultMessage: msg });
  }
}

function startTurnTimer(room: MinigameRoomInternal, state: ChessGameState) {
  if (usesRoomClocks(room)) return;
  if (state.timer) clearInterval(state.timer);
  state.timer = setInterval(() => {
    if (room.status !== "playing") return;
    if (Date.now() < state.turnEndsAt) {
      (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
      return;
    }
    const loser = turnUserId(state);
    const winner = opponentOf(state, loser);
    const finish = (room as MinigameRoomInternal & { _finishGame?: (w: { winnerId: string; resultMessage: string }) => void })
      ._finishGame;
    if (finish) finish({ winnerId: winner, resultMessage: "시간 초과 패배" });
    (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
  }, 500);
  room.timers.push(state.timer);
}

function isSideAction(move: unknown): move is { resign?: boolean; drawOffer?: boolean; acceptDraw?: boolean; declineDraw?: boolean } {
  return !!move && typeof move === "object";
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
    return {
      fen: chess.fen(),
      whiteUserId,
      blackUserId,
      pgn: [],
      lastMove: null,
      drawOfferFrom: null,
      turnEndsAt: Date.now() + CHESS_TURN_MS,
      timer: null,
    } satisfies ChessGameState;
  },

  onGameStart(room) {
    startTurnTimer(room, gs(room));
  },

  clearTimers(room) {
    const state = room.gameState as ChessGameState | null;
    if (state?.timer) clearInterval(state.timer);
  },

  toPublicState(room) {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const state = gs(room);
    const chess = new Chess(state.fen);
    const turnId = turnUserId(state);
    const halfmoveClock = parseHalfmoveClock(state.fen);
    const useTurnTimer = !usesRoomClocks(room);
    const timeLeft = useTurnTimer ? Math.max(0, Math.ceil((state.turnEndsAt - Date.now()) / 1000)) : 0;

    return {
      ...base,
      game: {
        fen: state.fen,
        turnUserId: turnId,
        whiteUserId: state.whiteUserId,
        blackUserId: state.blackUserId,
        isCheck: chess.inCheck(),
        isCheckmate: chess.isCheckmate(),
        isStalemate: chess.isStalemate(),
        isDraw: chess.isDraw(),
        lastMove: state.lastMove,
        halfmoveClock,
        drawOfferFrom: state.drawOfferFrom,
        useTurnTimer,
        timeLeft,
        turnLimit: CHESS_TURN_MS / 1000,
        pgn: [...state.pgn],
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임이 진행 중이 아닙니다.";
    const state = gs(room);

    if (isSideAction(move)) {
      if (move.resign) {
        if (userId !== state.whiteUserId && userId !== state.blackUserId) return "참가자만 기권할 수 있습니다.";
        return null;
      }
      if (move.drawOffer) {
        if (userId !== turnUserId(state)) return "내 턴에만 무승부를 제안할 수 있습니다.";
        return null;
      }
      if (move.acceptDraw) {
        if (!state.drawOfferFrom) return "받은 무승부 제안이 없습니다.";
        if (userId !== opponentOf(state, state.drawOfferFrom)) return "상대의 제안만 수락할 수 있습니다.";
        return null;
      }
      if (move.declineDraw) {
        if (!state.drawOfferFrom) return "받은 무승부 제안이 없습니다.";
        if (userId !== opponentOf(state, state.drawOfferFrom)) return "상대의 제안만 거절할 수 있습니다.";
        return null;
      }
    }

    if (userId !== turnUserId(state)) return "상대 턴입니다.";
    if (!usesRoomClocks(room) && Date.now() > state.turnEndsAt) return "턴 시간이 지났습니다.";

    const m = move as ChessMoveInput & { from?: string; to?: string };
    if (!m.from || !m.to) return "잘못된 수입니다.";

    if (isPromotionMove(state.fen, m.from, m.to) && !m.promotion) {
      return "프로모션 기물을 선택하세요.";
    }

    const result = tryChessMove(state.fen, {
      from: m.from,
      to: m.to,
      promotion: m.promotion,
    });
    return result.ok ? null : result.reason;
  },

  applyMove(room, userId, move) {
    const state = gs(room);
    const finish = (room as MinigameRoomInternal & { _finishGame?: (w: { winnerId: string; resultMessage: string }) => void })
      ._finishGame;

    if (isSideAction(move)) {
      if (move.resign) {
        const winner = opponentOf(state, userId);
        if (finish) finish({ winnerId: winner, resultMessage: "기권 — 패배" });
        return;
      }
      if (move.drawOffer) {
        state.drawOfferFrom = userId;
        return;
      }
      if (move.acceptDraw) {
        if (finish) finish({ winnerId: "", resultMessage: "무승부 합의" });
        return;
      }
      if (move.declineDraw) {
        state.drawOfferFrom = null;
        return;
      }
    }

    const m = move as ChessMoveInput;
    const result = tryChessMove(state.fen, m);
    if (!result.ok) return;

    state.fen = result.fen;
    state.pgn.push(result.san);
    state.lastMove = { from: m.from, to: m.to, san: result.san };
    state.drawOfferFrom = null;
    if (!usesRoomClocks(room)) state.turnEndsAt = Date.now() + CHESS_TURN_MS;
    room.moveHistory.push({ userId, move: m, san: result.san });
    resolveAfterMove(room);
    if (room.status === "playing") startTurnTimer(room, state);
  },

  checkWin(room) {
    const state = gs(room);
    const status = getChessStatus(state.fen);
    if (status.isCheckmate) {
      const chess = new Chess(state.fen);
      const winner = chess.turn() === "w" ? state.blackUserId : state.whiteUserId;
      return { winnerId: winner, resultMessage: "체크메이트!" };
    }
    if (status.isStalemate) return { winnerId: "", resultMessage: "스테일메이트 — 무승부" };
    if (status.isDraw) {
      const half = parseHalfmoveClock(state.fen);
      return { winnerId: "", resultMessage: half >= 100 ? "50수 규칙 — 무승부" : "무승부입니다." };
    }
    return null;
  },

  onGameEnd(room) {
    chessPlugin.clearTimers?.(room);
  },
};
