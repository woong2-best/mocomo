import {
  REVERSI_TURN_MS,
  boardToReversiNumbers,
  countReversiDiscs,
  createInitialReversiBoard,
  formatReversiResult,
  getValidReversiMoves,
  isReversiBoardFull,
  oppositeReversiPlayer,
  scoreReversiGame,
  tryReversiMove,
  type ReversiBoard,
} from "../../../src/lib/minigames/reversi-logic";
import { pickReversiAiMove } from "../../../src/lib/minigames/reversi-ai";
import { getRoomAiDifficulty, isCpuSoloRoom, MINIGAME_CPU_USER_ID, scheduleCpuTurn } from "../cpu-solo";
import { setTurnUser } from "../clocks";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type ReversiState = {
  board: ReversiBoard;
  turn: 1 | 2;
  blackUserId: string;
  whiteUserId: string;
  passStreak: number;
  lastMove: { x: number; y: number } | null;
  lastNotice: string | null;
  turnEndsAt: number;
  timer: ReturnType<typeof setInterval> | null;
  finalScore: { black: number; white: number } | null;
};

function gs(room: MinigameRoomInternal): ReversiState {
  return room.gameState as ReversiState;
}

function turnUserId(state: ReversiState): string {
  return state.turn === 1 ? state.blackUserId : state.whiteUserId;
}

function usesRoomClocks(room: MinigameRoomInternal): boolean {
  return !!room.timeControl && room.timeControl !== "unlimited";
}

function finishByScore(room: MinigameRoomInternal, state: ReversiState): { black: number; white: number } {
  const { black, white } = scoreReversiGame(state.board);
  state.finalScore = { black, white };
  const finish = (room as MinigameRoomInternal & { _finishGame?: (w: { winnerId: string; resultMessage: string }) => void })
    ._finishGame;
  if (finish) finish(formatReversiResult(black, white, state.blackUserId, state.whiteUserId));
  return { black, white };
}

function autoPassLoop(room: MinigameRoomInternal, state: ReversiState) {
  state.lastNotice = null;
  if (isReversiBoardFull(state.board)) return;

  while (getValidReversiMoves(state.board, state.turn).length === 0 && state.passStreak < 2) {
    const side = state.turn === 1 ? "흑" : "백";
    state.passStreak++;
    state.lastMove = null;
    state.lastNotice = `${side} 패스 (둘 곳 없음)`;
    room.moveHistory.push({
      userId: turnUserId(state),
      pass: true,
      auto: true,
      turn: state.turn,
    });
    if (state.passStreak >= 2) return;
    state.turn = oppositeReversiPlayer(state.turn);
  }
}

function afterTurnChange(room: MinigameRoomInternal, state: ReversiState, wasMove: boolean) {
  state.turn = oppositeReversiPlayer(state.turn);
  if (wasMove) state.passStreak = 0;
  else state.passStreak++;
  autoPassLoop(room, state);
}

