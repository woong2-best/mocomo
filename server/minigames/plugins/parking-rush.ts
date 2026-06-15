import { pickParkingLevel } from "../../../src/lib/minigames/parking-rush-levels";
import {
  advancePlayerLotRuntime,
  initPlayerLotRuntime,
  mergePlayerObstacles,
  type PlayerLotRuntime,
} from "../../../src/lib/minigames/parking-rush-lot-runtime";
import {
  PARKING_RUSH_COUNTDOWN_MS,
  PARKING_RUSH_FRAME_RECORD_MS,
  PARKING_RUSH_PHYSICS_DT,
  PARKING_RUSH_TICK_MS,
  applyCollisionScore,
  buildParkingResultMessage,
  carsOverlap,
  checkParkingProgress,
  emptyPlayerStats,
  normalizeInput,
  isParkingInstantPlayMode,
  parkingModeFromPlayers,
  resolveCarColor,
  scoreParkingSuccess,
  statsPublic,
  stepCarPhysics,
  tierFromScore,
  vehicleForPlayer,
  VEHICLE_SPECS,
  type ParkingInput,
  type ParkingLevel,
  type ParkingRushMode,
  type PlayerParkingStats,
} from "../../../src/lib/minigames/parking-rush-logic";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type Phase = "countdown" | "playing" | "finished";

type ParkingState = {
  level: ParkingLevel;
  mode: ParkingRushMode;
  phase: Phase;
  startedAt: number;
  endsAt: number;
  stats: Record<string, PlayerParkingStats>;
  playerLots: Record<string, PlayerLotRuntime>;
  inputs: Record<string, ParkingInput>;
  playerOrder: string[];
  timer: ReturnType<typeof setInterval> | null;
  physicsAcc: number;
  finishOrder: string[];
  lastFrameAt: number;
};

function isChainParkingMode(mode: ParkingRushMode): boolean {
  return mode === "solo" || mode === "time_attack";
}

function levelForPlayer(state: ParkingState, uid: string, now: number): ParkingLevel {
  const lot = state.playerLots[uid];
  const st = state.stats[uid];
  if (!lot) return state.level;
  let obstacles = mergePlayerObstacles(state.level.obstacles, lot);
  if (st && st.parkGraceUntil > now && st.graceSpotId) {
    obstacles = obstacles.filter((o) => o.spotId !== st.graceSpotId);
  }
  return {
    ...state.level,
    obstacles,
  };
}

function gs(room: MinigameRoomInternal): ParkingState {
  return room.gameState as ParkingState;
}

function elapsedMs(state: ParkingState): number {
  if (state.phase === "countdown") return 0;
  return Math.max(0, Date.now() - state.startedAt);
}

function finishGame(room: MinigameRoomInternal, state: ParkingState) {
  if (state.phase === "finished") return;
  state.phase = "finished";
  const finish = (room as MinigameRoomInternal & { _finishGame?: (w: { winnerId: string; resultMessage: string }) => void })
    ._finishGame;
  if (!finish) return;
  const names = Object.fromEntries([...room.players.values()].map((p) => [p.userId, p.username]));
  const result = buildParkingResultMessage(state.mode, state.stats, names, state.level.name);
  finish(result);

  for (const [uid, st] of Object.entries(state.stats)) {
    room.moveHistory.push({
      type: "parking_summary",
      userId: uid,
      mode: state.mode,
      levelId: state.level.id,
      levelName: state.level.name,
      score: st.score,
      parked: st.parked,
      collisions: st.collisions,
      tier: st.tier,
      vehicleId: st.vehicleId,
      reversePark: st.reversePark,
      rank: st.rank,
      carColor: st.carColor,
    });
  }
}

function recordFrame(room: MinigameRoomInternal, state: ParkingState) {
  const t = elapsedMs(state);
  if (t - state.lastFrameAt < PARKING_RUSH_FRAME_RECORD_MS) return;
  state.lastFrameAt = t;
  room.moveHistory.push({
    type: "parking_frame",
    t,
    cars: Object.fromEntries(
      state.playerOrder.map((uid) => {
        const st = state.stats[uid]!;
        return [
          uid,
          {
            x: st.car.x,
            y: st.car.y,
            angle: st.car.angle,
            speed: st.car.speed,
            vehicleId: st.vehicleId,
            color: st.carColor,
            blinker: st.blinker,
          },
        ];
      })
    ),
  });
}

function assignRanks(state: ParkingState) {
  const parked = state.finishOrder.filter((id) => state.stats[id]?.parked);
  parked.forEach((id, i) => {
    const st = state.stats[id];
    if (st) st.rank = i + 1;
  });
}

