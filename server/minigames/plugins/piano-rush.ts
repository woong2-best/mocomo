import { pickChart } from "../../../src/lib/minigames/piano-rush-charts";
import {
  PIANO_RUSH_ATTACK_COMBO,
  PIANO_RUSH_ATTACK_MS,
  PIANO_RUSH_COUNTDOWN_MS,
  accuracyPct,
  applyJudge,
  buildPianoResultMessage,
  emptyPlayerStats,
  findNote,
  judgeHit,
  noteMissDeadlineMs,
  pianoRushModeFromPlayers,
  registerMiss,
  type PianoChart,
  type PianoPlayerStats,
  type PianoRushMode,
  type PianoRushMove,
} from "../../../src/lib/minigames/piano-rush-logic";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type PianoPhase = "countdown" | "playing" | "finished";

type PianoState = {
  chart: PianoChart;
  mode: PianoRushMode;
  phase: PianoPhase;
  startedAt: number;
  endsAt: number;
  stats: Record<string, PianoPlayerStats>;
  lastFeedback: Record<string, { judge: string; message: string } | null>;
  timer: ReturnType<typeof setInterval> | null;
};

function gs(room: MinigameRoomInternal): PianoState {
  return room.gameState as PianoState;
}

function modeOf(room: MinigameRoomInternal, count: number): PianoRushMode {
  const req = room.pianoRushMode;
  return pianoRushModeFromPlayers(count, req);
}

function songElapsed(state: PianoState): number {
  if (state.phase === "countdown") return 0;
  return Math.max(0, Date.now() - state.startedAt);
}

function finishGame(room: MinigameRoomInternal, state: PianoState) {
  if (state.phase === "finished") return;
  state.phase = "finished";
  const finish = (room as MinigameRoomInternal & { _finishGame?: (w: { winnerId: string; resultMessage: string }) => void })
    ._finishGame;
  if (!finish) return;
  const names = Object.fromEntries([...room.players.values()].map((p) => [p.userId, p.username]));
  const result = buildPianoResultMessage(state.mode, state.stats, names, state.chart.title);
  finish(result);

  for (const [uid, st] of Object.entries(state.stats)) {
    room.moveHistory.push({
      type: "piano_summary",
      userId: uid,
      mode: state.mode,
      chartId: state.chart.id,
      chartTitle: state.chart.title,
      score: st.score,
      maxCombo: st.maxCombo,
      accuracy: accuracyPct(st),
      perfect: st.perfect,
      great: st.great,
      good: st.good,
      miss: st.miss,
    });
  }
}

function scanAutoMiss(room: MinigameRoomInternal, state: PianoState) {
  const elapsed = songElapsed(state);
  for (const uid of room.players.keys()) {
    const st = state.stats[uid];
    if (!st || st.eliminated) continue;
    for (const note of state.chart.notes) {
      if (st.hitNotes.includes(note.id)) continue;
      if (note.type === "long" && st.longStarted[note.id]) continue;
      if (elapsed <= noteMissDeadlineMs(note)) continue;
      const next = registerMiss({ ...st, hitNotes: [...st.hitNotes] }, state.mode);
      next.hitNotes = [...next.hitNotes, note.id];
      state.stats[uid] = next;
      state.lastFeedback[uid] = { judge: "MISS", message: "MISS (타임아웃)" };
      if (state.mode === "battle" && next.eliminated) {
        const alive = [...room.players.keys()].filter((id) => !state.stats[id]?.eliminated);
        if (alive.length <= 1 && state.phase === "playing") {
          finishGame(room, state);
          return;
        }
      }
    }
  }
}