function startTurnTimer(room: MinigameRoomInternal, state: ReversiState) {
  if (usesRoomClocks(room)) return;
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

function resetTurnDeadline(room: MinigameRoomInternal, state: ReversiState) {
  if (!usesRoomClocks(room)) state.turnEndsAt = Date.now() + REVERSI_TURN_MS;
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
      lastMove: null,
      lastNotice: null,
      turnEndsAt: Date.now() + REVERSI_TURN_MS,
      timer: null,
      finalScore: null,
    } satisfies ReversiState;
  },

  onGameStart(room) {
    startTurnTimer(room, gs(room));
    scheduleReversiCpuMoveIfNeeded(room);
  },

  clearTimers(room) {
    const state = room.gameState as ReversiState | null;
    if (state?.timer) clearInterval(state.timer);
  },

  toPublicState(room) {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const state = gs(room);
    const valid = getValidReversiMoves(state.board, state.turn);
    const useTurnTimer = !usesRoomClocks(room);
    const timeLeft = useTurnTimer ? Math.max(0, Math.ceil((state.turnEndsAt - Date.now()) / 1000)) : 0;

    return {
      ...base,
      game: {
        board: boardToReversiNumbers(state.board),
        turn: state.turn,
        turnUserId: turnUserId(state),
        blackUserId: state.blackUserId,
        whiteUserId: state.whiteUserId,
        validMoves: valid.map(([x, y]) => ({ x, y })),
        scores: countReversiDiscs(state.board),
        passStreak: state.passStreak,
        lastMove: state.lastMove,
        lastNotice: state.lastNotice,
        useTurnTimer,
        timeLeft,
        turnLimit: REVERSI_TURN_MS / 1000,
        finalScore: state.finalScore,
        boardFull: isReversiBoardFull(state.board),
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임이 진행 중이 아닙니다.";
    const state = gs(room);
    if (userId !== turnUserId(state)) return "상대 턴입니다.";
    if (!usesRoomClocks(room) && Date.now() > state.turnEndsAt) return "턴 시간이 지났습니다.";

    if (move && typeof move === "object" && (move as { resign?: boolean }).resign) return null;

    const m = move as { x?: number; y?: number; pass?: boolean };
    if (m.pass) {
      if (getValidReversiMoves(state.board, state.turn).length > 0) return "둘 수 있는 곳이 있습니다.";
      return null;
    }

    if (typeof m.x !== "number" || typeof m.y !== "number") return "잘못된 수입니다.";
    const result = tryReversiMove(state.board, m.x, m.y, state.turn);
    return result.ok ? null : result.reason;
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
      state.lastNotice = `${state.turn === 1 ? "흑" : "백"} 패스`;
      state.lastMove = null;
      room.moveHistory.push({ userId, pass: true, turn: state.turn });
      afterTurnChange(room, state, false);
      resetTurnDeadline(room, state);
      if (room.status === "playing") startTurnTimer(room, state);
      return;
    }

    const result = tryReversiMove(state.board, m.x!, m.y!, state.turn);
    if (!result.ok) return;

    state.board = result.board;
    state.lastMove = { x: m.x!, y: m.y! };
    state.lastNotice = `${result.flipped}개 뒤집음`;
    room.moveHistory.push({
      userId,
      x: m.x,
      y: m.y,
      color: state.turn === 1 ? "black" : "white",
      flipped: result.flipped,
    });

    afterTurnChange(room, state, true);
    resetTurnDeadline(room, state);
    if (room.status === "playing") startTurnTimer(room, state);
  },

  checkWin(room) {
    const state = gs(room);
    if (state.finalScore) {
      return formatReversiResult(
        state.finalScore.black,
        state.finalScore.white,
        state.blackUserId,
        state.whiteUserId
      );
    }
    if (isReversiBoardFull(state.board) || state.passStreak >= 2) {
      const fs = finishByScore(room, state);
      return formatReversiResult(fs.black, fs.white, state.blackUserId, state.whiteUserId);
    }
    return null;
  },

  onGameEnd(room) {
    reversiPlugin.clearTimers?.(room);
  },
};

function finishFromWin(room: MinigameRoomInternal, win: { winnerId: string; resultMessage: string } | null) {
  if (!win) return;
  const finish = (room as MinigameRoomInternal & { _finishGame?: (w: { winnerId: string; resultMessage: string }) => void })
    ._finishGame;
  finish?.(win);
}

function executeReversiCpuTurn(room: MinigameRoomInternal) {
  if (!isCpuSoloRoom(room) || room.status !== "playing") return;
  const state = gs(room);
  if (turnUserId(state) !== MINIGAME_CPU_USER_ID) return;

  const ai = pickReversiAiMove(state.board, state.turn, getRoomAiDifficulty(room));
  reversiPlugin.applyMove(room, MINIGAME_CPU_USER_ID, "pass" in ai && ai.pass ? { pass: true } : ai);
  setTurnUser(room, turnUserId(gs(room)));
  finishFromWin(room, reversiPlugin.checkWin(room));
  if (room.status === "playing") {
    (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
    if (turnUserId(gs(room)) === MINIGAME_CPU_USER_ID) scheduleReversiCpuMoveIfNeeded(room);
  }
}

export function scheduleReversiCpuMoveIfNeeded(room: MinigameRoomInternal) {
  if (!isCpuSoloRoom(room) || room.status !== "playing") return;
  if (turnUserId(gs(room)) !== MINIGAME_CPU_USER_ID) return;
  scheduleCpuTurn(room, () => executeReversiCpuTurn(room));
}
