import { generateSpotDiff } from "../../../src/lib/minigames/puzzle-utils";
import { basePublicFields, type MinigamePlugin, type MinigameRoomInternal } from "../types";

type SpotState = {
  left: number[][];
  right: number[][];
  diffs: { x: number; y: number }[];
  found: { x: number; y: number }[];
  scores: Record<string, number>;
  turnUserId: string;
  playerOrder: string[];
  turnIndex: number;
  endsAt: number;
  timer: ReturnType<typeof setInterval> | null;
};

function gs(room: MinigameRoomInternal): SpotState {
  return room.gameState as SpotState;
}

export const spotDiffPlugin: MinigamePlugin = {
  id: "spot-diff",
  minPlayers: 1,
  maxPlayers: 4,
  maxPlayersPublic: 4,
  autoStartOnPublicMatch: true,

  initGameState(room) {
    const order = [...room.players.keys()];
    for (const p of room.players.values()) p.ready = true;
    const seed = Math.floor(Math.random() * 1e9);
    const { left, right, diffs } = generateSpotDiff(8, 5, seed);
    return {
      left,
      right,
      diffs,
      found: [],
      scores: Object.fromEntries(order.map((id) => [id, 0])),
      turnUserId: order[0]!,
      playerOrder: order,
      turnIndex: 0,
      endsAt: Date.now() + 60000,
      timer: null,
    };
  },

  onGameStart(room) {
    const state = gs(room);
    state.timer = setInterval(() => {
      if (room.status !== "playing") return;
      if (Date.now() >= state.endsAt) {
        room.status = "finished";
        const top = Object.entries(state.scores).sort((a, b) => b[1] - a[1])[0];
        room.winnerId = top?.[0] ?? null;
        room.resultMessage = "시간 종료";
      }
      (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast?.();
    }, 1000);
    room.timers.push(state.timer);
  },

  toPublicState(room) {
    const base = basePublicFields(room);
    if (room.status === "lobby" || !room.gameState) return { ...base, game: null };
    const state = gs(room);
    return {
      ...base,
      game: {
        left: state.left,
        right: state.right,
        found: [...state.found],
        scores: { ...state.scores },
        turnUserId: state.turnUserId,
        timeLeft: Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000)),
        totalDiffs: state.diffs.length,
      },
    };
  },

  validateMove(room, userId, move) {
    if (room.status !== "playing") return "게임 중이 아닙니다.";
    const state = gs(room);
    if (userId !== state.turnUserId) return "내 턴이 아닙니다.";
    const m = move as { x?: number; y?: number };
    if (typeof m.x !== "number" || typeof m.y !== "number") return "좌표 오류";
    if (state.found.some((f) => f.x === m.x && f.y === m.y)) return "이미 찾음";
    return null;
  },

  applyMove(room, userId, move) {
    const state = gs(room);
    const m = move as { x: number; y: number };
    const hit = state.diffs.find((d) => d.x === m.x && d.y === m.y);
    if (hit) {
      state.found.push({ x: m.x, y: m.y });
      state.scores[userId] = (state.scores[userId] ?? 0) + 1;
    }
    state.turnIndex = (state.turnIndex + 1) % state.playerOrder.length;
    state.turnUserId = state.playerOrder[state.turnIndex]!;
    room.moveHistory.push({ userId, ...m, hit: !!hit });
    if (state.found.length >= state.diffs.length) {
      room.winnerId = userId;
      room.status = "finished";
      room.resultMessage = "모든 차이 찾음!";
    }
  },

  checkWin(room) {
    if (room.winnerId) return { winnerId: room.winnerId, resultMessage: room.resultMessage ?? "승리" };
    if (room.status === "finished") {
      const top = Object.entries(gs(room).scores).sort((a, b) => b[1] - a[1])[0];
      return { winnerId: top?.[0] ?? "", resultMessage: room.resultMessage ?? "종료" };
    }
    return null;
  },

  clearTimers(room) {
    const state = gs(room);
    if (state.timer) clearInterval(state.timer);
  },
};
