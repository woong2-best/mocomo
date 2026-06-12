import type { Server } from "socket.io";
import type { PrismaClient } from "@prisma/client";
import { generateRoomCode, isValidRoomCode } from "../../src/lib/sketch-quiz-words";
import type { MinigamePublicState } from "../../src/lib/minigames/shared-types";
import { attachOmokRuleMode } from "./plugins/omok";
import { PLUGIN_BY_ID } from "./plugins/index";
import { persistMinigameResult, ensureDefaultSeason } from "./persistence";
import { initRoomClocks, setTurnUser, checkClockTimeout, startClockTicker } from "./clocks";
import type {
  MinigameCreateOptions,
  MinigameJoinOptions,
  MinigamePlugin,
  MinigameRoomInternal,
  RoomStatus,
} from "./types";

const plugins = PLUGIN_BY_ID;

type MatchQueueEntry = {
  gameId: string;
  userId: string;
  username: string;
  socketId: string;
  joinedAt: number;
};

const rooms = new Map<string, MinigameRoomInternal>();
const matchQueues = new Map<string, MatchQueueEntry[]>();
const userRoomIndex = new Map<string, string>(); // `${gameId}:${userId}` -> roomId

let ioRef: Server | null = null;
let prismaRef: PrismaClient | null = null;
const queueTimers = new Map<string, ReturnType<typeof setInterval>>();

function roomKey(gameId: string, roomId: string) {
  return `minigame:${gameId}:${roomId.toUpperCase()}`;
}

function roomStorageKey(gameId: string, roomId: string) {
  return `${gameId}:${roomId.toUpperCase()}`;
}

function userIndexKey(gameId: string, userId: string) {
  return `${gameId}:${userId}`;
}

function getPlugin(gameId: string): MinigamePlugin | undefined {
  return plugins.get(gameId);
}

function maxPlayersFor(room: MinigameRoomInternal, plugin: MinigamePlugin): number {
  return room.accessMode === "public"
    ? (plugin.maxPlayersPublic ?? plugin.maxPlayers)
    : plugin.maxPlayers;
}

function clearRoomTimers(room: MinigameRoomInternal) {
  for (const t of room.timers) {
    clearTimeout(t);
    clearInterval(t);
  }
  room.timers = [];
  const plugin = getPlugin(room.gameId);
  plugin?.clearTimers?.(room);
}

function broadcastState(room: MinigameRoomInternal) {
  if (!ioRef) return;
  const plugin = getPlugin(room.gameId);
  if (!plugin) return;
  const state = plugin.toPublicState(room);
  ioRef.to(roomKey(room.gameId, room.id)).emit("minigame_state", { gameId: room.gameId, state });
}

function attachBroadcast(room: MinigameRoomInternal) {
  (room as MinigameRoomInternal & { _broadcast?: () => void })._broadcast = () => broadcastState(room);
}

function removeUserFromIndex(gameId: string, userId: string) {
  userRoomIndex.delete(userIndexKey(gameId, userId));
}

function indexUser(gameId: string, userId: string, roomId: string) {
  userRoomIndex.set(userIndexKey(gameId, userId), roomId.toUpperCase());
}

function getRoom(gameId: string, roomId: string): MinigameRoomInternal | undefined {
  return rooms.get(roomStorageKey(gameId, roomId));
}

function deleteRoom(room: MinigameRoomInternal) {
  clearRoomTimers(room);
  for (const p of room.players.keys()) removeUserFromIndex(room.gameId, p);
  for (const s of room.spectators.keys()) removeUserFromIndex(room.gameId, s);
  rooms.delete(roomStorageKey(room.gameId, room.id));
}

function transferHost(room: MinigameRoomInternal) {
  const next = [...room.players.values()][0];
  if (next) room.hostId = next.userId;
}

