import {
  normalizeWordChainWord,
  validateWordChainMove,
} from "../../../src/lib/minigames/word-chain-dict";
import type { WordChainPublicState } from "../../../src/lib/minigames/shared-types";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

const TURN_SECONDS = 30;

type WordChainGameState = {
  currentWord: string | null;
  turnIndex: number;
  playerOrder: string[];
  usedWords: string[];
  turnEndsAt: number | null;
  turnTimer: ReturnType<typeof setInterval> | null;
};

function currentTurnUserId(gs: WordChainGameState): string | null {
  return gs.playerOrder[gs.turnIndex] ?? null;
}

function advanceTurn(room: MinigameRoomInternal, gs: WordChainGameState) {
  gs.turnIndex = (gs.turnIndex + 1) % gs.playerOrder.length;
  gs.turnEndsAt = Date.now() + TURN_SECONDS * 1000;
}

function clearTurnTimer(gs: WordChainGameState) {
  if (gs.turnTimer) {
    clearInterval(gs.turnTimer);
    gs.turnTimer = null;
  }
}

function startTurnTimer(room: MinigameRoomInternal, gs: WordChainGameState, onTick: () => void) {
  clearTurnTimer(gs);
  gs.turnTimer = setInterval(() => {
    if (room.status !== "playing") {
      clearTurnTimer(gs);
      return;
    }
    const left = gs.turnEndsAt ? Math.max(0, Math.ceil((gs.turnEndsAt - Date.now()) / 1000)) : 0;
    if (left <= 0) {
      clearTurnTimer(gs);
      const loser = currentTurnUserId(gs);
      if (loser) {
        room.winnerId = gs.playerOrder.find((id) => id !== loser) ?? null;
        room.resultMessage = "시간 초과 패배";
        room.status = "finished";
      }
    }
    onTick();
  }, 1000);
  room.timers.push(gs.turnTimer);
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
      turnEndsAt: Date.now() + TURN_SECONDS * 1000,
      turnTimer: null,
    } satisfies WordChainGameState;
  },

  onGameStart(room) {
    const gs = room.gameState as WordChainGameState;
    const ioRef = (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast;
    startTurnTimer(room, gs, () => ioRef?.());
  },

  toPublicState(room): WordChainPublicState {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const gs = room.gameState as WordChainGameState;
    const timeLeft = gs.turnEndsAt
      ? Math.max(0, Math.ceil((gs.turnEndsAt - Date.now()) / 1000))
      : 0;
    return {
      ...base,
      game: {
        currentWord: gs.currentWord,
        turnUserId: currentTurnUserId(gs),
        usedWords: [...gs.usedWords],
        turnEndsAt: gs.turnEndsAt,
        timeLeft,
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임이 진행 중이 아닙니다.";
    const gs = room.gameState as WordChainGameState;
    if (userId !== currentTurnUserId(gs)) return "내 턴이 아닙니다.";
    const word = normalizeWordChainWord(String(move ?? ""));
    return validateWordChainMove(word, gs.currentWord, gs.usedWords);
  },

  applyMove(room, userId, move) {
    const gs = room.gameState as WordChainGameState;
    const word = normalizeWordChainWord(String(move));
    gs.usedWords.push(word);
    gs.currentWord = word;
    room.moveHistory.push({ userId, word });
    advanceTurn(room, gs);
    const ioRef = (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast;
    startTurnTimer(room, gs, () => ioRef?.());
  },

  checkWin() {
    return null;
  },

  clearTimers(room) {
    const gs = room.gameState as WordChainGameState | null;
    if (gs) clearTurnTimer(gs);
  },

  onGameEnd(room) {
    this.clearTimers?.(room);
  },
};
