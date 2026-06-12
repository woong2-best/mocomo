import { createMemoryDeck } from "../../../src/lib/minigames/puzzle-utils";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type MemoryState = {
  deck: number[];
  revealed: number[];
  matched: number[];
  scores: Record<string, number>;
  turnUserId: string;
  playerOrder: string[];
  turnIndex: number;
  pairs: number;
  firstPick: number | null;
};

function gs(room: MinigameRoomInternal): MemoryState {
  return room.gameState as MemoryState;
}

function createMemoryPlugin(id: string, pairs: number): MinigamePlugin {
  return {
    id,
    minPlayers: 2,
    maxPlayers: 4,
    maxPlayersPublic: 4,
    autoStartOnPublicMatch: true,

    initGameState(room) {
      const order = [...room.players.keys()];
      for (const p of room.players.values()) p.ready = true;
      return {
        deck: createMemoryDeck(pairs),
        revealed: [],
        matched: [],
        scores: Object.fromEntries(order.map((pid) => [pid, 0])),
        turnUserId: order[0]!,
        playerOrder: order,
        turnIndex: 0,
        pairs,
        firstPick: null,
      };
    },

    toPublicState(room) {
      const base = basePublicFields(room);
      if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
      const state = gs(room);
      return {
        ...base,
        game: {
          deckSize: state.deck.length,
          revealed: [...state.revealed],
          matched: [...state.matched],
          scores: { ...state.scores },
          turnUserId: state.turnUserId,
          pairs: state.pairs,
        },
      };
    },

    validateMove(room, userId, move) {
      if (room.status !== "playing") return "게임 중이 아닙니다.";
      const state = gs(room);
      if (userId !== state.turnUserId) return "내 턴이 아닙니다.";
      const index = Number(move);
      if (!Number.isInteger(index) || index < 0 || index >= state.deck.length) return "잘못된 카드";
      if (state.matched.includes(index) || state.revealed.includes(index)) return "이미 열림";
      return null;
    },

    applyMove(room, userId, move) {
      const state = gs(room);
      const index = Number(move);
      state.revealed.push(index);
      if (state.firstPick === null) {
        state.firstPick = index;
        return;
      }
      const a = state.firstPick;
      const b = index;
      if (state.deck[a] === state.deck[b]) {
        state.matched.push(a, b);
        state.scores[userId] = (state.scores[userId] ?? 0) + 1;
        state.firstPick = null;
        state.revealed = state.revealed.filter((i) => i !== a && i !== b);
      } else {
        state.firstPick = null;
        state.turnIndex = (state.turnIndex + 1) % state.playerOrder.length;
        state.turnUserId = state.playerOrder[state.turnIndex]!;
        setTimeout(() => {
          state.revealed = [];
          (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
        }, 900);
      }
      room.moveHistory.push({ userId, index });
    },

    checkWin(room) {
      const state = gs(room);
      if (state.matched.length >= state.deck.length) {
        const top = Object.entries(state.scores).sort((a, b) => b[1] - a[1])[0];
        if (!top || top[1] === 0) return { winnerId: "", resultMessage: "무승부" };
        const tied = Object.values(state.scores).filter((s) => s === top[1]).length;
        if (tied > 1) return { winnerId: "", resultMessage: "무승부" };
        return { winnerId: top[0], resultMessage: "카드 매칭 승리!" };
      }
      return null;
    },
  };
}

export const memoryCardsPlugin = createMemoryPlugin("memory-cards", 8);
export const pictureMatchPlugin = createMemoryPlugin("picture-match", 6);