function extractTurnUserId(room: MinigameRoomInternal): string | null {
  const gs = room.gameState as Record<string, unknown> | null;
  if (!gs) return null;
  if (typeof gs.turnUserId === "string") return gs.turnUserId;
  if (gs.turn === "black" && typeof gs.blackUserId === "string") return gs.blackUserId;
  if (gs.turn === "white" && typeof gs.whiteUserId === "string") return gs.whiteUserId;
  if (typeof gs.turnRed === "boolean") {
    return gs.turnRed ? (gs.redUserId as string) : (gs.blueUserId as string);
  }
  if (typeof gs.turn === "number") {
    return gs.turn === 1 ? (gs.blackUserId as string) : (gs.whiteUserId as string);
  }
  return room.turnUserId ?? null;
}

function finishGame(room: MinigameRoomInternal, win: { winnerId: string; resultMessage: string }) {
  room.status = "finished";
  room.winnerId = win.winnerId || null;
  room.resultMessage = win.resultMessage;
  const plugin = getPlugin(room.gameId);
  plugin?.onGameEnd?.(room);
  clearRoomTimers(room);
  if (prismaRef) {
    void persistMinigameResult(prismaRef, room).then((matchId) => {
      if (matchId) {
        room.lastMatchId = matchId;
        broadcastState(room);
      }
    });
  }
  broadcastState(room);
}

function startGameInternal(room: MinigameRoomInternal): { ok: true; state: MinigamePublicState } | { ok: false; error: string } {
  const plugin = getPlugin(room.gameId);
  if (!plugin) return { ok: false, error: "알 수 없는 게임입니다." };
  if (room.players.size < plugin.minPlayers) {
    return { ok: false, error: `최소 ${plugin.minPlayers}명이 필요합니다.` };
  }
  room.status = "playing";
  room.winnerId = null;
  room.resultMessage = null;
  room.moveHistory = [];
  room.gameStartedAt = Date.now();
  room.gameState = plugin.initGameState(room);
  room.initialGameState = room.gameState;
  initRoomClocks(room);
  attachBroadcast(room);
  plugin.onGameStart?.(room);

  const gs = room.gameState as Record<string, unknown> | null;
  const firstTurn =
    (typeof gs?.turnUserId === "string" ? gs.turnUserId : null) ??
    (typeof gs?.blackUserId === "string" ? gs.blackUserId : null) ??
    [...room.players.keys()][0] ??
    null;
  setTurnUser(room, firstTurn);

  startClockTicker(room, () => {
    const win = checkClockTimeout(room);
    if (win && room.status === "playing") finishGame(room, win);
    else broadcastState(room);
  });

  const state = plugin.toPublicState(room);
  broadcastState(room);
  return { ok: true, state };
}

function notifyQueueWaiters(gameId: string) {
  if (!ioRef) return;
  const queue = matchQueues.get(gameId) ?? [];
  for (const entry of queue) {
    ioRef.to(entry.socketId).emit("minigame_match_queue", {
      gameId,
      queueSize: queue.length,
      message: "다른 유저를 찾고 있습니다…",
    });
  }
}

function startQueueTicker(gameId: string) {
  if (queueTimers.has(gameId)) return;
  queueTimers.set(
    gameId,
    setInterval(() => {
      const q = matchQueues.get(gameId) ?? [];
      if (q.length === 0) {
        const t = queueTimers.get(gameId);
        if (t) clearInterval(t);
        queueTimers.delete(gameId);
        return;
      }
      notifyQueueWaiters(gameId);
    }, 2500)
  );
}

function createPublicMatchRoom(
  gameId: string,
  entries: MatchQueueEntry[]
): { roomId: string; state: MinigamePublicState; socketIds: string[]; autoStarted: boolean } {
  const plugin = getPlugin(gameId)!;
  let roomId = generateRoomCode();
  while (getRoom(gameId, roomId)) roomId = generateRoomCode();

  const room: MinigameRoomInternal = {
    id: roomId,
    gameId,
    hostId: entries[0]!.userId,
    status: "lobby",
    accessMode: "public",
    requireFollow: false,
    players: new Map(),
    spectators: new Map(),
    gameState: null,
    winnerId: null,
    resultMessage: null,
    moveHistory: [],
    timers: [],
    spectatorChatEnabled: true,
    chatLog: [],
    timeControl: "unlimited",
  };

  for (const e of entries) {
    room.players.set(e.userId, {
      userId: e.userId,
      username: e.username,
      socketId: e.socketId,
      ready: true,
    });
    indexUser(gameId, e.userId, roomId);
  }

  rooms.set(roomStorageKey(gameId, roomId), room);
  attachBroadcast(room);

  let autoStarted = false;
  if (plugin.autoStartOnPublicMatch && room.players.size >= plugin.minPlayers) {
    startGameInternal(room);
    autoStarted = true;
  }

  const state = plugin.toPublicState(room);
  return { roomId, state, socketIds: entries.map((e) => e.socketId), autoStarted };
}

