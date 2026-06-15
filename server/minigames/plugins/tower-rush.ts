import {
  TOWER_RUSH_COUNTDOWN_MS,
  TOWER_RUSH_FRAME_RECORD_MS,
  TOWER_RUSH_GAME_MS,
  TOWER_RUSH_TICK_MS,
  assignRanks,
  buildTowerResultMessage,
  emptyPlayerStats,
  isTowerInstantPlayMode,
  normalizeTowerInput,
  pickTowerMap,
  placeBlock,
  shouldFinishTowerGame,
  statsPublic,
  stepMover,
  towerModeFromPlayers,
  MAP_LABELS,
  type PlayerTowerStats,
  type TowerInput,
  type TowerMapId,
  type TowerRushMode,
} from "../../../src/lib/minigames/tower-rush-logic";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type Phase = "countdown" | "playing" | "finished";

type TowerState = {
  mapId: TowerMapId;
  mode: TowerRushMode;
  phase: Phase;
  startedAt: number;
  endsAt: number;
  stats: Record<string, PlayerTowerStats>;
  inputs: Record<string, TowerInput>;
  playerOrder: string[];
  timer: ReturnType<typeof setInterval> | null;
  finishOrder: string[];
  lastFrameAt: number;
  elapsedMs: number;
};

function gs(room: MinigameRoomInternal): TowerState {
  return room.gameState as TowerState;
}

function finishGame(room: MinigameRoomInternal, state: TowerState) {
  if (state.phase === "finished") return;
  state.phase = "finished";
  assignRanks(state.stats, state.mode, state.finishOrder);
  const finish = (room as MinigameRoomInternal & { _finishGame?: (w: { winnerId: string; resultMessage: string }) => void })
    ._finishGame;
  if (!finish) return;
  const names = Object.fromEntries([...room.players.values()].map((p) => [p.userId, p.username]));
  finish(buildTowerResultMessage(state.mode, state.stats, names, MAP_LABELS[state.mapId]));

  for (const [uid, st] of Object.entries(state.stats)) {
    room.moveHistory.push({
      type: "tower_summary",
      userId: uid,
      mode: state.mode,
      mapId: state.mapId,
      floor: st.floor,
      score: st.score,
      tier: st.tier,
      rank: st.rank,
      collapsed: st.collapsed,
    });
  }
}

function recordFrame(room: MinigameRoomInternal, state: TowerState) {
  if (state.elapsedMs - state.lastFrameAt < TOWER_RUSH_FRAME_RECORD_MS) return;
  state.lastFrameAt = state.elapsedMs;
  room.moveHistory.push({
    type: "tower_frame",
    t: state.elapsedMs,
    towers: Object.fromEntries(
      state.playerOrder.map((uid) => {
        const st = state.stats[uid]!;
        return [uid, { floor: st.floor, blocks: st.blocks.slice(-20), mover: st.mover }];
      })
    ),
  });
}

function tickStep(room: MinigameRoomInternal, state: TowerState, dt: number) {
  state.elapsedMs += dt * 1000;

  for (const uid of state.playerOrder) {
    const st = state.stats[uid];
    if (!st?.alive || !st.mover) continue;

    if (st.dropQueued) {
      st.dropQueued = false;
      const result = placeBlock(st, state.mapId);
      if (result.collapsed && !state.finishOrder.includes(uid)) {
        state.finishOrder.push(uid);
      }
      continue;
    }

    stepMover(st.mover, dt, state.mapId, st.floor, state.elapsedMs);
  }

  if (shouldFinishTowerGame(state.mode, state.stats, state.playerOrder.length)) {
    finishGame(room, state);
    return;
  }

  recordFrame(room, state);
}

function startTimer(room: MinigameRoomInternal, state: TowerState) {
  if (state.timer) clearInterval(state.timer);
  const dt = TOWER_RUSH_TICK_MS / 1000;
  state.timer = setInterval(() => {
    if (room.status !== "playing") return;
    const now = Date.now();
    if (state.phase === "countdown" && now >= state.startedAt) {
      state.phase = "playing";
      state.endsAt = state.startedAt + TOWER_RUSH_GAME_MS;
    }
    if (state.phase === "playing") {
      tickStep(room, state, dt);
      if (now >= state.endsAt) finishGame(room, state);
    }
    (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
  }, TOWER_RUSH_TICK_MS);
  room.timers.push(state.timer);
}

export const towerRushPlugin: MinigamePlugin = {
  id: "tower-rush",
  minPlayers: 1,
  maxPlayers: 50,
  maxPlayersPublic: 16,
  autoStartOnPublicMatch: true,

  initGameState(room) {
    const order = [...room.players.keys()];
    for (const p of room.players.values()) p.ready = true;
    const mode = towerModeFromPlayers(order.length, room.towerRushMode);
    const mapId = pickTowerMap(room.towerRushMapId);
    const now = Date.now();
    const instant = isTowerInstantPlayMode(mode);
    const startedAt = instant ? now : now + TOWER_RUSH_COUNTDOWN_MS;

    const stats: Record<string, PlayerTowerStats> = {};
    order.forEach((uid) => {
      stats[uid] = emptyPlayerStats(uid, mapId);
    });

    return {
      mapId,
      mode,
      phase: (instant ? "playing" : "countdown") as Phase,
      startedAt,
      endsAt: startedAt + TOWER_RUSH_GAME_MS,
      stats,
      inputs: Object.fromEntries(order.map((id) => [id, { drop: false }])),
      playerOrder: order,
      timer: null,
      finishOrder: [],
      lastFrameAt: -TOWER_RUSH_FRAME_RECORD_MS,
      elapsedMs: 0,
    } satisfies TowerState;
  },

  onGameStart(room) {
    startTimer(room, gs(room));
  },

  clearTimers(room) {
    const state = room.gameState as TowerState | null;
    if (state?.timer) clearInterval(state.timer);
  },

  toPublicState(room) {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const state = gs(room);
    const timeLeftMs = Math.max(0, state.endsAt - Date.now());

    return {
      ...base,
      game: {
        mapId: state.mapId,
        mapName: MAP_LABELS[state.mapId],
        mode: state.mode,
        phase: state.phase,
        startedAt: state.startedAt,
        elapsedMs: state.elapsedMs,
        timeLeftMs,
        timeLimitMs: TOWER_RUSH_GAME_MS,
        stats: Object.fromEntries(Object.entries(state.stats).map(([k, v]) => [k, statsPublic(v)])),
        playerOrder: state.playerOrder,
        finishOrder: state.finishOrder,
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임이 진행 중이 아닙니다.";
    const state = gs(room);
    if (state.phase !== "playing") return "아직 시작 전입니다.";
    const st = state.stats[userId];
    if (!st) return "플레이어 상태 없음";
    if (!st.alive || st.finished) return "이미 탈락했습니다.";
    const input = normalizeTowerInput(move);
    if (!input.drop) return "잘못된 입력";
    if (st.dropQueued) return "이미 배치 중";
    return null;
  },

  applyMove(room, userId, move) {
    const state = gs(room);
    state.inputs[userId] = normalizeTowerInput(move);
    const st = state.stats[userId];
    if (st?.alive) st.dropQueued = true;
  },

  checkWin(room) {
    const state = room.gameState as TowerState | null;
    if (!state || state.phase !== "finished") return null;
    const names = Object.fromEntries([...room.players.values()].map((p) => [p.userId, p.username]));
    return buildTowerResultMessage(state.mode, state.stats, names, MAP_LABELS[state.mapId]);
  },

  onGameEnd(room) {
    towerRushPlugin.clearTimers?.(room);
  },
};
