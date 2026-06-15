import {
  BADUK_DEFAULT_SIZE,
  BADUK_KOMI,
  BADUK_TURN_MS,
  createEmptyBadukBoard,
  isLegalBadukMove,
  scoreBadukBoard,
  tryBadukPlay,
  type BadukBoard,
  type BadukPoint,
  type BadukScore,
} from "../../../src/lib/minigames/baduk-logic";
import { pickBadukAiMove } from "../../../src/lib/minigames/baduk-ai";
import { getRoomAiDifficulty, isCpuSoloRoom, MINIGAME_CPU_USER_ID, scheduleCpuTurn } from "../cpu-solo";
import { setTurnUser } from "../clocks";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type BadukState = {
  board: BadukBoard;
  boardSize: number;
  turn: 1 | 2;
  blackUserId: string;
  whiteUserId: string;
  captures: { black: number; white: number };
  passStreak: number;
  koPoint: BadukPoint | null;
  lastMove: { x: number; y: number } | null;
  turnEndsAt: number;
  timer: ReturnType<typeof setInterval> | null;
  finalScore: BadukScore | null;
};

function gs(room: MinigameRoomInternal): BadukState {
  return room.gameState as BadukState;
}

function turnUserId(state: BadukState): string {
  return state.turn === 1 ? state.blackUserId : state.whiteUserId;
}

function finishScoring(room: MinigameRoomInternal, state: BadukState) {
  const score = scoreBadukBoard(state.board, state.captures, BADUK_KOMI);
  state.finalScore = score;
  const finish = (room as MinigameRoomInternal & { _finishGame?: (w: { winnerId: string; resultMessage: string }) => void })
    ._finishGame;
  if (!finish) return;
  if (score.black > score.white) {
    finish({
      winnerId: state.blackUserId,
      resultMessage: `흑 승 (${score.black.toFixed(1)} : ${score.white.toFixed(1)})`,
    });
  } else {
    finish({
      winnerId: state.whiteUserId,
      resultMessage: `백 승 (${score.black.toFixed(1)} : ${score.white.toFixed(1)}, komi ${BADUK_KOMI})`,
    });
  }
}

function resolveAfterMove(room: MinigameRoomInternal) {
  const state = gs(room);
  if (state.passStreak >= 2) finishScoring(room, state);
}