export function initMinigameStore(io: Server, prisma?: PrismaClient) {
  ioRef = io;
  prismaRef = prisma ?? null;
  if (prismaRef) void ensureDefaultSeason(prismaRef);
}

export function minigameCreate(
  gameId: string,
  roomId: string,
  userId: string,
  username: string,
  socketId: string,
  opts: MinigameCreateOptions = {}
) {
  const plugin = getPlugin(gameId);
  if (!plugin) return { ok: false as const, error: "지원하지 않는 게임입니다." };
  if (!isValidRoomCode(roomId)) return { ok: false as const, error: "유효하지 않은 방 코드입니다." };
  if (getRoom(gameId, roomId)) return { ok: false as const, error: "이미 사용 중인 방 코드입니다." };

  const room: MinigameRoomInternal = {
    id: roomId.toUpperCase(),
    gameId,
    hostId: userId,
    status: "lobby",
    accessMode: opts.accessMode ?? "private",
    passwordHash: opts.passwordHash,
    requireFollow: !!opts.requireFollow,
    players: new Map([
      [
        userId,
        { userId, username, socketId, ready: false, role: gameId === "omok" ? "black" : undefined },
      ],
    ]),
    spectators: new Map(),
    gameState: null,
    winnerId: null,
    resultMessage: null,
    moveHistory: [],
    timers: [],
    spectatorChatEnabled: opts.spectatorChat !== false,
    chatLog: [],
    timeControl: opts.timeControl ?? "unlimited",
    ruleMode: opts.ruleMode,
  };

  if (gameId === "omok" && opts.ruleMode) attachOmokRuleMode(room, opts.ruleMode);
  indexUser(gameId, userId, room.id);
  rooms.set(roomStorageKey(gameId, room.id), room);
  attachBroadcast(room);

  const state = plugin.toPublicState(room);
  return { ok: true as const, state };
}

export async function minigameJoin(
  gameId: string,
  roomId: string,
  userId: string,
  username: string,
  socketId: string,
  opts: MinigameJoinOptions = {}
) {
  const plugin = getPlugin(gameId);
  if (!plugin) return { ok: false as const, error: "지원하지 않는 게임입니다." };
  const room = getRoom(gameId, roomId);
  if (!room) return { ok: false as const, error: "방을 찾을 수 없습니다." };
  if (room.status === "playing" && !room.players.has(userId)) {
    return { ok: false as const, error: "게임이 이미 시작되었습니다." };
  }
  if (room.passwordHash && opts.verifyPassword) {
    if (!opts.password) return { ok: false as const, error: "비밀번호가 필요합니다." };
    const ok = await opts.verifyPassword(opts.password, room.passwordHash);
    if (!ok) return { ok: false as const, error: "비밀번호가 올바르지 않습니다." };
  }
  if (room.requireFollow && opts.canJoinRoom) {
    const ok = await opts.canJoinRoom(room, userId);
    if (!ok) return { ok: false as const, error: "팔로우한 호스트의 방만 입장할 수 있습니다." };
  }

  const existing = room.players.get(userId);
  if (existing) {
    existing.socketId = socketId;
    existing.username = username;
  } else {
    if (room.players.size >= maxPlayersFor(room, plugin)) {
      return { ok: false as const, error: "방이 가득 찼습니다." };
    }
    room.players.set(userId, {
      userId,
      username,
      socketId,
      ready: false,
      role: gameId === "omok" && room.players.size === 0 ? "black" : gameId === "omok" ? "white" : undefined,
    });
    indexUser(gameId, userId, room.id);
  }

  const state = plugin.toPublicState(room);
  broadcastState(room);
  return { ok: true as const, state };
}

