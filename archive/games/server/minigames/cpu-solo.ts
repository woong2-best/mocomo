import {
  MINIGAME_CPU_USER_ID,
  MINIGAME_CPU_USERNAME,
  type MinigameAiDifficulty,
} from "../../src/lib/minigames/minigame-cpu";
import { cpuRoleForGame, isCpuBoardGame } from "../../src/lib/minigames/minigame-cpu";
import type { MinigameRoomInternal } from "./types";

export { MINIGAME_CPU_USER_ID, MINIGAME_CPU_USERNAME };

export function isCpuSoloRoom(room: MinigameRoomInternal): boolean {
  if (room.cpuOpponent) return true;
  return room.gameId === "omok" && room.omokMode === "solo";
}

export function getRoomAiDifficulty(room: MinigameRoomInternal): MinigameAiDifficulty {
  return room.aiDifficulty ?? room.omokAiDifficulty ?? "normal";
}

export function isCpuSoloInstantCreate(gameId: string, opts: { cpuOpponent?: boolean; omokMode?: string }): boolean {
  if (!isCpuBoardGame(gameId)) return false;
  return !!opts.cpuOpponent || (gameId === "omok" && opts.omokMode === "solo");
}

export function attachCpuPlayer(room: MinigameRoomInternal): void {
  room.players.set(MINIGAME_CPU_USER_ID, {
    userId: MINIGAME_CPU_USER_ID,
    username: MINIGAME_CPU_USERNAME,
    socketId: "",
    ready: true,
    role: cpuRoleForGame(room.gameId),
  });
}

const cpuMovePending = new WeakSet<MinigameRoomInternal>();

export function scheduleCpuTurn(room: MinigameRoomInternal, playTurn: () => void): void {
  if (!isCpuSoloRoom(room) || room.status !== "playing") return;
  if (cpuMovePending.has(room)) return;
  cpuMovePending.add(room);

  const delay = 350 + Math.floor(Math.random() * 500);
  const timer = setTimeout(() => {
    cpuMovePending.delete(room);
    if (room.status !== "playing") return;
    playTurn();
  }, delay);
  room.timers.push(timer);
}