function startTurnTimer(room: MinigameRoomInternal, state: BadukState) {
  if (state.timer) clearInterval(state.timer);
  state.timer = setInterval(() => {
    if (room.status !== "playing") return;
    if (Date.now() < state.turnEndsAt) {
      (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
      return;
    }
    const loser = turnUserId(state);
    const winner = loser === state.blackUserId ? state.whiteUserId : state.blackUserId;
    const finish = (room as MinigameRoomInternal & { _finishGame?: (w: { winnerId: string; resultMessage: string }) => void })
      ._finishGame;
    if (finish) finish({ winnerId: winner, resultMessage: "시간 초과 패배" });
    (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
  }, 500);
  room.timers.push(state.timer);
}

export const badukPlugin: MinigamePlugin = {
  id: "baduk",
  minPlayers: 2,
  maxPlayers: 2,
  maxPlayersPublic: 2,
  autoStartOnPublicMatch: true,

  initGameState(room) {
    const ids = [...room.players.keys()];
    const blackUserId = room.hostId;
    const whiteUserId = ids.find((id) => id !== blackUserId) ?? ids[1]!;
    const size = BADUK_DEFAULT_SIZE;
    for (const p of room.players.values()) {
      p.role = p.userId === blackUserId ? "black" : "white";
      p.ready = true;
    }
    return {
      board: createEmptyBadukBoard(size),
      boardSize: size,
      turn: 1 as const,
      blackUserId,
      whiteUserId,
      captures: { black: 0, white: 0 },
      passStreak: 0,
      koPoint: null,
      lastMove: null,
      turnEndsAt: Date.now() + BADUK_TURN_MS,
      timer: null,
      finalScore: null,
    } satisfies BadukState;
  },

  onGameStart(room) {
    startTurnTimer(room, gs(room));
    scheduleBadukCpuMoveIfNeeded(room);
  },

  clearTimers(room) {
    const state = room.gameState as BadukState | null;
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
        boardSize: state.boardSize,
        turn: state.turn,
        turnUserId: turnUserId(state),
        blackUserId: state.blackUserId,
        whiteUserId: state.whiteUserId,
        captures: { ...state.captures },
        passStreak: state.passStreak,
        koPoint: state.koPoint,
        lastMove: state.lastMove,
        timeLeft,
        turnLimit: BADUK_TURN_MS / 1000,
        finalScore: state.finalScore,
        komi: BADUK_KOMI,
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임이 진행 중이 아닙니다.";
    const state = gs(room);
    if (userId !== turnUserId(state)) return "상대 턴입니다.";
    if (Date.now() > state.turnEndsAt) return "턴 시간이 지났습니다.";

    if (move && typeof move === "object" && (move as { resign?: boolean }).resign) return null;

    const m = move as { x?: number; y?: number; pass?: boolean };
    if (m.pass) return null;

    if (typeof m.x !== "number" || typeof m.y !== "number") return "잘못된 수입니다.";
    return isLegalBadukMove(state.board, { x: m.x, y: m.y }, state.turn, state.koPoint);
  },

  applyMove(room, userId, move) {
    const state = gs(room);

    if (move && typeof move === "object" && (move as { resign?: boolean }).resign) {
      const winner = userId === state.blackUserId ? state.whiteUserId : state.blackUserId;
      const finish = (room as MinigameRoomInternal & { _finishGame?: (w: { winnerId: string; resultMessage: string }) => void })
        ._finishGame;
      if (finish) finish({ winnerId: winner, resultMessage: "기권 — 패배" });
      return;
    }

    const m = move as { x?: number; y?: number; pass?: boolean };
    if (m.pass) {
      state.passStreak++;
      state.koPoint = null;
      state.lastMove = null;
      state.turn = state.turn === 1 ? 2 : 1;
      state.turnEndsAt = Date.now() + BADUK_TURN_MS;
      room.moveHistory.push({ userId, pass: true });
      resolveAfterMove(room);
      if (room.status === "playing") startTurnTimer(room, state);
      return;
    }

    const result = tryBadukPlay(state.board, m.x!, m.y!, state.turn, state.koPoint);
    if (!result.ok || !result.board) return;

    state.board = result.board;
    if (state.turn === 1) state.captures.black += result.captured ?? 0;
    else state.captures.white += result.captured ?? 0;

    state.koPoint = result.koPoint ?? null;
    state.lastMove = { x: m.x!, y: m.y! };
    state.passStreak = 0;
    state.turn = state.turn === 1 ? 2 : 1;
    state.turnEndsAt = Date.now() + BADUK_TURN_MS;
    room.moveHistory.push({ userId, x: m.x, y: m.y, captured: result.captured ?? 0 });
    resolveAfterMove(room);
    if (room.status === "playing") startTurnTimer(room, state);
  },

  checkWin(room) {
    const state = gs(room);
    if (state.finalScore) {
      const s = state.finalScore;
      if (s.black > s.white) {
        return { winnerId: state.blackUserId, resultMessage: `흑 ${s.black.toFixed(1)}집 승` };
      }
      return { winnerId: state.whiteUserId, resultMessage: `백 ${s.white.toFixed(1)}집 승` };
    }
    return null;
  },

  onGameEnd(room) {
    badukPlugin.clearTimers?.(room);
  },
};

function executeBadukCpuTurn(room: MinigameRoomInternal) {
  if (!isCpuSoloRoom(room) || room.status !== "playing") return;
  const state = gs(room);
  if (turnUserId(state) !== MINIGAME_CPU_USER_ID) return;

  const ai = pickBadukAiMove(state.board, state.turn, state.koPoint, getRoomAiDifficulty(room));
  badukPlugin.applyMove(room, MINIGAME_CPU_USER_ID, "pass" in ai && ai.pass ? { pass: true } : ai);
  setTurnUser(room, turnUserId(gs(room)));
  if (room.status === "playing") {
    (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
    if (turnUserId(gs(room)) === MINIGAME_CPU_USER_ID) scheduleBadukCpuMoveIfNeeded(room);
  }
}

export function scheduleBadukCpuMoveIfNeeded(room: MinigameRoomInternal) {
  if (!isCpuSoloRoom(room) || room.status !== "playing") return;
  if (turnUserId(gs(room)) !== MINIGAME_CPU_USER_ID) return;
  scheduleCpuTurn(room, () => executeBadukCpuTurn(room));
}