export function minigameSpectate(
  gameId: string,
  roomId: string,
  userId: string,
  username: string,
  socketId: string
) {
  const plugin = getPlugin(gameId);
  if (!plugin) return { ok: false as const, error: "지원하지 않는 게임입니다." };
  const room = getRoom(gameId, roomId);
  if (!room) return { ok: false as const, error: "방을 찾을 수 없습니다." };
  if (room.players.has(userId)) {
    return { ok: false as const, error: "플레이어는 관전할 수 없습니다. 방에 참가 중입니다." };
  }

  room.spectators.set(userId, { userId, username, socketId });
  const state = plugin.toPublicState(room);
  broadcastState(room);
  return { ok: true as const, state };
}

export function minigameLeave(gameId: string, roomId: string, userId: string) {
  const room = getRoom(gameId, roomId);
  if (!room) return;

  if (room.spectators.has(userId)) {
    room.spectators.delete(userId);
    removeUserFromIndex(gameId, userId);
    broadcastState(room);
    return;
  }

  if (!room.players.has(userId)) return;
  room.players.delete(userId);
  removeUserFromIndex(gameId, userId);

  if (room.players.size === 0) {
    deleteRoom(room);
    return;
  }

  if (room.hostId === userId) transferHost(room);

  if (room.status === "playing") {
    const remaining = [...room.players.keys()][0];
    finishGame(room, {
      winnerId: remaining ?? "",
      resultMessage: "상대가 나갔습니다.",
    });
    broadcastState(room);
    return;
  }

  broadcastState(room);
}

export function minigameReady(
  gameId: string,
  roomId: string,
  userId: string,
  ready: boolean
) {
  const room = getRoom(gameId, roomId);
  if (!room || room.status !== "lobby") return { ok: false as const, error: "대기방이 아닙니다." };
  const player = room.players.get(userId);
  if (!player) return { ok: false as const, error: "플레이어가 아닙니다." };
  player.ready = ready;
  broadcastState(room);
  return { ok: true as const };
}

export function minigameStart(gameId: string, roomId: string, userId: string) {
  const room = getRoom(gameId, roomId);
  const plugin = getPlugin(gameId);
  if (!room || !plugin) return { ok: false as const, error: "방을 찾을 수 없습니다." };
  if (room.hostId !== userId) return { ok: false as const, error: "호스트만 시작할 수 있습니다." };
  if (room.status !== "lobby") return { ok: false as const, error: "이미 시작되었습니다." };
  const allReady = [...room.players.values()].every((p) => p.ready);
  if (!allReady) return { ok: false as const, error: "모든 플레이어가 준비해야 합니다." };
  return startGameInternal(room);
}

export function minigameMove(gameId: string, roomId: string, userId: string, move: unknown) {
  const room = getRoom(gameId, roomId);
  const plugin = getPlugin(gameId);
  if (!room || !plugin) return { ok: false as const, error: "방을 찾을 수 없습니다." };
  if (room.spectators.has(userId)) return { ok: false as const, error: "관전자는 수를 둘 수 없습니다." };

  if (!room.lastMoveAt) room.lastMoveAt = {};
  const now = Date.now();
  const lastAt = room.lastMoveAt[userId] ?? 0;
  if (now - lastAt < 80) return { ok: false as const, error: "너무 빠른 입력입니다." };
  room.lastMoveAt[userId] = now;

  const err = plugin.validateMove(room, userId, move);
  if (err) return { ok: false as const, error: err };

  plugin.applyMove(room, userId, move);
  setTurnUser(room, extractTurnUserId(room));

  const clockWin = checkClockTimeout(room);
  if (clockWin) {
    finishGame(room, clockWin);
    return { ok: true as const, state: plugin.toPublicState(room) };
  }

  const win = plugin.checkWin(room);
  if (win) {
    finishGame(room, win);
    return { ok: true as const, state: plugin.toPublicState(room) };
  }

  if (room.status === "finished") {
    broadcastState(room);
    return { ok: true as const, state: plugin.toPublicState(room) };
  }

  broadcastState(room);
  return { ok: true as const, state: plugin.toPublicState(room) };
}

