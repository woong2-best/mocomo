import {
  normalizeWordChainWord,
  validateWordChainMove,
  wordChainNextRequiredChar,
  WORD_CHAIN_TURN_MS,
} from "../../../src/lib/minigames/word-chain-dict";
import type { WordChainPublicState } from "../../../src/lib/minigames/shared-types";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type WordChainEntry = {
  userId: string;
  word: string;
  status: "ok" | "fail" | "timeout";
  reason?: string;
  at: number;
};

type WordChainGameState = {
  currentWord: string | null;
  turnIndex: number;
  playerOrder: string[];
  usedWords: string[];
  turnEndsAt: number;
  timer: ReturnType<typeof setInterval> | null;
  history: WordChainEntry[];
  eliminated: string[];
  scores: Record<string, number>;
  streaks: Record<string, number>;
};

function gs(room: MinigameRoomInternal): WordChainGameState {
  return room.gameState as WordChainGameState;
}

function activePlayers(state: WordChainGameState): string[] {
  return state.playerOrder.filter((id) => !state.eliminated.includes(id));
}

function currentTurnUserId(state: WordChainGameState): string | null {
  for (let i = 0; i < state.playerOrder.length; i++) {
    const idx = (state.turnIndex + i) % state.playerOrder.length;
    const id = state.playerOrder[idx]!;
    if (!state.eliminated.includes(id)) return id;
  }
  return null;
}

function advanceTurn(state: WordChainGameState) {
  let idx = state.turnIndex;
  do {
    idx = (idx + 1) % state.playerOrder.length;
  } while (state.eliminated.includes(state.playerOrder[idx]!));
  state.turnIndex = idx;
  state.turnEndsAt = Date.now() + WORD_CHAIN_TURN_MS;
}

function checkWinInternal(room: MinigameRoomInternal) {
  const state = gs(room);
  const active = activePlayers(state);
  if (active.length === 1) {
    const winner = active[0]!;
    const name = room.players.get(winner)?.username ?? "플레이어";
    return { winnerId: winner, resultMessage: `${name} 승리!` };
  }
  return null;
}

function eliminatePlayer(
  room: MinigameRoomInternal,
  state: WordChainGameState,
  userId: string,
  reason: string,
  status: "fail" | "timeout" = "fail",
  word = ""
) {
  if (!state.eliminated.includes(userId)) {
    state.eliminated.push(userId);
  }
  state.streaks[userId] = 0;
  state.history.push({ userId, word, status, reason, at: Date.now() });
  if (activePlayers(state).length > 1) {
    advanceTurn(state);
  }
}

function startTurnTimer(room: MinigameRoomInternal, state: WordChainGameState) {
  if (state.timer) clearInterval(state.timer);
  state.timer = setInterval(() => {
    if (room.status !== "playing") return;
    if (Date.now() >= state.turnEndsAt) {
      const loser = currentTurnUserId(state);
      if (loser) {
        eliminatePlayer(room, state, loser, "시간 초과 탈락", "timeout");
        const win = checkWinInternal(room);
        const finish = (room as MinigameRoomInternal & { _finishGame?: (w: { winnerId: string; resultMessage: string }) => void })
          ._finishGame;
        if (win && finish) finish(win);
      }
    }
    (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
  }, 500);
  room.timers.push(state.timer);
}

export const wordChainPlugin: MinigamePlugin = {
  id: "word-chain",
  minPlayers: 2,
  maxPlayers: 6,
  maxPlayersPublic: 4,
  autoStartOnPublicMatch: true,

  initGameState(room) {
    const order = [...room.players.keys()];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
    for (const p of room.players.values()) p.ready = true;
    return {
      currentWord: null,
      turnIndex: 0,
      playerOrder: order,
      usedWords: [],
      turnEndsAt: Date.now() + WORD_CHAIN_TURN_MS,
      timer: null,
      history: [],
      eliminated: [],
      scores: Object.fromEntries(order.map((id) => [id, 0])),
      streaks: Object.fromEntries(order.map((id) => [id, 0])),
    } satisfies WordChainGameState;
  },

  onGameStart(room) {
    startTurnTimer(room, gs(room));
  },

  clearTimers(room) {
    const state = room.gameState as WordChainGameState | null;
    if (state?.timer) clearInterval(state.timer);
  },

  toPublicState(room): WordChainPublicState {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const state = gs(room);
    const timeLeft = Math.max(0, Math.ceil((state.turnEndsAt - Date.now()) / 1000));
    return {
      ...base,
      game: {
        currentWord: state.currentWord,
        turnUserId: currentTurnUserId(state),
        usedWords: [...state.usedWords],
        timeLeft,
        turnLimit: WORD_CHAIN_TURN_MS / 1000,
        requiredChar: wordChainNextRequiredChar(state.currentWord),
        history: state.history.slice(-24),
        eliminated: [...state.eliminated],
        scores: { ...state.scores },
        playerOrder: state.playerOrder,
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임이 진행 중이 아닙니다.";
    const state = gs(room);
    if (state.eliminated.includes(userId)) return "탈락한 플레이어입니다.";
    if (userId !== currentTurnUserId(state)) return "상대 턴입니다.";
    if (Date.now() > state.turnEndsAt) return "턴 시간이 지났습니다.";
    const word = normalizeWordChainWord(String(move ?? ""));
    if (!word) return "단어를 입력하세요.";
    return validateWordChainMove(word, state.currentWord, state.usedWords);
  },

  applyMove(room, userId, move) {
    const state = gs(room);
    const word = normalizeWordChainWord(String(move));
    state.usedWords.push(word);
    state.currentWord = word;
    state.streaks[userId] = (state.streaks[userId] ?? 0) + 1;
    state.scores[userId] = (state.scores[userId] ?? 0) + state.streaks[userId]!;
    state.history.push({ userId, word, status: "ok", at: Date.now() });
    room.moveHistory.push({ userId, word });
    advanceTurn(state);
    startTurnTimer(room, state);
  },

  onMoveRejected(room, userId, move, reason) {
    const state = gs(room);
    if (userId !== currentTurnUserId(state)) return false;
    const word = normalizeWordChainWord(String(move ?? ""));
    eliminatePlayer(room, state, userId, reason, "fail", word);
    startTurnTimer(room, state);
    return true;
  },

  checkWin(room) {
    return checkWinInternal(room);
  },

  onGameEnd(room) {
    wordChainPlugin.clearTimers?.(room);
  },
};
