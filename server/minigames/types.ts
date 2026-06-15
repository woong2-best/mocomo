import type { MinigamePlayerPublic, MinigamePublicState, MinigameRoomPublicBase, MinigameChatMessage } from "../../src/lib/minigames/shared-types";

export type MinigamePlayerInternal = {
  userId: string;
  username: string;
  socketId: string;
  ready: boolean;
  role?: string;
};

export type MinigameSpectatorInternal = {
  userId: string;
  username: string;
  socketId: string;
};

export type RoomStatus = "lobby" | "playing" | "finished";

export type MinigameRoomInternal = {
  id: string;
  gameId: string;
  hostId: string;
  status: RoomStatus;
  accessMode: "private" | "public";
  passwordHash?: string;
  requireFollow: boolean;
  players: Map<string, MinigamePlayerInternal>;
  spectators: Map<string, MinigameSpectatorInternal>;
  gameState: unknown;
  winnerId: string | null;
  resultMessage: string | null;
  moveHistory: unknown[];
  timers: ReturnType<typeof setTimeout>[];
  timeControl?: string;
  clocks?: Record<string, number>;
  incrementMs?: number;
  turnStartedAt?: number;
  turnUserId?: string | null;
  spectatorChatEnabled: boolean;
  chatLog: MinigameChatMessage[];
  lastMatchId?: string;
  lastMoveAt?: Record<string, number>;
  gameStartedAt?: number;
  initialGameState?: unknown;
  ruleMode?: "free" | "renju";
  spotDiffPlayStyle?: "normal" | "infinite";
  pianoRushMode?: "solo" | "duel" | "battle";
  pianoRushChartId?: string;
  parkingRushMode?: "solo" | "duel" | "ranked" | "time_attack";
  parkingRushLevelId?: string;
  parkingRushDifficulty?: "beginner" | "intermediate" | "advanced" | "expert";
  parkingRushCarColor?: string;
};

export type MinigameCreateOptions = {
  accessMode?: "private" | "public";
  passwordHash?: string;
  requireFollow?: boolean;
  ruleMode?: "free" | "renju";
  timeControl?: string;
  spectatorChat?: boolean;
  spotDiffPlayStyle?: "normal" | "infinite";
  pianoRushMode?: "solo" | "duel" | "battle";
  pianoRushChartId?: string;
  parkingRushMode?: "solo" | "duel" | "ranked" | "time_attack";
  parkingRushLevelId?: string;
  parkingRushDifficulty?: "beginner" | "intermediate" | "advanced" | "expert";
  parkingRushCarColor?: string;
};

export type MinigameJoinOptions = {
  password?: string;
  verifyPassword?: (password: string, hash: string) => Promise<boolean>;
  canJoinRoom?: (room: MinigameRoomInternal, userId: string) => Promise<boolean>;
};

export type MinigamePlugin = {
  id: string;
  minPlayers: number;
  maxPlayers: number;
  maxPlayersPublic?: number;
  autoStartOnPublicMatch?: boolean;
  initGameState: (room: MinigameRoomInternal) => unknown;
  toPublicState: (room: MinigameRoomInternal) => MinigamePublicState;
  validateMove: (room: MinigameRoomInternal, userId: string, move: unknown) => string | null;
  applyMove: (room: MinigameRoomInternal, userId: string, move: unknown) => void;
  checkWin: (room: MinigameRoomInternal) => { winnerId: string; resultMessage: string } | null;
  /** false 반환 시 클라에 에러만 표시. true면 게임 상태 갱신(탈락 등) */
  onMoveRejected?: (
    room: MinigameRoomInternal,
    userId: string,
    move: unknown,
    reason: string
  ) => boolean;
  onGameStart?: (room: MinigameRoomInternal) => void;
  onGameEnd?: (room: MinigameRoomInternal) => void;
  clearTimers?: (room: MinigameRoomInternal) => void;
};

export function basePublicFields(room: MinigameRoomInternal): MinigameRoomPublicBase {
  const players: MinigamePlayerPublic[] = [...room.players.values()].map((p) => ({
    userId: p.userId,
    username: p.username,
    ready: p.ready,
    role: p.role,
  }));

  let turnTimeLeft: number | undefined;
  if (room.timeControl && room.timeControl !== "unlimited" && room.turnUserId && room.turnStartedAt && room.clocks) {
    const elapsed = Date.now() - room.turnStartedAt;
    const left = (room.clocks[room.turnUserId] ?? 0) - elapsed;
    turnTimeLeft = Math.max(0, Math.ceil(left / 1000));
  }

  const clocksSec: Record<string, number> | undefined = room.clocks
    ? Object.fromEntries(
        Object.entries(room.clocks).map(([k, v]) => {
          const elapsed = room.turnUserId === k && room.turnStartedAt ? Date.now() - room.turnStartedAt : 0;
          return [k, Math.max(0, Math.ceil((v - elapsed) / 1000))];
        })
      )
    : undefined;

  return {
    roomId: room.id,
    gameId: room.gameId,
    hostId: room.hostId,
    status: room.status,
    accessMode: room.accessMode,
    players,
    spectatorCount: room.spectators.size,
    winnerId: room.winnerId,
    resultMessage: room.resultMessage,
    matchId: room.lastMatchId ?? null,
    timeControl: room.timeControl,
    clocks: clocksSec,
    turnTimeLeft,
    spectatorChatEnabled: room.spectatorChatEnabled,
    recentChat: room.chatLog.slice(-30),
    passwordRequired: !!room.passwordHash,
    parkingRushMode: room.parkingRushMode,
  };
}
