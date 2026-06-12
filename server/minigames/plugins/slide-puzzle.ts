import {
  isSlideSolved,
  shuffleSolvableSlide,
  slideMove,
} from "../../../src/lib/minigames/puzzle-utils";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

const SIZE = 4;

type SlideState = {
  boards: Record<string, number[]>;
  moves: Record<string, number>;
  playerIds: string[];
};

function gs(room: MinigameRoomInternal): SlideState {
  return room.gameState as SlideState;
}

export const slidePuzzlePlugin: MinigamePlugin = {
  id: "slide-puzzle",
  minPlayers: 1,
  maxPlayers: 2,
  maxPlayersPublic: 2,
  autoStartOnPublicMatch: true,

  initGameState(room) {
    const ids = [...room.players.keys()];
    for (const p of room.players.values()) p.ready = true;
    const boards: Record<string, number[]> = {};
    const moves: Record<string, number> = {};
    for (const id of ids) {
      boards[id] = shuffleSolvableSlide(SIZE);
      moves[id] = 0;
    }
    return { boards, moves, playerIds: ids };
  },

  toPublicState(room) {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const state = gs(room);
    return {
      ...base,
      game: {
        size: SIZE,
        boards: { ...state.boards },
        moves: { ...state.moves },
        playerIds: state.playerIds,
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임 중이 아닙니다.";
    const state = gs(room);
    if (!state.boards[userId]) return "플레이어가 아닙니다.";
    const dir = move as "up" | "down" | "left" | "right";
    if (!["up", "down", "left", "right"].includes(dir)) return "방향 오류";
    const next = slideMove(state.boards[userId]!, dir, SIZE);
    if (!next) return "움직일 수 없음";
    return null;
  },

  applyMove(room, userId, move) {
    const state = gs(room);
    const dir = move as "up" | "down" | "left" | "right";
    const next = slideMove(state.boards[userId]!, dir, SIZE)!;
    state.boards[userId] = next;
    state.moves[userId] = (state.moves[userId] ?? 0) + 1;
    room.moveHistory.push({ userId, dir });
    if (isSlideSolved(next, SIZE)) {
      room.winnerId = userId;
      room.status = "finished";
      room.resultMessage = `${state.moves[userId]}수 만에 완성!`;
    }
  },

  checkWin(room) {
    if (room.winnerId) return { winnerId: room.winnerId, resultMessage: room.resultMessage ?? "승리" };
    return null;
  },
};