function physicsStep(room: MinigameRoomInternal, state: ParkingState) {
  const dt = PARKING_RUSH_PHYSICS_DT;
  const now = Date.now();
  const elapsed = elapsedMs(state);
  const chainMode = isChainParkingMode(state.mode);

  for (const uid of state.playerOrder) {
    let st = state.stats[uid];
    if (!st || st.finished) continue;

    const input = state.inputs[uid] ?? { throttle: 0, steer: 0 };
    if (input.horn) {
      st.hornUntil = now + 350;
      st.hornCount += 1;
    }
    st.blinker = input.blinker ?? "off";

    const spec = VEHICLE_SPECS[st.vehicleId];
    const car = { ...st.car };
    const playerLevel = levelForPlayer(state, uid, now);
    const hit = stepCarPhysics(car, spec, input, playerLevel, dt);
    st = { ...st, car };

    if (hit) {
      if (hit.instantFail) {
        st = applyCollisionScore(st, hit);
        st.failed = true;
        st.failReason =
          hit.kind === "player"
            ? "다른 차량과 충돌"
            : hit.kind === "pillar"
              ? "전봇대 충돌"
              : "주차된 차량 충돌";
        st.finished = true;
        st.parkedAt = now;
        room.moveHistory.push({
          type: "parking_collision",
          userId: uid,
          t: elapsed,
          kind: hit.kind,
          strength: "heavy",
        });
        if (!state.finishOrder.includes(uid)) state.finishOrder.push(uid);
        assignRanks(state);
      } else {
        st = applyCollisionScore(st, hit);
        room.moveHistory.push({
          type: "parking_collision",
          userId: uid,
          t: elapsed,
          kind: hit.kind,
          strength: hit.strength,
        });
        if (st.collisions >= 12) st.score = Math.max(0, st.score - 200);
      }
    } else if (Math.abs(car.speed) > 0.2) {
      st.combo += 1;
      st.maxCombo = Math.max(st.maxCombo, st.combo);
    }

    if (!st.failed) {
      for (const otherId of state.playerOrder) {
        if (otherId === uid) continue;
        const other = state.stats[otherId];
        if (!other || other.finished) continue;
        const otherSpec = VEHICLE_SPECS[other.vehicleId];
        if (carsOverlap(car, spec, other.car, otherSpec)) {
          st = applyCollisionScore(st, {
            kind: "player",
            strength: "heavy",
            speed: Math.max(Math.abs(car.speed), Math.abs(other.car.speed), 0.6),
            atMs: now,
            instantFail: true,
          });
          st.failed = true;
          st.failReason = "다른 차량과 충돌";
          st.finished = true;
          st.parkedAt = now;
          room.moveHistory.push({
            type: "parking_collision",
            userId: uid,
            t: elapsed,
            kind: "player",
            strength: "heavy",
          });
          if (!state.finishOrder.includes(uid)) state.finishOrder.push(uid);
          assignRanks(state);
          break;
        }
      }
    }

    const spot = state.level.parkingSpots.find((s) => s.id === st.spotId);
    if (spot && !st.failed) {
      const prog = checkParkingProgress(car, spec, spot, st.parkHoldMs, PARKING_RUSH_TICK_MS);
      st.parkHoldMs = prog.holdMs;
      st.reversePark = prog.reversePark;
      if (prog.parked && !st.parked) {
        if (chainMode) {
          const completedSpotId = st.spotId;
          st.spotsCompleted += 1;
          st.score += scoreParkingSuccess(st, elapsed, state.level.timeLimitMs, prog.alignment, prog.reversePark);
          st.tier = tierFromScore(st.score);
          st.combo += 3;
          st.maxCombo = Math.max(st.maxCombo, st.combo);
          st.parkHoldMs = 0;
          st.parked = false;
          st.parkGraceUntil = now + 1800;
          st.graceSpotId = completedSpotId;
          const push = 2.2;
          car.x += Math.cos(car.angle) * push;
          car.y += Math.sin(car.angle) * push;
          car.speed = 0;
          const lot = state.playerLots[uid] ?? initPlayerLotRuntime(state.level.parkingSpots);
          const nextLot = advancePlayerLotRuntime(state.level.parkingSpots, lot, completedSpotId);
          state.playerLots[uid] = nextLot;
          st.spotId = nextLot.targetSpotId;
        } else {
          st.parked = true;
          st.parkedAt = now;
          st.finished = true;
          st.score = scoreParkingSuccess(st, elapsed, state.level.timeLimitMs, prog.alignment, prog.reversePark);
          st.tier = tierFromScore(st.score);
          state.finishOrder.push(uid);
          assignRanks(state);
        }
      }
    }

    st.car = car;
    state.stats[uid] = st;
  }

  if (state.phase === "playing") recordFrame(room, state);

  if (chainMode) {
    const allDone = state.playerOrder.every((id) => state.stats[id]?.finished);
    if (allDone && state.playerOrder.length > 0) {
      finishGame(room, state);
      return;
    }
  }

  if (state.mode === "duel" || state.mode === "ranked") {
    const parkedCount = Object.values(state.stats).filter((s) => s.parked).length;
    if (parkedCount >= 1 && state.playerOrder.length > 1) {
      finishGame(room, state);
      return;
    }
  }

  if (now >= state.endsAt) finishGame(room, state);
}

