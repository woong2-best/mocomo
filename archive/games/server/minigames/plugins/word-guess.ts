import {
  isQuizAnswerCorrect,
  pickQuizWord,
  type WordQuizEntry,
} from "../../../src/lib/minigames/quiz-words";
import {
  WORD_GUESS_HINT_INTERVAL_SEC,
  WORD_GUESS_MAX_ROUNDS,
  WORD_GUESS_REVEAL_SEC,
  WORD_GUESS_ROUND_SEC,
  computeWordGuessPoints,
  type WordGuessPhase,
  type WordGuessSolveEvent,
} from "../../../src/lib/minigames/word-guess-logic";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type WordGuessState = {
  round: number;
  scores: Record<string, number>;
  current: WordQuizEntry | null;
  used: Set<string>;
  phase: WordGuessPhase;
  revealedHintCount: number;
  roundEndsAt: number;
  nextHintAt: number;
  revealUntil: number | null;
  roundSolved: boolean;
  lastSolve: WordGuessSolveEvent | null;
  timer: ReturnType<typeof setInterval> | null;
};

function gs(room: MinigameRoomInternal): WordGuessState {
  return room.gameState as WordGuessState;
}

function playerName(room: MinigameRoomInternal, userId: string): string {
  return room.players.get(userId)?.username ?? "플레이어";
}

function startRound(state: WordGuessState, entry: WordQuizEntry) {
  state.current = entry;
  state.phase = "playing";
  state.revealedHintCount = 0;
  state.roundSolved = false;
  state.lastSolve = null;
  state.revealUntil = null;
  const now = Date.now();
  state.roundEndsAt = now + WORD_GUESS_ROUND_SEC * 1000;
  state.nextHintAt = now + WORD_GUESS_HINT_INTERVAL_SEC * 1000;
}

function beginReveal(room: MinigameRoomInternal, state: WordGuessState, solve: WordGuessSolveEvent | null) {
  state.phase = "reveal";
  state.roundSolved = true;
  state.lastSolve = solve;
  state.revealUntil = Date.now() + WORD_GUESS_REVEAL_SEC * 1000;
  if (solve) {
    state.scores[solve.userId] = (state.scores[solve.userId] ?? 0) + solve.points;
  }
}

function finishWordGuess(room: MinigameRoomInternal, state: WordGuessState) {
  const entries = Object.entries(state.scores);
  const top = [...entries].sort((a, b) => b[1] - a[1])[0];
  let win: { winnerId: string; resultMessage: string };
  if (!top || top[1] === 0) win = { winnerId: "", resultMessage: "무승부" };
  else {
    const tied = entries.filter(([, s]) => s === top[1]).length;
    win =
      tied > 1
        ? { winnerId: "", resultMessage: "무승부" }
        : { winnerId: top[0], resultMessage: `${top[1]}점 승리!` };
  }
  (room as MinigameRoomInternal & { _finishGame?: (w: typeof win) => void })._finishGame?.(win);
}

function advanceAfterReveal(room: MinigameRoomInternal, state: WordGuessState) {
  if (state.round >= WORD_GUESS_MAX_ROUNDS) {
    finishWordGuess(room, state);
    return;
  }
  state.round++;
  const entry = pickQuizWord(state.used);
  state.used.add(entry.word);
  startRound(state, entry);
}

function tick(room: MinigameRoomInternal) {
  if (room.status !== "playing") return;
  const state = gs(room);
  const now = Date.now();

  if (state.phase === "playing") {
    if (
      !state.roundSolved &&
      state.revealedHintCount < (state.current?.hints.length ?? 0) &&
      now >= state.nextHintAt
    ) {
      state.revealedHintCount++;
      state.nextHintAt = now + WORD_GUESS_HINT_INTERVAL_SEC * 1000;
    }
    if (!state.roundSolved && now >= state.roundEndsAt) {
      beginReveal(room, state, null);
    }
  }

  if (state.phase === "reveal" && state.revealUntil && now >= state.revealUntil) {
    advanceAfterReveal(room, state);
  }

  (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
}

function startTimer(room: MinigameRoomInternal, state: WordGuessState) {
  if (state.timer) clearInterval(state.timer);
  state.timer = setInterval(() => tick(room), 1000);
  room.timers.push(state.timer);
}

export const wordGuessPlugin: MinigamePlugin = {
  id: "word-guess",
  minPlayers: 2,
  maxPlayers: 8,
  maxPlayersPublic: 6,
  autoStartOnPublicMatch: true,

  initGameState(room) {
    const order = [...room.players.keys()];
    for (const p of room.players.values()) p.ready = true;
    const used = new Set<string>();
    const current = pickQuizWord(used);
    used.add(current.word);
    const state: WordGuessState = {
      round: 1,
      scores: Object.fromEntries(order.map((id) => [id, 0])),
      current,
      used,
      phase: "playing",
      revealedHintCount: 0,
      roundEndsAt: Date.now() + WORD_GUESS_ROUND_SEC * 1000,
      nextHintAt: Date.now() + WORD_GUESS_HINT_INTERVAL_SEC * 1000,
      revealUntil: null,
      roundSolved: false,
      lastSolve: null,
      timer: null,
    };
    return state;
  },

  onGameStart(room) {
    startTimer(room, gs(room));
  },

  toPublicState(room) {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const state = gs(room);
    const current = state.current;
    const now = Date.now();
    const timeLeft =
      state.phase === "playing"
        ? Math.max(0, Math.ceil((state.roundEndsAt - now) / 1000))
        : Math.max(0, Math.ceil(((state.revealUntil ?? now) - now) / 1000));
    const nextHintIn =
      state.phase === "playing" && !state.roundSolved
        ? Math.max(0, Math.ceil((state.nextHintAt - now) / 1000))
        : 0;
    const hints = current?.hints ?? [];
    const revealedHints = hints.slice(0, state.revealedHintCount);

    return {
      ...base,
      game: {
        round: state.round,
        maxRounds: WORD_GUESS_MAX_ROUNDS,
        category: current?.category ?? "",
        letterCount: current?.word.length ?? 0,
        revealedHints,
        totalHints: hints.length,
        timeLeft,
        nextHintIn,
        phase: state.phase,
        scores: { ...state.scores },
        roundSolved: state.roundSolved,
        answer:
          state.phase === "reveal" || room.status === "finished" ? (current?.word ?? null) : null,
        lastSolve: state.lastSolve,
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임 중이 아닙니다.";
    const state = gs(room);
    if (state.phase !== "playing" || state.roundSolved) return "이번 문제는 종료되었습니다.";
    const answer = String(move ?? "").trim();
    if (!answer) return "답을 입력하세요.";
    return null;
  },

  applyMove(room, userId, move) {
    const state = gs(room);
    const answer = String(move).trim();
    const word = state.current?.word;
    if (!word || state.roundSolved || state.phase !== "playing") return;

    if (!isQuizAnswerCorrect(answer, word)) {
      room.moveHistory.push({ userId, answer, correct: false });
      return;
    }

    const timeLeft = Math.max(0, Math.ceil((state.roundEndsAt - Date.now()) / 1000));
    const points = computeWordGuessPoints(timeLeft, state.revealedHintCount);
    const solve: WordGuessSolveEvent = {
      userId,
      username: playerName(room, userId),
      points,
      answer: word,
      at: Date.now(),
    };
    beginReveal(room, state, solve);
    room.moveHistory.push({ userId, answer, correct: true, points });
  },

  checkWin() {
    return null;
  },

  clearTimers(room) {
    const state = gs(room);
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
  },
};
