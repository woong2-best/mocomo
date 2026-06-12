import { pickQuizWord, normalizeQuizAnswer } from "../../../src/lib/minigames/quiz-words";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

const MAX_GUESSES = 6;

type WordGuessState = {
  secret: string;
  guesses: { userId: string; word: string; feedback: string }[];
  turnUserId: string;
  playerOrder: string[];
  turnIndex: number;
  scores: Record<string, number>;
};

function feedback(secret: string, guess: string): string {
  const s = normalizeQuizAnswer(secret);
  const g = normalizeQuizAnswer(guess);
  let out = "";
  for (let i = 0; i < g.length; i++) {
    if (g[i] === s[i]) out += "G";
    else if (s.includes(g[i]!)) out += "Y";
    else out += "X";
  }
  return out;
}

function gs(room: MinigameRoomInternal): WordGuessState {
  return room.gameState as WordGuessState;
}

export const wordGuessPlugin: MinigamePlugin = {
  id: "word-guess",
  minPlayers: 2,
  maxPlayers: 6,
  maxPlayersPublic: 4,
  autoStartOnPublicMatch: true,

  initGameState(room) {
    const order = [...room.players.keys()];
    for (const p of room.players.values()) p.ready = true;
    const entry = pickQuizWord(new Set());
    return {
      secret: entry.word,
      guesses: [],
      turnUserId: order[0]!,
      playerOrder: order,
      turnIndex: 0,
      scores: Object.fromEntries(order.map((id) => [id, 0])),
    };
  },

  toPublicState(room) {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const state = gs(room);
    return {
      ...base,
      game: {
        guesses: state.guesses,
        turnUserId: state.turnUserId,
        maxGuesses: MAX_GUESSES,
        hint: state.guesses.length === 0 ? "한글 단어를 맞혀보세요" : null,
        scores: state.scores,
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임 중이 아닙니다.";
    const state = gs(room);
    if (userId !== state.turnUserId) return "내 턴이 아닙니다.";
    const word = String(move ?? "").trim();
    if (word.length < 2) return "2글자 이상";
    if (state.guesses.length >= MAX_GUESSES * state.playerOrder.length) return "기회 소진";
    return null;
  },

  applyMove(room, userId, move) {
    const state = gs(room);
    const word = String(move);
    const fb = feedback(state.secret, word);
    state.guesses.push({ userId, word, feedback: fb });
    if (normalizeQuizAnswer(word) === normalizeQuizAnswer(state.secret)) {
      state.scores[userId] = (state.scores[userId] ?? 0) + 1;
      room.winnerId = userId;
      room.status = "finished";
      room.resultMessage = "정답!";
      return;
    }
    state.turnIndex = (state.turnIndex + 1) % state.playerOrder.length;
    state.turnUserId = state.playerOrder[state.turnIndex]!;
    room.moveHistory.push({ userId, word, feedback: fb });
  },

  checkWin(room) {
    const state = gs(room);
    if (room.winnerId) return { winnerId: room.winnerId, resultMessage: room.resultMessage ?? "승리" };
    if (state.guesses.length >= MAX_GUESSES * state.playerOrder.length) {
      return { winnerId: "", resultMessage: `패배 · 정답: ${state.secret}` };
    }
    return null;
  },
};