function startTimer(room: MinigameRoomInternal, state: ParkingState) {
  if (state.timer) clearInterval(state.timer);
  state.timer = setInterval(() => {
    if (room.status !== "playing") return;
    const now = Date.now();
    if (state.phase === "countdown" && now >= state.startedAt) {
      state.phase = "playing";
      state.endsAt = state.startedAt + state.level.timeLimitMs;
    }
    if (state.phase === "playing") {
      state.physicsAcc += PARKING_RUSH_TICK_MS / 1000;
      while (state.physicsAcc >= PARKING_RUSH_PHYSICS_DT) {
        physicsStep(room, state);
        state.physicsAcc -= PARKING_RUSH_PHYSICS_DT;
        if (state.phase !== "playing") break;
      }
    }
    (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
  }, PARKING_RUSH_TICK_MS);
  room.timers.push(state.timer);
}

export const parkingRushPlugin: MinigamePlugin = {
  id: "parking-rush",
  minPlayers: 1,
  maxPlayers: 16,
  maxPlayersPublic: 16,
  autoStartOnPublicMatch: true,

  initGameState(room) {
    const order = [...room.players.keys()];
    for (const p of room.players.values()) p.ready = true;
    const mode = parkingModeFromPlayers(order.length, room.parkingRushMode);
    const level = pickParkingLevel({
      levelId: room.parkingRushLevelId,
      difficulty: room.parkingRushDifficulty,
    });
    const now = Date.now();
    const instant = isParkingInstantPlayMode(mode);
    const startedAt = instant ? now : now + PARKING_RUSH_COUNTDOWN_MS;
    const carColor = resolveCarColor(room.parkingRushCarColor);

    const stats: Record<string, PlayerParkingStats> = {};
    const playerLots: Record<string, PlayerLotRuntime> = {};
    order.forEach((uid, i) => {
      const lot = initPlayerLotRuntime(level.parkingSpots);
      playerLots[uid] = lot;
      const spawn = level.spawnPoints[i % level.spawnPoints.length]!;
      stats[uid] = emptyPlayerStats(uid, vehicleForPlayer(i), lot.targetSpotId, spawn, carColor);
    });

    return {
      level,
      mode,
      phase: (instant ? "playing" : "countdown") as Phase,
      startedAt,
      endsAt: startedAt + level.timeLimitMs,
      stats,
      playerLots,
      inputs: Object.fromEntries(order.map((id) => [id, { throttle: 0, steer: 0, blinker: "off" as const }])),
      playerOrder: order,
      timer: null,
      physicsAcc: 0,
      finishOrder: [],
      lastFrameAt: -PARKING_RUSH_FRAME_RECORD_MS,
    };
  },

  onGameStart(room) {
    startTimer(room, gs(room));
  },

  clearTimers(room) {
    const state = room.gameState as ParkingState | null;
    if (state?.timer) clearInterval(state.timer);
  },

  toPublicState(room) {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const state = gs(room);
    const elapsed = elapsedMs(state);
    const timeLeftMs = Math.max(0, state.endsAt - Date.now());

    return {
      ...base,
      game: {
        levelId: state.level.id,
        levelName: state.level.name,
        mapType: state.level.mapType,
        difficulty: state.level.difficulty,
        mode: state.mode,
        phase: state.phase,
        startedAt: state.startedAt,
        elapsedMs: elapsed,
        timeLeftMs,
        timeLimitMs: state.level.timeLimitMs,
        bounds: state.level.bounds,
        walls: state.level.walls,
        obstacles: state.level.obstacles,
        parkingSpots: state.level.parkingSpots,
        groundColor: state.level.groundColor,
        accentColor: state.level.accentColor,
        stats: Object.fromEntries(
          Object.entries(state.stats).map(([k, v]) => {
            const lot = state.playerLots[k];
            return [
              k,
              {
                ...statsPublic(v),
                runtimeObstacles: lot?.parkedCarObstacles ?? [],
              },
            ];
          })
        ),
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
    if (st.finished) return "이미 종료됨";
    if (!move || typeof move !== "object") return "잘못된 입력";
    return null;
  },

  applyMove(room, userId, move) {
    const state = gs(room);
    state.inputs[userId] = normalizeInput(move);
  },

  checkWin(room) {
    const state = room.gameState as ParkingState | null;
    if (!state || state.phase !== "finished") return null;
    const names = Object.fromEntries([...room.players.values()].map((p) => [p.userId, p.username]));
    return buildParkingResultMessage(state.mode, state.stats, names, state.level.name);
  },

  onGameEnd(room) {
    parkingRushPlugin.clearTimers?.(room);
  },
};
