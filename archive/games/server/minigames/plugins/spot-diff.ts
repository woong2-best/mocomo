import {
  SPOT_DIFF_COMBO_WINDOW_MS,
  SPOT_DIFF_HINT_PENALTY_MS,
  SPOT_DIFF_INFINITE_BONUS_MS,
  SPOT_DIFF_INFINITE_TIME_MS,
  SPOT_DIFF_TIME_MS,
  SPOT_DIFF_WRONG_PENALTY_MS,
  buildSpotResultMessage,
  computeSpotScore,
  findSpotHit,
  formatSpotTime,
  isNearFoundSpot,
  pickHintTarget,
  spotDiffMode,
  type SpotDiffMode,
  type SpotDiffPlayStyle,
  type SpotDiffPuzzle,
} from "../../../src/lib/minigames/spot-diff-logic";
import { pickCatalogPuzzle, pickNextInfinitePuzzle } from "../../../src/lib/minigames/spot-diff-catalog";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type SpotState = {
  puzzle: SpotDiffPuzzle;
  foundIds: number[];
  foundBy: Record<number, string>;
  scores: Record<string, number>;
  combos: Record<string, number>;
  lastHitAt: Record<string, number>;
  wrongCounts: Record<string, number>;
  hintsUsed: Record<string, number>;
  hintFlash: { x: number; y: number; until: number } | null;
  mode: SpotDiffMode;
  playStyle: SpotDiffPlayStyle;
  round: number;
  puzzlesCleared: number;
  usedPuzzleIds: string[];
  startedAt: number;
  endsAt: number;
  pausedAt: number | null;
  lastFeedback: { userId: string; ok: boolean; message: string } | null;
  timer: ReturnType<typeof setInterval> | null;
};

function gs(room: MinigameRoomInternal): SpotState {
  return room.gameState as SpotState;
}

function playStyleOf(room: MinigameRoomInternal): SpotDiffPlayStyle {
  return room.spotDiffPlayStyle === "infinite" ? "infinite" : "normal";
}

function appendSummary(room: MinigameRoomInternal, state: SpotState) {
  const uid = [...room.players.keys()][0];
  if (!uid) return;
  room.moveHistory.push({
    type: "spot_summary",
    userId: uid,
    playStyle: state.playStyle,
    round: state.round,
    puzzlesCleared: state.puzzlesCleared,
    totalScore: state.scores[uid] ?? 0,
    hintsUsed: state.hintsUsed[uid] ?? 0,
    wrongCount: state.wrongCounts[uid] ?? 0,
    elapsedMs: Date.now() - state.startedAt,
    cleared: state.puzzlesCleared > 0,
  });
}

function finishSpot(room: MinigameRoomInternal, state: SpotState, allFound: boolean) {
  appendSummary(room, state);
  const finish = (room as MinigameRoomInternal & { _finishGame?: (w: { winnerId: string; resultMessage: string }) => void })
    ._finishGame;
  if (!finish) return;
  const names = Object.fromEntries([...room.players.values()].map((p) => [p.userId, p.username]));
  const elapsed = Date.now() - state.startedAt;

  if (state.playStyle === "infinite") {
    const uid = [...room.players.keys()][0] ?? "";
    finish({
      winnerId: uid,
      resultMessage: `무한 모드 · ${state.puzzlesCleared}판 클리어 · ${formatSpotTime(elapsed)} · ${state.scores[uid] ?? 0}점`,
    });
    return;
  }

  const result = buildSpotResultMessage(state.mode, state.scores, names, elapsed, allFound);
  finish(result);
}

function advanceInfiniteRound(room: MinigameRoomInternal, state: SpotState, userId: string) {
  const clearedTitle = state.puzzle.title ?? state.puzzle.theme;
  const clearedId = state.puzzle.puzzleId ?? `seed-${state.puzzle.seed}`;
  state.puzzlesCleared++;
  state.usedPuzzleIds.push(clearedId);
  state.puzzle = pickNextInfinitePuzzle(state.usedPuzzleIds);
  state.round++;
  state.foundIds = [];
  state.foundBy = {};
  state.hintFlash = null;
  state.endsAt += SPOT_DIFF_INFINITE_BONUS_MS;
  state.lastFeedback = {
    userId,
    ok: true,
    message: `${clearedTitle} 클리어! +${SPOT_DIFF_INFINITE_BONUS_MS / 1000}초 · ${state.puzzle.title ?? state.puzzle.theme}`,
  };
  room.moveHistory.push({
    userId,
    type: "spot_round_clear",
    round: state.puzzlesCleared,
    puzzleId: clearedId,
  });
}

