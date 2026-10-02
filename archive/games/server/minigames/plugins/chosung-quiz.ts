import {
  isQuizAnswerCorrect,
  pickQuizWord,
  type WordQuizEntry,
} from "../../../src/lib/minigames/quiz-words";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

const ROUNDS = 5;
const TURN_MS = 20000;

type ChosungState = {
  round: number;
  scores: Record<string, number>;
  current: WordQuizEntry | null;
  turnUserId: string;
  playerOrder: string[];
  turnIndex: number;
  used: Set<string>;
  turnEndsAt: number | null;
  timer: ReturnType<typeof setInterval> | null;
};

function gs(room: MinigameRoomInternal): ChosungState {
  return room.gameState as ChosungState;
}

function nextRound(state: ChosungState) {
  state.round++;
  state.current = pickQuizWord(state.used);
  state.used.add(state.current.word);
  state.turnIndex = 0;
  state.turnUserId = state.playerOrder[0]!;
  state.turnEndsAt = Date.now() + TURN_MS;
}

function startTimer(room: MinigameRoomInternal, state: ChosungState) {
  if (state.timer) clearInterval(state.timer);
  state.timer = setInterval(() => {
    if (room.status !== "playing") return;
    const left = state.turnEndsAt ? state.turnEndsAt - Date.now() : 0;
    if (left <= 0) {
      state.turnIndex = (state.turnIndex + 1) % state.playerOrder.length;
      state.turnUserId = state.playerOrder[state.turnIndex]!;
      state.turnEndsAt = Date.now() + TURN_MS;
    }
    (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
  }, 1000);
  room.timers.push(state.timer);
}

export const chosungQuizPlugin: MinigamePlugin = {
  id: "chosung-quiz",
  minPlayers: 2,
  maxPlayers: 8,
  maxPlayersPublic: 4,
  autoStartOnPublicMatch: true,

  initGameState(room) {
    const order = [...room.players.keys()];
    for (const p of room.players.values()) p.ready = true;
    const used = new Set<string>();
    const current = pickQuizWord(used);
    used.add(current.word);
    return {
      round: 1,
      scores: Object.fromEntries(order.map((id) => [id, 0])),
      current,
      turnUserId: order[0]!,
      playerOrder: order,
      turnIndex: 0,
      used,
      turnEndsAt: Date.now() + TURN_MS,
      timer: null,
    };
  },

  onGameStart(room) {
    startTimer(room, gs(room));
  },

  toPublicState(room) {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const state = gs(room);
    return {
      ...base,
      game: {
        round: state.round,
        maxRounds: ROUNDS,
        scores: { ...state.scores },
        chosung: state.current?.chosung ?? "",
        hint: state.current?.hints[0] ?? null,
        turnUserId: state.turnUserId,
        timeLeft: state.turnEndsAt ? Math.max(0, Math.ceil((state.turnEndsAt - Date.now()) / 1000)) : 0,
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임 중이 아닙니다.";
    const state = gs(room);
    if (userId !== state.turnUserId) return "내 턴이 아닙니다.";
    const answer = String(move ?? "").trim();
    if (!answer) return "답을 입력하세요.";
    return null;
  },

  applyMove(room, userId, move) {
    const state = gs(room);
    const answer = String(move);
    if (state.current && isQuizAnswerCorrect(answer, state.current.word)) {
      state.scores[userId] = (state.scores[userId] ?? 0) + 1;
      room.moveHistory.push({ userId, answer, correct: true });
      if (state.round >= ROUNDS) return;
      nextRound(state);
    } else {
      state.turnIndex = (state.turnIndex + 1) % state.playerOrder.length;
      state.turnUserId = state.playerOrder[state.turnIndex]!;
      state.turnEndsAt = Date.now() + TURN_MS;
    }
    room.moveHistory.push({ userId, answer, correct: false });
  },

  checkWin(room) {
    const state = gs(room);
    if (state.round > ROUNDS) {
      const top = Object.entries(state.scores).sort((a, b) => b[1] - a[1])[0];
      if (!top) return { winnerId: "", resultMessage: "무승부" };
      const tied = Object.values(state.scores).filter((s) => s === top[1]).length;
      if (tied > 1) return { winnerId: "", resultMessage: "무승부" };
      return { winnerId: top[0], resultMessage: `${top[1]}점 승리` };
    }
    return null;
  },

  clearTimers(room) {
    const state = gs(room);
    if (state.timer) clearInterval(state.timer);
  },
};
