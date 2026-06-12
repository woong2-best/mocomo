export type GamePlayMode = "friends" | "match";

/** 방 비밀번호 최소 길이 (생성·입장 공통) */
export const MIN_GAME_ROOM_PASSWORD_LENGTH = 4;
export const MAX_GAME_ROOM_PASSWORD_LENGTH = 32;

export type GameCreateOptions = {
  password?: string;
  requireFollow?: boolean;
  ruleMode?: "free" | "renju";
  timeControl?: string;
  spectatorChat?: boolean;
};

export type GameJoinOptions = {
  password?: string;
};

export function isValidGameRoomPassword(password: string): boolean {
  const p = password.trim();
  return p.length >= MIN_GAME_ROOM_PASSWORD_LENGTH && p.length <= MAX_GAME_ROOM_PASSWORD_LENGTH;
}

export const GAME_CREATE_OPTIONS_KEY = "mocomo:game-create-options";
export const GAME_JOIN_OPTIONS_KEY = "mocomo:game-join-options";

export function saveGameCreateOptions(gameId: string, opts: GameCreateOptions) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${GAME_CREATE_OPTIONS_KEY}:${gameId}`, JSON.stringify(opts));
}

export function peekGameCreateOptions(gameId: string): GameCreateOptions | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${GAME_CREATE_OPTIONS_KEY}:${gameId}`);
    if (!raw) return null;
    return JSON.parse(raw) as GameCreateOptions;
  } catch {
    return null;
  }
}

export function clearGameCreateOptions(gameId: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`${GAME_CREATE_OPTIONS_KEY}:${gameId}`);
}

export function readGameCreateOptions(gameId: string): GameCreateOptions | null {
  const opts = peekGameCreateOptions(gameId);
  if (opts) clearGameCreateOptions(gameId);
  return opts;
}

export function saveGameJoinOptions(gameId: string, opts: GameJoinOptions) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${GAME_JOIN_OPTIONS_KEY}:${gameId}`, JSON.stringify(opts));
}

export function peekGameJoinOptions(gameId: string): GameJoinOptions | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${GAME_JOIN_OPTIONS_KEY}:${gameId}`);
    if (!raw) return null;
    return JSON.parse(raw) as GameJoinOptions;
  } catch {
    return null;
  }
}

export function clearGameJoinOptions(gameId: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`${GAME_JOIN_OPTIONS_KEY}:${gameId}`);
}

export function readGameJoinOptions(gameId: string): GameJoinOptions | null {
  const opts = peekGameJoinOptions(gameId);
  if (opts) clearGameJoinOptions(gameId);
  return opts;
}
