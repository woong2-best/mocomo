import {
  MEMORY_FLIP_BACK_MS,
  createMemoryCardDeck,
  type MemoryCardInternal,
} from "../../../src/lib/minigames/memory-cards";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type MemoryState = {
  cards: MemoryCardInternal[];
  flippedIds: string[];
  matchedIds: string[];
  scores: Record<string, number>;
  turnUserId: string;
  playerOrder: string[];
  turnIndex: number;
  pairs: number;
  firstSelectedCard: string | null;
  secondSelectedCard: string | null;
  resolving: boolean;
};

function gs(room: MinigameRoomInternal): MemoryState {
  return room.gameState as MemoryState;
}

function cardById(state: MemoryState, id: string): MemoryCardInternal | undefined {
  return state.cards.find((c) => c.id === id);
}

function toPublicCards(state: MemoryState) {
  const flipped = new Set(state.flippedIds);
  const matched = new Set(state.matchedIds);
  return state.cards.map((c) => ({
    id: c.id,
    pairId: c.pairId,
    imageUrl: c.imageUrl,
    isFlipped: matched.has(c.id) || flipped.has(c.id),
    isMatched: matched.has(c.id),
  }));
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
        cards: createMemoryCardDeck(pairs),
        flippedIds: [],
        matchedIds: [],
        scores: Object.fromEntries(order.map((pid) => [pid, 0])),
        turnUserId: order[0]!,
        playerOrder: order,
        turnIndex: 0,
        pairs,
        firstSelectedCard: null,
        secondSelectedCard: null,
        resolving: false,
      } satisfies MemoryState;
    },

    toPublicState(room) {
      const base = basePublicFields(room);
      if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
      const state = gs(room);
      const matchedPairs = state.matchedIds.length / 2;
      return {
        ...base,
        game: {
          cards: toPublicCards(state),
          currentPlayer: state.turnUserId,
          firstSelectedCard: state.firstSelectedCard,
          secondSelectedCard: state.secondSelectedCard,
          scores: { ...state.scores },
          remainingPairs: state.pairs - matchedPairs,
          resolving: state.resolving,
          pairs: state.pairs,
          turnUserId: state.turnUserId,
        },
      };
    },

    validateMove(room, userId, move) {
      if (room.status !== "playing") return "게임 중이 아닙니다.";
      const state = gs(room);
      if (state.resolving) return "카드를 확인하는 중입니다.";
      if (userId !== state.turnUserId) return "내 턴이 아닙니다.";
      const cardId = String(move);
      const card = cardById(state, cardId);
      if (!card) return "잘못된 카드입니다.";
      if (state.matchedIds.includes(cardId)) return "이미 맞춘 카드입니다.";
      if (state.flippedIds.includes(cardId)) return "이미 선택한 카드입니다.";
      if (state.firstSelectedCard === cardId) return "같은 카드를 다시 선택할 수 없습니다.";
      return null;
    },

    applyMove(room, userId, move) {
      const state = gs(room);
      const cardId = String(move);

      if (state.firstSelectedCard === null) {
        state.firstSelectedCard = cardId;
        state.flippedIds.push(cardId);
        room.moveHistory.push({ userId, cardId, pick: 1 });
        return;
      }

      state.secondSelectedCard = cardId;
      state.flippedIds.push(cardId);
      room.moveHistory.push({ userId, cardId, pick: 2 });

      const a = state.firstSelectedCard;
      const b = cardId;
      const cardA = cardById(state, a)!;
      const cardB = cardById(state, b)!;

      if (cardA.pairId === cardB.pairId) {
        state.matchedIds.push(a, b);
        state.scores[userId] = (state.scores[userId] ?? 0) + 1;
        state.flippedIds = state.flippedIds.filter((id) => id !== a && id !== b);
        state.firstSelectedCard = null;
        state.secondSelectedCard = null;
        return;
      }

      state.resolving = true;
      const timer = setTimeout(() => {
        state.flippedIds = [];
        state.firstSelectedCard = null;
        state.secondSelectedCard = null;
        state.resolving = false;
        state.turnIndex = (state.turnIndex + 1) % state.playerOrder.length;
        state.turnUserId = state.playerOrder[state.turnIndex]!;
        (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
      }, MEMORY_FLIP_BACK_MS);
      room.timers.push(timer);
    },

    checkWin(room) {
      const state = gs(room);
      if (state.matchedIds.length < state.cards.length) return null;
      const entries = Object.entries(state.scores);
      const top = [...entries].sort((a, b) => b[1] - a[1])[0];
      if (!top || top[1] === 0) return { winnerId: "", resultMessage: "무승부" };
      const tied = entries.filter(([, s]) => s === top[1]).length;
      if (tied > 1) return { winnerId: "", resultMessage: "무승부" };
      return { winnerId: top[0], resultMessage: "카드 매칭 승리!" };
    },
  };
}

export const memoryCardsPlugin = createMemoryPlugin("memory-cards", 8);
export const pictureMatchPlugin = createMemoryPlugin("picture-match", 6);