function startTimer(room: MinigameRoomInternal, state: PianoState) {
  if (state.timer) clearInterval(state.timer);
  state.timer = setInterval(() => {
    if (room.status !== "playing") return;
    const now = Date.now();
    if (state.phase === "countdown" && now >= state.startedAt) {
      state.phase = "playing";
      state.endsAt = state.startedAt + state.chart.durationMs;
    }
    if (state.phase === "playing") {
      scanAutoMiss(room, state);
      if (now >= state.endsAt) finishGame(room, state);
    }
    (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
  }, 120);
  room.timers.push(state.timer);
}

function playerStatsPublic(st: PianoPlayerStats) {
  return {
    score: st.score,
    combo: st.combo,
    maxCombo: st.maxCombo,
    perfect: st.perfect,
    great: st.great,
    good: st.good,
    miss: st.miss,
    accuracy: accuracyPct(st),
    lives: st.lives,
    eliminated: st.eliminated,
    hitNotes: st.hitNotes,
    debuffShakeUntil: st.debuffShakeUntil,
    debuffSpeedUntil: st.debuffSpeedUntil,
  };
}

export const pianoRushPlugin: MinigamePlugin = {
  id: "piano-rush",
  minPlayers: 1,
  maxPlayers: 50,
  maxPlayersPublic: 20,
  autoStartOnPublicMatch: true,

  initGameState(room) {
    const order = [...room.players.keys()];
    for (const p of room.players.values()) p.ready = true;
    const mode = modeOf(room, order.length);
    const chart = pickChart({ chartId: room.pianoRushChartId });
    const now = Date.now();
    const startedAt = now + PIANO_RUSH_COUNTDOWN_MS;
    return {
      chart,
      mode,
      phase: "countdown" as PianoPhase,
      startedAt,
      endsAt: startedAt + chart.durationMs,
      stats: Object.fromEntries(order.map((id) => [id, emptyPlayerStats(mode)])),
      lastFeedback: Object.fromEntries(order.map((id) => [id, null])),
      timer: null,
    } satisfies PianoState;
  },

  onGameStart(room) {
    startTimer(room, gs(room));
  },

  clearTimers(room) {
    const state = room.gameState as PianoState | null;
    if (state?.timer) clearInterval(state.timer);
  },

  toPublicState(room) {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const state = gs(room);
    const elapsed = songElapsed(state);
    const statsPublic = Object.fromEntries(
      Object.entries(state.stats).map(([id, st]) => [id, playerStatsPublic(st)])
    );
    return {
      ...base,
      game: {
        chartId: state.chart.id,
        chartTitle: state.chart.title,
        chartArtist: state.chart.artist,
        category: state.chart.category,
        difficulty: state.chart.difficulty,
        bpm: state.chart.bpm,
        durationMs: state.chart.durationMs,
        notes: state.chart.notes,
        audioUrl: state.chart.audioUrl,
        audioOffsetMs: state.chart.audioOffsetMs,
        license: state.chart.license,
        mode: state.mode,
        phase: state.phase,
        startedAt: state.startedAt,
        endsAt: state.endsAt,
        elapsedMs: elapsed,
        timeLeftMs: Math.max(0, state.endsAt - Date.now()),
        stats: statsPublic,
        lastFeedback: state.lastFeedback,
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임 중이 아닙니다.";
    const state = gs(room);
    if (state.phase !== "playing") return "아직 시작 전입니다.";
    const st = state.stats[userId];
    if (!st || st.eliminated) return "플레이 불가";
    if (!room.players.has(userId)) return "플레이어가 아닙니다.";

    const m = move as PianoRushMove;
    if (m.type === "attack") return null;

    if (typeof m.atMs !== "number" || typeof m.lane !== "number") return "입력 오류";
    if (m.lane < 0 || m.lane > 3) return "레인 오류";
    if (!m.noteId) return "노트 오류";

    const note = findNote(state.chart, m.noteId);
    if (!note) return "알 수 없는 노트";
    if (note.lane !== m.lane) return "레인 불일치";
    if (st.hitNotes.includes(m.noteId) && m.type !== "spam" && m.type !== "long_end") {
      return "이미 처리된 노트";
    }
    return null;
  },

  applyMove(room, userId, move) {
    const state = gs(room);
    const m = move as PianoRushMove;
    const st = state.stats[userId]!;

    if (m.type === "attack") {
      if (st.combo < PIANO_RUSH_ATTACK_COMBO) return;
      st.combo = 0;
      const until = Date.now() + PIANO_RUSH_ATTACK_MS;
      for (const oid of room.players.keys()) {
        if (oid === userId) continue;
        const o = state.stats[oid];
        if (!o || o.eliminated) continue;
        o.debuffShakeUntil = until;
        o.debuffSpeedUntil = until;
      }
      state.lastFeedback[userId] = { judge: "ATTACK", message: "공격! 상대 화면 흔들림" };
      room.moveHistory.push({ userId, type: "piano_attack" });
      return;
    }

    const note = findNote(state.chart, m.noteId)!;
    const elapsed = songElapsed(state);

    if (note.type === "bomb" && m.type === "tap") {
      const next = registerMiss(st, state.mode);
      next.hitNotes = [...st.hitNotes, m.noteId];
      state.stats[userId] = next;
      state.lastFeedback[userId] = { judge: "MISS", message: "폭탄! MISS" };
      room.moveHistory.push({ userId, noteId: m.noteId, bomb: true });
      if (state.mode === "battle" && next.eliminated) {
        const alive = [...room.players.keys()].filter((id) => !state.stats[id]?.eliminated);
        if (alive.length <= 1) finishGame(room, state);
      }
      return;
    }

    if (note.type === "spam" && m.type === "spam") {
      const need = note.taps ?? 3;
      const prog = (st.spamProgress[m.noteId] ?? 0) + 1;
      st.spamProgress[m.noteId] = prog;
      if (prog < need) {
        state.lastFeedback[userId] = { judge: "SPAM", message: `${prog}/${need}` };
        return;
      }
      const judge = judgeHit(note.t, m.atMs);
      if (judge === "MISS") {
        state.stats[userId] = registerMiss(st, state.mode);
        st.hitNotes.push(m.noteId);
        state.lastFeedback[userId] = { judge: "MISS", message: "MISS" };
      } else {
        state.stats[userId] = applyJudge(st, judge);
        st.hitNotes.push(m.noteId);
        state.lastFeedback[userId] = { judge, message: `${judge} +${st.score}` };
      }
      room.moveHistory.push({ userId, noteId: m.noteId, type: "spam", judge });
      return;
    }

    if (note.type === "long") {
      if (m.type === "long_start") {
        const judge = judgeHit(note.t, m.atMs);
        if (judge === "MISS") {
          state.stats[userId] = registerMiss(st, state.mode);
          st.hitNotes.push(m.noteId);
          state.lastFeedback[userId] = { judge: "MISS", message: "MISS" };
        } else {
          st.longStarted[m.noteId] = m.atMs;
          state.lastFeedback[userId] = { judge, message: `${judge} (홀드)` };
        }
        return;
      }
      if (m.type === "long_end") {
        if (!st.longStarted[m.noteId]) return;
        const endT = note.t + (note.dur ?? 500);
        const judge = judgeHit(endT, m.atMs);
        if (judge === "MISS") {
          state.stats[userId] = registerMiss(st, state.mode);
        } else {
          state.stats[userId] = applyJudge(st, judge);
        }
        st.hitNotes.push(m.noteId);
        delete st.longStarted[m.noteId];
        state.lastFeedback[userId] = { judge, message: `${judge} (롱)` };
        room.moveHistory.push({ userId, noteId: m.noteId, type: "long", judge });
        return;
      }
      return;
    }

    if (note.type === "slide" && m.type === "slide") {
      if (m.dir !== note.dir) {
        state.stats[userId] = registerMiss(st, state.mode);
        st.hitNotes.push(m.noteId);
        state.lastFeedback[userId] = { judge: "MISS", message: "슬라이드 방향 MISS" };
        return;
      }
      const judge = judgeHit(note.t, m.atMs);
      if (judge === "MISS") {
        state.stats[userId] = registerMiss(st, state.mode);
      } else {
        state.stats[userId] = applyJudge(st, judge);
      }
      st.hitNotes.push(m.noteId);
      state.lastFeedback[userId] = { judge, message: `${judge} (슬라이드)` };
      room.moveHistory.push({ userId, noteId: m.noteId, type: "slide", judge });
      return;
    }

    if (m.type === "tap" && note.type === "tap") {
      const judge = judgeHit(note.t, m.atMs);
      if (judge === "MISS") {
        state.stats[userId] = registerMiss(st, state.mode);
      } else {
        state.stats[userId] = applyJudge(st, judge);
      }
      st.hitNotes.push(m.noteId);
      state.lastFeedback[userId] = { judge, message: judge };
      room.moveHistory.push({ userId, noteId: m.noteId, type: "tap", judge, atMs: m.atMs });
    }
  },

  checkWin(room) {
    if (room.status !== "finished") return null;
    return { winnerId: room.winnerId ?? "", resultMessage: room.resultMessage ?? "종료" };
  },

  onGameEnd(room) {
    pianoRushPlugin.clearTimers?.(room);
  },
};