function timeLeftMs(state: SpotState): number {
  if (state.pausedAt) return Math.max(0, state.endsAt - state.pausedAt);
  return Math.max(0, state.endsAt - Date.now());
}

function startTimer(room: MinigameRoomInternal, state: SpotState) {
  if (state.timer) clearInterval(state.timer);
  state.timer = setInterval(() => {
    if (room.status !== "playing") return;
    if (state.pausedAt) {
      (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
      return;
    }
    if (Date.now() >= state.endsAt) {
      finishSpot(room, state, state.foundIds.length >= state.puzzle.differences.length);
      (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
      return;
    }
    if (state.hintFlash && state.hintFlash.until <= Date.now()) {
      state.hintFlash = null;
    }
    (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
  }, 250);
  room.timers.push(state.timer);
}

function initPuzzle(room: MinigameRoomInternal, playerCount: number): SpotDiffPuzzle {
  const playStyle = playStyleOf(room);
  if (playStyle === "infinite") {
    return pickNextInfinitePuzzle([]);
  }
  const diffCount = playerCount >= 3 ? 10 : playerCount === 1 ? 7 : 7;
  return pickCatalogPuzzle({ excludeIds: [] });
}

export const spotDiffPlugin: MinigamePlugin = {
  id: "spot-diff",
  minPlayers: 1,
  maxPlayers: 8,
  maxPlayersPublic: 8,
  autoStartOnPublicMatch: true,

  initGameState(room) {
    const order = [...room.players.keys()];
    for (const p of room.players.values()) p.ready = true;
    const playStyle = playStyleOf(room);
    const puzzle = initPuzzle(room, order.length);
    const now = Date.now();
    const limit = playStyle === "infinite" ? SPOT_DIFF_INFINITE_TIME_MS : SPOT_DIFF_TIME_MS;
    return {
      puzzle,
      foundIds: [],
      foundBy: {},
      scores: Object.fromEntries(order.map((id) => [id, 0])),
      combos: Object.fromEntries(order.map((id) => [id, 0])),
      lastHitAt: Object.fromEntries(order.map((id) => [id, 0])),
      wrongCounts: Object.fromEntries(order.map((id) => [id, 0])),
      hintsUsed: Object.fromEntries(order.map((id) => [id, 0])),
      hintFlash: null,
      mode: playStyle === "infinite" ? "solo" : spotDiffMode(order.length),
      playStyle,
      round: 1,
      puzzlesCleared: 0,
      usedPuzzleIds: [],
      startedAt: now,
      endsAt: now + limit,
      pausedAt: null,
      lastFeedback: null,
      timer: null,
    } satisfies SpotState;
  },

  onGameStart(room) {
    startTimer(room, gs(room));
  },

  clearTimers(room) {
    const state = room.gameState as SpotState | null;
    if (state?.timer) clearInterval(state.timer);
  },

  toPublicState(room) {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const state = gs(room);
    const { puzzle } = state;
    const found = state.foundIds
      .map((id) => {
        const d = puzzle.differences.find((x) => x.id === id);
        if (!d) return null;
        return {
          id,
          x: d.x,
          y: d.y,
          radius: d.radius,
          foundBy: state.foundBy[id],
        };
      })
      .filter(Boolean);

    const feedback =
      state.lastFeedback && room.status === "playing" ? state.lastFeedback : null;

    return {
      ...base,
      game: {
        width: puzzle.width,
        height: puzzle.height,
        left: puzzle.left,
        right: puzzle.right,
        imageLeft: puzzle.imageLeft,
        imageRight: puzzle.imageRight,
        puzzleTitle: puzzle.title ?? puzzle.theme,
        puzzleId: puzzle.puzzleId,
        difficulty: puzzle.difficulty,
        theme: puzzle.theme,
        found,
        totalDiffs: puzzle.differences.length,
        scores: { ...state.scores },
        combos: { ...state.combos },
        wrongCounts: { ...state.wrongCounts },
        hintsUsed: { ...state.hintsUsed },
        hintFlash: state.hintFlash,
        mode: state.mode,
        playStyle: state.playStyle,
        round: state.round,
        puzzlesCleared: state.puzzlesCleared,
        timeLeftMs: timeLeftMs(state),
        paused: !!state.pausedAt,
        lastFeedback: feedback,
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임 중이 아닙니다.";
    const state = gs(room);
    if (state.pausedAt) return "일시정지 중입니다.";
    if (!room.players.has(userId)) return "플레이어가 아닙니다.";

    const m = move as {
      x?: number;
      y?: number;
      side?: string;
      hint?: boolean;
      pause?: boolean;
      resume?: boolean;
    };

    if (m.pause || m.resume || m.hint) return null;

    if (typeof m.x !== "number" || typeof m.y !== "number") return "좌표 오류";
    if (m.x < 0 || m.y < 0 || m.x > state.puzzle.width || m.y > state.puzzle.height) {
      return "범위를 벗어났습니다.";
    }
    if (isNearFoundSpot(state.puzzle.differences, state.foundIds, m.x, m.y)) {
      return "이미 찾은 곳입니다.";
    }
    return null;
  },

  applyMove(room, userId, move) {
    const state = gs(room);
    const m = move as {
      x?: number;
      y?: number;
      side?: "left" | "right";
      hint?: boolean;
      pause?: boolean;
      resume?: boolean;
    };

    if (m.pause) {
      if (!state.pausedAt) state.pausedAt = Date.now();
      return;
    }

    if (m.resume) {
      if (state.pausedAt) {
        const pausedFor = Date.now() - state.pausedAt;
        state.endsAt += pausedFor;
        state.pausedAt = null;
      }
      return;
    }

    if (m.hint) {
      const target = pickHintTarget(state.puzzle.differences, state.foundIds);
      if (!target) return;
      state.hintsUsed[userId] = (state.hintsUsed[userId] ?? 0) + 1;
      state.endsAt = Math.max(Date.now() + 5000, state.endsAt - SPOT_DIFF_HINT_PENALTY_MS);
      state.hintFlash = { x: target.x, y: target.y, until: Date.now() + 4000 };
      state.lastFeedback = { userId, ok: true, message: "힌트 — 차이점 위치 표시" };
      room.moveHistory.push({ userId, hint: true, x: target.x, y: target.y });
      return;
    }

    const hit = findSpotHit(state.puzzle.differences, state.foundIds, m.x!, m.y!);
    if (hit) {
      state.foundIds.push(hit.id);
      state.foundBy[hit.id] = userId;
      const now = Date.now();
      const prev = state.lastHitAt[userId] ?? 0;
      const combo =
        now - prev <= SPOT_DIFF_COMBO_WINDOW_MS ? (state.combos[userId] ?? 0) + 1 : 1;
      state.combos[userId] = combo;
      state.lastHitAt[userId] = now;
      const pts = computeSpotScore(combo);
      state.scores[userId] = (state.scores[userId] ?? 0) + pts;
      state.lastFeedback = {
        userId,
        ok: true,
        message: `정답! +${pts}점${combo > 1 ? ` (${combo}콤보)` : ""}`,
      };
      room.moveHistory.push({
        userId,
        x: hit.x,
        y: hit.y,
        side: m.side,
        id: hit.id,
        points: pts,
      });

      if (state.foundIds.length >= state.puzzle.differences.length) {
        if (state.playStyle === "infinite") {
          advanceInfiniteRound(room, state, userId);
        } else {
          finishSpot(room, state, true);
        }
      }
      return;
    }

    state.wrongCounts[userId] = (state.wrongCounts[userId] ?? 0) + 1;
    state.combos[userId] = 0;
    state.endsAt = Math.max(Date.now() + 3000, state.endsAt - SPOT_DIFF_WRONG_PENALTY_MS);
    state.lastFeedback = {
      userId,
      ok: false,
      message: `오답 · −${SPOT_DIFF_WRONG_PENALTY_MS / 1000}초`,
    };
    room.moveHistory.push({ userId, x: m.x, y: m.y, side: m.side, miss: true });

    if (Date.now() >= state.endsAt) {
      finishSpot(room, state, false);
    }
  },

  checkWin(room) {
    if (room.status !== "finished") return null;
    return {
      winnerId: room.winnerId ?? "",
      resultMessage: room.resultMessage ?? "종료",
    };
  },

  onGameEnd(room) {
    spotDiffPlugin.clearTimers?.(room);
  },
};
