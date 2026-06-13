import {
  ALKKAGI_BOARD_H,
  ALKKAGI_BOARD_W,
  ALKKAGI_TURN_MS,
  initAlkkagiStones,
  simulateAlkkagiShot,
  type AlkkagiStone,
} from "../../../src/lib/minigames/alkkagi-physics";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type AlkkagiState = {
  stones: AlkkagiStone[];
  turnUserId: string;
  playerIds: string[];
  width: number;
  height: number;
  scores: Record<string, number>;
  turnEndsAt: number;
  turnIndex: number;
  timer: ReturnType<typeof setInterval> | null;
  lastKnockouts: number;
  lastShooterId: string | null;
  shotSeq: number;
  lastShot: { stoneId: string; angle: number; power: number; shooterId: string; seq: number } | null;
};

function gs(room: MinigameRoomInternal): AlkkagiState {
  return room.gameState as AlkkagiState;
}

function advanceTurn(state: AlkkagiState) {
  state.turnIndex = (state.turnIndex + 1) % state.playerIds.length;
  state.turnUserId = state.playerIds[state.turnIndex]!;
  state.turnEndsAt = Date.now() + ALKKAGI_TURN_MS;
}

function startTurnTimer(room: MinigameRoomInternal, state: AlkkagiState) {
  if (state.timer) clearInterval(state.timer);
  state.timer = setInterval(() => {
    if (room.status !== "playing") return;
    if (Date.now() >= state.turnEndsAt) {
      advanceTurn(state);
    }
    (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
  }, 500);
  room.timers.push(state.timer);
}

export const alkkagiPlugin: MinigamePlugin = {
  id: "alkkagi",
  minPlayers: 2,
  maxPlayers: 2,
  maxPlayersPublic: 2,
  autoStartOnPublicMatch: true,

  initGameState(room) {
    const ids = [...room.players.keys()];
    for (const p of room.players.values()) p.ready = true;
    return {
      stones: initAlkkagiStones(ids),
      turnUserId: room.hostId,
      playerIds: ids,
      width: ALKKAGI_BOARD_W,
      height: ALKKAGI_BOARD_H,
      scores: Object.fromEntries(ids.map((id) => [id, 0])),
      turnEndsAt: Date.now() + ALKKAGI_TURN_MS,
      turnIndex: Math.max(0, ids.indexOf(room.hostId)),
      timer: null,
      lastKnockouts: 0,
      lastShooterId: null,
      shotSeq: 0,
      lastShot: null,
    };
  },

  onGameStart(room) {
    startTurnTimer(room, gs(room));
  },

  clearTimers(room) {
    const state = room.gameState as AlkkagiState | null;
    if (state?.timer) clearInterval(state.timer);
  },

  toPublicState(room) {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const state = gs(room);
    const timeLeft = Math.max(0, Math.ceil((state.turnEndsAt - Date.now()) / 1000));
    const myTurn = timeLeft > 0;

    return {
      ...base,
      game: {
        stones: state.stones,
        turnUserId: state.turnUserId,
        width: state.width,
        height: state.height,
        scores: { ...state.scores },
        stoneCounts: Object.fromEntries(
          state.playerIds.map((id) => [id, state.stones.filter((s) => s.ownerId === id).length])
        ),
        timeLeft,
        turnLimit: ALKKAGI_TURN_MS / 1000,
        phase: myTurn ? "active" : "waiting",
        lastKnockouts: state.lastKnockouts,
        lastShooterId: state.lastShooterId,
        lastShot: state.lastShot,
        playerIds: state.playerIds,
        blackPlayerId: state.playerIds[0] ?? null,
        whitePlayerId: state.playerIds[1] ?? null,
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임이 진행 중이 아닙니다.";
    const state = gs(room);
    if (userId !== state.turnUserId) return "상대 턴입니다.";
    if (Date.now() > state.turnEndsAt) return "턴 시간이 지났습니다.";

    const m = move as { stoneId?: string; angle?: number; power?: number };
    if (!m.stoneId || typeof m.angle !== "number" || typeof m.power !== "number") {
      return "잘못된 입력입니다.";
    }
    if (m.power < 0.05 || m.power > 1) return "힘은 5%~100% 사이여야 합니다.";
    if (!Number.isFinite(m.angle)) return "각도가 올바르지 않습니다.";

    const stone = state.stones.find((s) => s.id === m.stoneId);
    if (!stone || stone.ownerId !== userId) return "내 돌을 선택하세요.";
    if (Math.hypot(stone.vx, stone.vy) > 0.5) return "돌이 아직 움직이는 중입니다.";
    return null;
  },

  applyMove(room, userId, move) {
    const state = gs(room);
    const m = move as { stoneId: string; angle: number; power: number };

    const result = simulateAlkkagiShot(state.stones, m.stoneId, m.angle, m.power, state.width, state.height);

    const opponentKnocked = result.knockedOut.filter((k) => k.ownerId !== userId).length;
    const bonus = opponentKnocked >= 2 ? opponentKnocked - 1 : 0;
    const points = opponentKnocked + bonus;

    if (points > 0) {
      state.scores[userId] = (state.scores[userId] ?? 0) + points;
    }

    state.stones = result.stones;
    state.lastKnockouts = opponentKnocked;
    state.lastShooterId = userId;
    state.shotSeq += 1;
    state.lastShot = {
      stoneId: m.stoneId,
      angle: m.angle,
      power: m.power,
      shooterId: userId,
      seq: state.shotSeq,
    };

    advanceTurn(state);
    room.moveHistory.push({
      userId,
      stoneId: m.stoneId,
      angle: m.angle,
      power: m.power,
      knockedOut: result.knockedOut,
      points,
    });
  },

  checkWin(room) {
    const state = gs(room);
    const counts = state.playerIds.map((id) => ({
      id,
      n: state.stones.filter((s) => s.ownerId === id).length,
    }));
    const alive = counts.filter((c) => c.n > 0);

    if (alive.length === 1) {
      const winner = alive[0]!.id;
      const name = room.players.get(winner)?.username ?? "플레이어";
      return {
        winnerId: winner,
        resultMessage:
          state.lastKnockouts >= 2
            ? `${name} 승리! ${state.lastKnockouts}개 한 방에 OUT`
            : `${name} 승리!`,
      };
    }

    if (state.stones.length === 0) {
      const byScore = [...state.playerIds].sort(
        (a, b) => (state.scores[b] ?? 0) - (state.scores[a] ?? 0)
      );
      return {
        winnerId: byScore[0] ?? "",
        resultMessage: "무승부 — 점수로 결정",
      };
    }

    return null;
  },
};
