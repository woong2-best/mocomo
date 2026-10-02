import { pickSecretNumber } from "../../../src/lib/minigames/quiz-words";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type NumberGuessState = {
  secret: number;
  min: number;
  max: number;
  turnUserId: string;
  playerOrder: string[];
  turnIndex: number;
  guesses: { userId: string; value: number; hint: string }[];
  maxGuesses: number;
};

function gs(room: MinigameRoomInternal): NumberGuessState {
  return room.gameState as NumberGuessState;
}

export const numberGuessPlugin: MinigamePlugin = {
  id: "number-guess",
  minPlayers: 2,
  maxPlayers: 6,
  maxPlayersPublic: 4,
  autoStartOnPublicMatch: true,

  initGameState(room) {
    const order = [...room.players.keys()];
    for (const p of room.players.values()) p.ready = true;
    return {
      secret: pickSecretNumber(1, 100),
      min: 1,
      max: 100,
      turnUserId: order[0]!,
      playerOrder: order,
      turnIndex: 0,
      guesses: [],
      maxGuesses: 10,
    };
  },

  toPublicState(room) {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const state = gs(room);
    return {
      ...base,
      game: {
        min: state.min,
        max: state.max,
        turnUserId: state.turnUserId,
        guesses: state.guesses,
        maxGuesses: state.maxGuesses,
        remaining: state.maxGuesses - state.guesses.length,
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임 중이 아닙니다.";
    const state = gs(room);
    if (userId !== state.turnUserId) return "내 턴이 아닙니다.";
    const value = Number(move);
    if (!Number.isInteger(value)) return "정수를 입력하세요";
    if (value < state.min || value > state.max) return `${state.min}~${state.max} 범위`;
    if (state.guesses.length >= state.maxGuesses) return "기회 소진";
    return null;
  },

  applyMove(room, userId, move) {
    const state = gs(room);
    const value = Number(move);
    let hint = "정답!";
    if (value < state.secret) {
      hint = "UP";
      state.min = Math.max(state.min, value + 1);
    } else if (value > state.secret) {
      hint = "DOWN";
      state.max = Math.min(state.max, value - 1);
    } else {
      room.winnerId = userId;
      room.status = "finished";
      room.resultMessage = `${value} 정답!`;
    }
    state.guesses.push({ userId, value, hint });
    state.turnIndex = (state.turnIndex + 1) % state.playerOrder.length;
    state.turnUserId = state.playerOrder[state.turnIndex]!;
    room.moveHistory.push({ userId, value, hint });
  },

  checkWin(room) {
    if (room.winnerId) return { winnerId: room.winnerId, resultMessage: room.resultMessage ?? "승리" };
    const state = gs(room);
    if (state.guesses.length >= state.maxGuesses) {
      return { winnerId: "", resultMessage: `패배 · 정답: ${state.secret}` };
    }
    return null;
  },
};
