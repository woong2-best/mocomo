import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type Stone = { id: string; x: number; y: number; ownerId: string; vx: number; vy: number };

type AlkkagiState = {
  stones: Stone[];
  turnUserId: string;
  playerIds: string[];
  width: number;
  height: number;
};

const W = 400;
const H = 400;
const R = 18;

function gs(room: MinigameRoomInternal): AlkkagiState {
  return room.gameState as AlkkagiState;
}

function initStones(playerIds: string[]): Stone[] {
  const [a, b] = playerIds;
  return [
    { id: "a1", x: 120, y: 120, ownerId: a!, vx: 0, vy: 0 },
    { id: "a2", x: 160, y: 140, ownerId: a!, vx: 0, vy: 0 },
    { id: "a3", x: 140, y: 180, ownerId: a!, vx: 0, vy: 0 },
    { id: "b1", x: 280, y: 280, ownerId: b!, vx: 0, vy: 0 },
    { id: "b2", x: 240, y: 260, ownerId: b!, vx: 0, vy: 0 },
    { id: "b3", x: 260, y: 220, ownerId: b!, vx: 0, vy: 0 },
  ];
}

function simulateFlick(stones: Stone[], stoneId: string, angle: number, power: number): Stone[] {
  const next = stones.map((s) => ({ ...s }));
  const stone = next.find((s) => s.id === stoneId);
  if (!stone) return next;
  stone.vx = Math.cos(angle) * power * 8;
  stone.vy = Math.sin(angle) * power * 8;

  for (let step = 0; step < 60; step++) {
    for (const s of next) {
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.92;
      s.vy *= 0.92;
    }
    for (let i = 0; i < next.length; i++) {
      for (let j = i + 1; j < next.length; j++) {
        const a = next[i]!;
        const b = next[j]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < R * 2) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = R * 2 - dist;
          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;
          const tv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (tv > 0) {
            a.vx -= tv * nx * 0.8;
            a.vy -= tv * ny * 0.8;
            b.vx += tv * nx * 0.8;
            b.vy += tv * ny * 0.8;
          }
        }
      }
    }
  }
  return next.filter((s) => s.x > R && s.x < W - R && s.y > R && s.y < H - R);
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
      stones: initStones(ids),
      turnUserId: room.hostId,
      playerIds: ids,
      width: W,
      height: H,
    };
  },

  toPublicState(room) {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const state = gs(room);
    return {
      ...base,
      game: {
        stones: state.stones,
        turnUserId: state.turnUserId,
        width: state.width,
        height: state.height,
        scores: Object.fromEntries(
          state.playerIds.map((id) => [id, state.stones.filter((s) => s.ownerId === id).length])
        ),
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임이 진행 중이 아닙니다.";
    const state = gs(room);
    if (userId !== state.turnUserId) return "상대 턴입니다.";
    const m = move as { stoneId?: string; angle?: number; power?: number };
    if (!m.stoneId || typeof m.angle !== "number" || typeof m.power !== "number") return "잘못된 입력";
    if (m.power < 0 || m.power > 1) return "힘은 0~1";
    const stone = state.stones.find((s) => s.id === m.stoneId);
    if (!stone || stone.ownerId !== userId) return "내 돌이 아닙니다";
    return null;
  },

  applyMove(room, userId, move) {
    const state = gs(room);
    const m = move as { stoneId: string; angle: number; power: number };
    state.stones = simulateFlick(state.stones, m.stoneId, m.angle, m.power);
    const idx = state.playerIds.indexOf(userId);
    state.turnUserId = state.playerIds[(idx + 1) % state.playerIds.length]!;
    room.moveHistory.push({ userId, ...m });
  },

  checkWin(room) {
    const state = gs(room);
    const counts = state.playerIds.map((id) => ({
      id,
      n: state.stones.filter((s) => s.ownerId === id).length,
    }));
    const alive = counts.filter((c) => c.n > 0);
    if (alive.length === 1) {
      return { winnerId: alive[0]!.id, resultMessage: "알까기 승리!" };
    }
    if (state.stones.length === 0) {
      return { winnerId: "", resultMessage: "무승부" };
    }
    return null;
  },
};
