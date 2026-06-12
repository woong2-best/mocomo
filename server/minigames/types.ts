import type { MinigamePlayerPublic, MinigamePublicState, MinigameRoomPublicBase } from "../../src/lib/minigames/shared-types";

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
};

export type MinigameCreateOptions = {
  accessMode?: "private" | "public";
  passwordHash?: string;
  requireFollow?: boolean;
  ruleMode?: "free" | "renju";
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
  };
}
