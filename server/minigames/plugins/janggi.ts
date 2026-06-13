import {
  allLegalMoves,
  applyJanggiMove,
  createInitialJanggiBoard,
  findKing,
  isCheckmate,
  isInCheck,
  isLegalJanggiMove,
  isRedPiece,
  JANGGI_TURN_MS,
  type JanggiBoard,
  type JanggiMove,
} from "../../../src/lib/minigames/janggi-logic";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type JanggiState = {
  board: JanggiBoard;
  turnRed: boolean;
  redUserId: string;
  blueUserId: string;
  lastMove: JanggiMove | null;
  checkRed: boolean;
  checkBlue: boolean;
  turnEndsAt: number;
  timer: ReturnType<typeof setInterval> | null;
};

function gs(room: MinigameRoomInternal): JanggiState {
  return room.gameState as JanggiState;
}

function turnUserId(state: JanggiState): string {
  return state.turnRed ? state.redUserId : state.blueUserId;
}

function refreshCheck(state: JanggiState) {
  state.checkRed = isInCheck(state.board, true);
  state.checkBlue = isInCheck(state.board, false);
}

function applyJanggiMoveState(state: JanggiState, move: JanggiMove) {
  state.board = applyJanggiMove(state.board, move);
  state.lastMove = move;
  state.turnRed = !state.turnRed;
  state.turnEndsAt = Date.now() + JANGGI_TURN_MS;
  refreshCheck(state);
}

function checkWinInternal(room: MinigameRoomInternal) {
  const state = gs(room);
  const lastHist = room.moveHistory[room.moveHistory.length - 1] as { captured?: string } | undefined;
  if (lastHist?.captured === "bK") {
    return { winnerId: state.redUserId, resultMessage: "楚(초) 승리 — 궁 포획!" };
  }
  if (lastHist?.captured === "rK") {
    return { winnerId: state.blueUserId, resultMessage: "漢(한) 승리 — 궁 포획!" };
  }

  if (!findKing(state.board, true)) {
    return { winnerId: state.blueUserId, resultMessage: "漢(한) 승리" };
  }
  if (!findKing(state.board, false)) {
    return { winnerId: state.redUserId, resultMessage: "楚(초) 승리" };
  }

  const loserRed = state.turnRed;
  if (isCheckmate(state.board, loserRed)) {
    const winnerId = loserRed ? state.blueUserId : state.redUserId;
    const side = loserRed ? "漢(한)" : "楚(초)";
    return { winnerId, resultMessage: `${side} 승리 — 외통수!` };
  }

  return null;
}

function resolveAfterMove(room: MinigameRoomInternal) {
  const win = checkWinInternal(room);
  const finish = (room as MinigameRoomInternal & { _finishGame?: (w: { winnerId: string; resultMessage: string }) => void })
    ._finishGame;
  if (win && finish) finish(win);
}

function startTurnTimer(room: MinigameRoomInternal, state: JanggiState) {
  if (state.timer) clearInterval(state.timer);
  state.timer = setInterval(() => {
    if (room.status !== "playing") return;
    if (Date.now() < state.turnEndsAt) {
      (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
      return;
    }
    const loser = turnUserId(state);
    const winner = loser === state.redUserId ? state.blueUserId : state.redUserId;
    const finish = (room as MinigameRoomInternal & { _finishGame?: (w: { winnerId: string; resultMessage: string }) => void })
      ._finishGame;
    if (finish) finish({ winnerId: winner, resultMessage: "시간 초과 패배" });
    (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
  }, 500);
  room.timers.push(state.timer);
}

export const janggiPlugin: MinigamePlugin = {
  id: "janggi",
  minPlayers: 2,
  maxPlayers: 2,
  maxPlayersPublic: 2,
  autoStartOnPublicMatch: true,

  initGameState(room) {
    const ids = [...room.players.keys()];
    const redUserId = room.hostId;
    const blueUserId = ids.find((id) => id !== redUserId) ?? ids[1]!;
    for (const p of room.players.values()) {
      p.role = p.userId === redUserId ? "red" : "blue";
      p.ready = true;
    }
    const board = createInitialJanggiBoard();
    return {
      board,
      turnRed: true,
      redUserId,
      blueUserId,
      lastMove: null,
      checkRed: false,
      checkBlue: false,
      turnEndsAt: Date.now() + JANGGI_TURN_MS,
      timer: null,
    } satisfies JanggiState;
  },

  onGameStart(room) {
    const state = gs(room);
    refreshCheck(state);
    startTurnTimer(room, state);
  },

  clearTimers(room) {
    const state = room.gameState as JanggiState | null;
    if (state?.timer) clearInterval(state.timer);
  },

  toPublicState(room) {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const state = gs(room);
    const timeLeft = Math.max(0, Math.ceil((state.turnEndsAt - Date.now()) / 1000));
    return {
      ...base,
      game: {
        board: state.board,
        turnRed: state.turnRed,
        turnUserId: turnUserId(state),
        redUserId: state.redUserId,
        blueUserId: state.blueUserId,
        lastMove: state.lastMove,
        checkRed: state.checkRed,
        checkBlue: state.checkBlue,
        timeLeft,
        turnLimit: JANGGI_TURN_MS / 1000,
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임이 진행 중이 아닙니다.";
    const state = gs(room);
    if (userId !== turnUserId(state)) return "상대 턴입니다.";

    if (move && typeof move === "object" && (move as { resign?: boolean }).resign) {
      return null;
    }

    if (Date.now() > state.turnEndsAt) return "턴 시간이 지났습니다.";

    const m = move as Partial<JanggiMove>;
    if ([m.fromX, m.fromY, m.toX, m.toY].some((v) => typeof v !== "number")) return "잘못된 수";

    const jmove: JanggiMove = {
      fromX: m.fromX!,
      fromY: m.fromY!,
      toX: m.toX!,
      toY: m.toY!,
    };

    const piece = state.board[jmove.fromY]?.[jmove.fromX];
    if (!piece) return "기물이 없습니다.";
    if (isRedPiece(piece) !== state.turnRed) return "내 기물이 아닙니다.";
    if (!isLegalJanggiMove(state.board, state.turnRed, jmove)) return "불법 수입니다.";

    return null;
  },

  applyMove(room, userId, move) {
    const state = gs(room);
    if (move && typeof move === "object" && (move as { resign?: boolean }).resign) {
      const win = janggiForceResign(room, userId);
      const finish = (room as MinigameRoomInternal & { _finishGame?: (w: { winnerId: string; resultMessage: string }) => void })
        ._finishGame;
      if (finish) finish(win);
      return;
    }
    const m = move as JanggiMove;
    const captured = state.board[m.toY]?.[m.toX] ?? undefined;
    applyJanggiMoveState(state, m);
    room.moveHistory.push({ userId, ...m, captured });
    resolveAfterMove(room);
    if (room.status === "playing") startTurnTimer(room, state);
  },

  checkWin(room) {
    return checkWinInternal(room);
  },

  onGameEnd(room) {
    janggiPlugin.clearTimers?.(room);
  },
};

/** 기권 등 — store에서 호출 가능 */
export function janggiForceResign(room: MinigameRoomInternal, userId: string) {
  const state = gs(room);
  const winner =
    userId === state.redUserId ? state.blueUserId : state.redUserId;
  return { winnerId: winner, resultMessage: "기권 — 패배" };
}

export function janggiHasAnyLegalMove(room: MinigameRoomInternal): boolean {
  const state = gs(room);
  return allLegalMoves(state.board, state.turnRed).length > 0;
}