export function minigameMatchEnqueue(gameId: string, userId: string, username: string, socketId: string) {
  const plugin = getPlugin(gameId);
  if (!plugin) return { ok: false as const, error: "지원하지 않는 게임입니다." };

  minigameMatchCancel(gameId, userId);

  const queue = matchQueues.get(gameId) ?? [];
  matchQueues.set(gameId, queue);

  for (const room of rooms.values()) {
    if (room.gameId !== gameId || room.accessMode !== "public" || room.status !== "lobby") continue;
    if (room.players.size >= maxPlayersFor(room, plugin)) continue;
    if (room.players.has(userId)) continue;
    room.players.set(userId, {
      userId,
      username,
      socketId,
      ready: true,
      role: gameId === "omok" ? "white" : undefined,
    });
    indexUser(gameId, userId, room.id);
    const state = plugin.toPublicState(room);
    broadcastState(room);
    return {
      ok: true as const,
      status: "matched" as const,
      roomId: room.id,
      state,
      socketIds: [...room.players.values()].map((p) => p.socketId),
      autoStarted: false,
    };
  }

  queue.push({ gameId, userId, username, socketId, joinedAt: Date.now() });
  startQueueTicker(gameId);
  notifyQueueWaiters(gameId);
  return { ok: true as const, status: "waiting" as const, queueSize: queue.length };
}

export function minigameMatchCancel(gameId: string, userId: string) {
  const queue = matchQueues.get(gameId);
  if (!queue) return;
  const next = queue.filter((e) => e.userId !== userId);
  if (next.length) matchQueues.set(gameId, next);
  else matchQueues.delete(gameId);
}

export function minigameMatchCancelAll(userId: string) {
  for (const gameId of plugins.keys()) {
    minigameMatchCancel(gameId, userId);
  }
}

export function minigameMatchFlush(gameId: string) {
  const plugin = getPlugin(gameId);
  if (!plugin) return;
  const queue = matchQueues.get(gameId) ?? [];
  if (queue.length < plugin.minPlayers) return;

  const batchSize = Math.min(plugin.maxPlayersPublic ?? plugin.maxPlayers, queue.length);
  const batch = queue.splice(0, batchSize);
  matchQueues.set(gameId, queue);

  const result = createPublicMatchRoom(gameId, batch);
  return result;
}

// Called from match handler after enqueue if enough players
export function tryMatchFromQueue(gameId: string) {
  const plugin = getPlugin(gameId);
  if (!plugin) return null;
  const queue = matchQueues.get(gameId) ?? [];
  while (queue.length >= plugin.minPlayers) {
    const batchSize = Math.min(plugin.maxPlayersPublic ?? plugin.maxPlayers, queue.length);
    const batch = queue.splice(0, batchSize);
    matchQueues.set(gameId, queue);
    return createPublicMatchRoom(gameId, batch);
  }
  return null;
}

/** MMR 근접 매칭 (2인 랭크 게임) */
export async function tryMatchFromQueueMmr(gameId: string): Promise<ReturnType<typeof createPublicMatchRoom> | null> {
  const plugin = getPlugin(gameId);
  if (!plugin || !prismaRef) return tryMatchFromQueue(gameId);

  const queue = matchQueues.get(gameId) ?? [];
  if (queue.length < plugin.minPlayers) return null;

  if (plugin.minPlayers === 2 && (plugin.maxPlayersPublic ?? plugin.maxPlayers) === 2) {
    const withMmr = await Promise.all(
      queue.map(async (e) => {
        const r = await prismaRef!.minigameRating.findUnique({
          where: { userId_gameId: { userId: e.userId, gameId } },
        });
        return { entry: e, mmr: r?.mmr ?? 1000 };
      })
    );
    let bestA = 0;
    let bestB = 1;
    let bestDiff = Math.abs(withMmr[0]!.mmr - withMmr[1]!.mmr);
    for (let i = 0; i < withMmr.length; i++) {
      for (let j = i + 1; j < withMmr.length; j++) {
        const diff = Math.abs(withMmr[i]!.mmr - withMmr[j]!.mmr);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestA = i;
          bestB = j;
        }
      }
    }
    const batch = [withMmr[bestA]!.entry, withMmr[bestB]!.entry];
    const rest = queue.filter((e) => !batch.some((b) => b.userId === e.userId));
    matchQueues.set(gameId, rest);
    return createPublicMatchRoom(gameId, batch);
  }

  return tryMatchFromQueue(gameId);
}

