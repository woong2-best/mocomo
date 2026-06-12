import { parseTimeControl } from "../../src/lib/minigames/time-control";
import type { MinigameRoomInternal } from "./types";

export function initRoomClocks(room: MinigameRoomInternal) {
  const tc = room.timeControl ?? "unlimited";
  room.timeControl = tc;
  if (tc === "unlimited") {
    room.clocks = undefined;
    room.incrementMs = 0;
    return;
  }
  const { ms, incrementMs } = parseTimeControl(tc);
  room.incrementMs = incrementMs;
  room.clocks = {};
  for (const id of room.players.keys()) {
    room.clocks[id] = ms;
  }
  room.turnStartedAt = Date.now();
}

export function setTurnUser(room: MinigameRoomInternal, turnUserId: string | null) {
  if (!room.clocks || !room.timeControl || room.timeControl === "unlimited") {
    room.turnUserId = turnUserId;
    return;
  }
  if (room.turnUserId && room.turnStartedAt && room.clocks[room.turnUserId] != null) {
    const elapsed = Date.now() - room.turnStartedAt;
    room.clocks[room.turnUserId] = Math.max(0, room.clocks[room.turnUserId]! - elapsed);
    if (room.incrementMs && turnUserId) {
      room.clocks[room.turnUserId] = (room.clocks[room.turnUserId] ?? 0) + room.incrementMs;
    }
  }
  room.turnUserId = turnUserId;
  room.turnStartedAt = Date.now();
}

export function checkClockTimeout(room: MinigameRoomInternal): { winnerId: string; resultMessage: string } | null {
  if (!room.clocks || !room.turnUserId || !room.turnStartedAt) return null;
  const elapsed = Date.now() - room.turnStartedAt;
  const left = (room.clocks[room.turnUserId] ?? 0) - elapsed;
  if (left > 0) return null;
  const loser = room.turnUserId;
  const winner = [...room.players.keys()].find((id) => id !== loser);
  return { winnerId: winner ?? "", resultMessage: "시간 초과 패배" };
}

export function startClockTicker(room: MinigameRoomInternal, onTimeout: () => void) {
  if (!room.timeControl || room.timeControl === "unlimited") return;
  const timer = setInterval(() => {
    if (room.status !== "playing") return;
    const win = checkClockTimeout(room);
    if (win) onTimeout();
  }, 500);
  room.timers.push(timer);
}
