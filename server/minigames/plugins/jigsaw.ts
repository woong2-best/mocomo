import { shuffleJigsaw } from "../../../src/lib/minigames/puzzle-utils";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

const GRID = 4;

type JigsawState = {
  order: number[];
  solved: number[];
  placed: Record<number, number>;
  scores: Record<string, number>;
  turnUserId: string;
  playerOrder: string[];
  turnIndex: number;
  startedAt: number;
};

function gs(room: MinigameRoomInternal): JigsawState {
  return room.gameState as JigsawState;
}

export const jigsawPlugin: MinigamePlugin = {
  id: "jigsaw",
  minPlayers: 1,
  maxPlayers: 4,
  maxPlayersPublic: 4,
  autoStartOnPublicMatch: false,

  initGameState(room) {
    const order = [...room.players.keys()];
    for (const p of room.players.values()) p.ready = true;
    const { order: pieceOrder, solved } = shuffleJigsaw(GRID);
    return {
      order: pieceOrder,
      solved,
      placed: {},
      scores: Object.fromEntries(order.map((id) => [id, 0])),
      turnUserId: order[0]!,
      playerOrder: order,
      turnIndex: 0,
      startedAt: Date.now(),
    };
  },

  toPublicState(room) {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const state = gs(room);
    return {
      ...base,
      game: {
        grid: GRID,
        pool: state.order.filter((p) => !(p in state.placed)),
        placed: { ...state.placed },
        scores: { ...state.scores },
        turnUserId: state.turnUserId,
        elapsed: Math.floor((Date.now() - state.startedAt) / 1000),
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임 중이 아닙니다.";
    const state = gs(room);
    if (userId !== state.turnUserId) return "내 턴";
    const m = move as { piece?: number; slot?: number };
    if (typeof m.piece !== "number" || typeof m.slot !== "number") return "잘못된 입력";
    if (Object.values(state.placed).includes(m.piece)) return "이미 배치됨";
    if (m.slot in state.placed) return "슬롯 사용 중";
    return null;
  },

  applyMove(room, userId, move) {
    const state = gs(room);
    const m = move as { piece: number; slot: number };
    const correct = state.solved[m.slot] === m.piece;
    if (correct) {
      state.placed[m.slot] = m.piece;
      state.scores[userId] = (state.scores[userId] ?? 0) + 1;
    }
    state.turnIndex = (state.turnIndex + 1) % state.playerOrder.length;
    state.turnUserId = state.playerOrder[state.turnIndex]!;
    room.moveHistory.push({ userId, ...m, correct });
    if (Object.keys(state.placed).length >= GRID * GRID) {
      const top = Object.entries(state.scores).sort((a, b) => b[1] - a[1])[0];
      room.winnerId = top?.[0] ?? null;
      room.status = "finished";
      room.resultMessage = "퍼즐 완성!";
    }
  },

  checkWin(room) {
    if (room.status === "finished" && room.resultMessage) {
      return { winnerId: room.winnerId ?? "", resultMessage: room.resultMessage };
    }
    return null;
  },
};
