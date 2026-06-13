import {
  boardToNumbers,
  checkOmokWin,
  createEmptyOmokBoard,
  getOmokWinLine,
  isOmokBoardFull,
  OMOK_BOARD_SIZE,
  OMOK_TURN_MS,
  type OmokBoard,
} from "../../../src/lib/minigames/omok-logic";
import { isRenjuForbidden } from "../../../src/lib/minigames/renju-logic";
import type { MinigamePublicState } from "../../../src/lib/minigames/shared-types";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type OmokMove = { x: number; y: number };

type OmokGameState = {
  board: OmokBoard;
  turn: "black" | "white";
  blackUserId: string;
  whiteUserId: string;
  lastMove: OmokMove | null;
  ruleMode: "free" | "renju";
  turnEndsAt: number;
  timer: ReturnType<typeof setInterval> | null;
  winLine: { x: number; y: number }[] | null;
};

function gs(room: MinigameRoomInternal): OmokGameState {
  return room.gameState as OmokGameState;
}

function playerIds(room: MinigameRoomInternal): string[] {
  return [...room.players.keys()];
}

function pickRandomMove(state: OmokGameState): OmokMove | null {
  const candidates: OmokMove[] = [];
  for (let y = 0; y < OMOK_BOARD_SIZE; y++) {
    for (let x = 0; x < OMOK_BOARD_SIZE; x++) {
      if (state.board[y]![x] !== 0) continue;
      if (state.ruleMode === "renju" && state.turn === "black" && isRenjuForbidden(state.board, x, y)) {
        continue;
      }
      candidates.push({ x, y });
    }
  }
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}

function placeStone(room: MinigameRoomInternal, userId: string, m: OmokMove) {
  const state = gs(room);
  const stone: 1 | 2 = state.turn === "black" ? 1 : 2;
  state.board[m.y]![m.x] = stone;
  state.lastMove = { x: m.x, y: m.y };
  const line = getOmokWinLine(state.board, m.x, m.y, stone);
  if (line) state.winLine = line;
  state.turn = state.turn === "black" ? "white" : "black";
  state.turnEndsAt = Date.now() + OMOK_TURN_MS;
  room.moveHistory.push({ userId, move: m, stone });
}

function checkWinInternal(room: MinigameRoomInternal) {
  const state = gs(room);
  if (!state.lastMove) return null;
  const { x, y } = state.lastMove;
  const stone = state.board[y]![x]! as 1 | 2;
  if (!checkOmokWin(state.board, x, y, stone)) {
    if (isOmokBoardFull(state.board)) {
      return { winnerId: "", resultMessage: "무승부입니다." };
    }
    return null;
  }
  const winnerId = stone === 1 ? state.blackUserId : state.whiteUserId;
  const color = stone === 1 ? "흑" : "백";
  if (!state.winLine) {
    state.winLine = getOmokWinLine(state.board, x, y, stone);
  }
  return { winnerId, resultMessage: `${color} 승리 (5목)` };
}

function resolveAfterMove(room: MinigameRoomInternal) {
  const win = checkWinInternal(room);
  const finish = (room as MinigameRoomInternal & { _finishGame?: (w: { winnerId: string; resultMessage: string }) => void })
    ._finishGame;
  if (win && finish) {
    finish(win);
    return;
  }
  const state = gs(room);
  if (isOmokBoardFull(state.board) && finish) {
    finish({ winnerId: "", resultMessage: "무승부입니다." });
  }
}

function startTurnTimer(room: MinigameRoomInternal, state: OmokGameState) {
  if (state.timer) clearInterval(state.timer);
  state.timer = setInterval(() => {
    if (room.status !== "playing") return;
    if (Date.now() < state.turnEndsAt) {
      (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
      return;
    }
    const turnUserId = state.turn === "black" ? state.blackUserId : state.whiteUserId;
    const pick = pickRandomMove(state);
    if (pick) {
      placeStone(room, turnUserId, pick);
      resolveAfterMove(room);
    } else {
      state.turnEndsAt = Date.now() + OMOK_TURN_MS;
    }
    (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
  }, 500);
  room.timers.push(state.timer);
}

export const omokPlugin: MinigamePlugin = {
  id: "omok",
  minPlayers: 2,
  maxPlayers: 2,
  maxPlayersPublic: 2,
  autoStartOnPublicMatch: true,

  initGameState(room) {
    const ids = playerIds(room);
    const blackUserId = room.hostId;
    const whiteUserId = ids.find((id) => id !== blackUserId) ?? ids[1]!;
    for (const p of room.players.values()) {
      p.role = p.userId === blackUserId ? "black" : "white";
      p.ready = true;
    }
    const ruleMode = (room as MinigameRoomInternal & { ruleMode?: "free" | "renju" }).ruleMode ?? "free";
    return {
      board: createEmptyOmokBoard(),
      turn: "black" as const,
      blackUserId,
      whiteUserId,
      lastMove: null,
      ruleMode,
      turnEndsAt: Date.now() + OMOK_TURN_MS,
      timer: null,
      winLine: null,
    } satisfies OmokGameState;
  },

  onGameStart(room) {
    startTurnTimer(room, gs(room));
  },

  clearTimers(room) {
    const state = room.gameState as OmokGameState | null;
    if (state?.timer) clearInterval(state.timer);
  },

  toPublicState(room): MinigamePublicState {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) {
      return { ...base, game: null };
    }
    const state = gs(room);
    const turnUserId = state.turn === "black" ? state.blackUserId : state.whiteUserId;
    const timeLeft = Math.max(0, Math.ceil((state.turnEndsAt - Date.now()) / 1000));
    return {
      ...base,
      game: {
        board: boardToNumbers(state.board),
        turn: state.turn,
        turnUserId,
        lastMove: state.lastMove,
        ruleMode: state.ruleMode,
        blackUserId: state.blackUserId,
        whiteUserId: state.whiteUserId,
        timeLeft,
        turnLimit: OMOK_TURN_MS / 1000,
        winLine: state.winLine,
        moveCount: room.moveHistory.length,
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임이 진행 중이 아닙니다.";
    const state = gs(room);
    const m = move as OmokMove;
    if (typeof m?.x !== "number" || typeof m?.y !== "number") return "잘못된 수입니다.";
    if (m.x < 0 || m.x >= OMOK_BOARD_SIZE || m.y < 0 || m.y >= OMOK_BOARD_SIZE) {
      return "보드 범위를 벗어났습니다.";
    }
    const turnUserId = state.turn === "black" ? state.blackUserId : state.whiteUserId;
    if (userId !== turnUserId) return "상대 턴입니다.";
    if (Date.now() > state.turnEndsAt) return "턴 시간이 지났습니다.";
    if (state.board[m.y]![m.x] !== 0) return "이미 돌이 있습니다.";
    if (state.ruleMode === "renju" && state.turn === "black" && isRenjuForbidden(state.board, m.x, m.y)) {
      return "렌주 금수입니다.";
    }
    return null;
  },

  applyMove(room, userId, move) {
    placeStone(room, userId, move as OmokMove);
  },

  checkWin: checkWinInternal,
};

/** ruleMode를 room에 붙이기 위한 헬퍼 */
export function attachOmokRuleMode(room: MinigameRoomInternal, ruleMode: "free" | "renju") {
  (room as MinigameRoomInternal & { ruleMode?: "free" | "renju" }).ruleMode = ruleMode;
}

export function getOmokState(room: MinigameRoomInternal): OmokGameState | null {
  return room.gameState as OmokGameState | null;
}