export function minigameRematch(gameId: string, roomId: string, userId: string) {
  const room = getRoom(gameId, roomId);
  const plugin = getPlugin(gameId);
  if (!room || !plugin) return { ok: false as const, error: "방을 찾을 수 없습니다." };
  if (room.status !== "finished") return { ok: false as const, error: "게임이 끝난 뒤에만 가능합니다." };
  if (room.hostId !== userId) return { ok: false as const, error: "호스트만 재대국을 요청할 수 있습니다." };

  clearRoomTimers(room);
  room.status = "lobby";
  room.winnerId = null;
  room.resultMessage = null;
  room.lastMatchId = undefined;
  room.gameState = null;
  room.moveHistory = [];
  room.lastMoveAt = {};
  room.gameStartedAt = undefined;
  room.initialGameState = undefined;
  for (const p of room.players.values()) p.ready = false;

  broadcastState(room);
  return { ok: true as const, state: plugin.toPublicState(room) };
}

export function minigameUpdateSocket(gameId: string, roomId: string, userId: string, socketId: string) {
  const room = getRoom(gameId, roomId);
  if (!room) return;
  const p = room.players.get(userId) ?? room.spectators.get(userId);
  if (p) p.socketId = socketId;
}

export function getMinigameState(gameId: string, roomId: string): MinigamePublicState | null {
  const room = getRoom(gameId, roomId);
  const plugin = getPlugin(gameId);
  if (!room || !plugin) return null;
  return plugin.toPublicState(room);
}

export function listLiveMinigameRooms(gameId: string): MinigamePublicState[] {
  const plugin = getPlugin(gameId);
  if (!plugin) return [];
  return [...rooms.values()]
    .filter((r) => r.gameId === gameId && (r.status === "playing" || r.accessMode === "public"))
    .map((r) => plugin.toPublicState(r));
}

export type LiveMinigameRoomSummary = {
  gameId: string;
  roomId: string;
  status: RoomStatus;
  playerCount: number;
  spectatorCount: number;
  players: { username: string }[];
  timeControl?: string;
};

export function listLiveMinigameRoomSummaries(gameId?: string): LiveMinigameRoomSummary[] {
  return [...rooms.values()]
    .filter((r) => r.status === "playing" && (!gameId || r.gameId === gameId))
    .map((r) => ({
      gameId: r.gameId,
      roomId: r.id,
      status: r.status,
      playerCount: r.players.size,
      spectatorCount: r.spectators.size,
      players: [...r.players.values()].map((p) => ({ username: p.username })),
      timeControl: r.timeControl,
    }));
}

export function minigameChat(
  gameId: string,
  roomId: string,
  userId: string,
  username: string,
  text: string
) {
  const room = getRoom(gameId, roomId);
  if (!room) return { ok: false as const, error: "방 없음" };
  const trimmed = text.trim().slice(0, 200);
  if (!trimmed) return { ok: false as const, error: "메시지 없음" };
  const isPlayer = room.players.has(userId);
  const isSpectator = room.spectators.has(userId);
  if (!isPlayer && !isSpectator) return { ok: false as const, error: "참가자만 채팅 가능" };
  if (!isPlayer && isSpectator && !room.spectatorChatEnabled) {
    return { ok: false as const, error: "관전 채팅이 꺼져 있습니다" };
  }
  const msg = { userId, username, text: trimmed, at: Date.now() };
  room.chatLog.push(msg);
  if (room.chatLog.length > 100) room.chatLog.shift();
  if (ioRef) {
    ioRef.to(roomKey(gameId, room.id)).emit("minigame_chat", { gameId, roomId: room.id, message: msg });
  }
  broadcastState(room);
  return { ok: true as const };
}

export { roomKey, getPlugin };
