import {
  boardToNumbers,
  checkOmokWin,
  createEmptyOmokBoard,
  isOmokBoardFull,
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
};

function playerIds(room: MinigameRoomInternal): string[] {
  return [...room.players.keys()];
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
    } satisfies OmokGameState;
  },

  toPublicState(room): MinigamePublicState {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) {
      return { ...base, game: null };
    }
    const gs = room.gameState as OmokGameState;
    const turnUserId = gs.turn === "black" ? gs.blackUserId : gs.whiteUserId;
    return {
      ...base,
      game: {
        board: boardToNumbers(gs.board),
        turn: gs.turn,
        turnUserId,
        lastMove: gs.lastMove,
        ruleMode: gs.ruleMode,
        blackUserId: gs.blackUserId,
        whiteUserId: gs.whiteUserId,
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임이 진행 중이 아닙니다.";
    const gs = room.gameState as OmokGameState;
    const m = move as OmokMove;
    if (typeof m?.x !== "number" || typeof m?.y !== "number") return "잘못된 수입니다.";
    if (m.x < 0 || m.x >= 15 || m.y < 0 || m.y >= 15) return "보드 범위를 벗어났습니다.";
    const turnUserId = gs.turn === "black" ? gs.blackUserId : gs.whiteUserId;
    if (userId !== turnUserId) return "상대 턴입니다.";
    if (gs.board[m.y]![m.x] !== 0) return "이미 돌이 있습니다.";
    if (gs.ruleMode === "renju" && gs.turn === "black" && isRenjuForbidden(gs.board, m.x, m.y)) {
      return "렌주 금수입니다.";
    }
    return null;
  },

  applyMove(room, userId, move) {
    const gs = room.gameState as OmokGameState;
    const m = move as OmokMove;
    const stone: 1 | 2 = gs.turn === "black" ? 1 : 2;
    gs.board[m.y]![m.x] = stone;
    gs.lastMove = { x: m.x, y: m.y };
    gs.turn = gs.turn === "black" ? "white" : "black";
    room.moveHistory.push({ userId, move: m, stone });
    void userId;
  },

  checkWin(room) {
    const gs = room.gameState as OmokGameState;
    if (!gs.lastMove) return null;
    const { x, y } = gs.lastMove;
    const stone = gs.board[y]![x]! as 1 | 2;
    if (!checkOmokWin(gs.board, x, y, stone)) {
      if (isOmokBoardFull(gs.board)) {
        return { winnerId: "", resultMessage: "무승부입니다." };
      }
      return null;
    }
    const winnerId = stone === 1 ? gs.blackUserId : gs.whiteUserId;
    const color = stone === 1 ? "흑" : "백";
    return { winnerId, resultMessage: `${color} 승리 (5목)` };
  },
};

/** ruleMode를 room에 붙이기 위한 헬퍼 */
export function attachOmokRuleMode(room: MinigameRoomInternal, ruleMode: "free" | "renju") {
  (room as MinigameRoomInternal & { ruleMode?: "free" | "renju" }).ruleMode = ruleMode;
}

export function getOmokState(room: MinigameRoomInternal): OmokGameState | null {
  return room.gameState as OmokGameState | null;
}
