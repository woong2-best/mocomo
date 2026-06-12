export type GamePlayMode = "friends" | "match";

export type GameCreateOptions = {
  password?: string;
  requireFollow?: boolean;
};

export type GameJoinOptions = {
  password?: string;
};

export const GAME_CREATE_OPTIONS_KEY = "mocomo:game-create-options";
export const GAME_JOIN_OPTIONS_KEY = "mocomo:game-join-options";

export function saveGameCreateOptions(gameId: string, opts: GameCreateOptions) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${GAME_CREATE_OPTIONS_KEY}:${gameId}`, JSON.stringify(opts));
}

export function readGameCreateOptions(gameId: string): GameCreateOptions | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${GAME_CREATE_OPTIONS_KEY}:${gameId}`);
    if (!raw) return null;
    sessionStorage.removeItem(`${GAME_CREATE_OPTIONS_KEY}:${gameId}`);
    return JSON.parse(raw) as GameCreateOptions;
  } catch {
    return null;
  }
}

export function saveGameJoinOptions(gameId: string, opts: GameJoinOptions) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${GAME_JOIN_OPTIONS_KEY}:${gameId}`, JSON.stringify(opts));
}

export function readGameJoinOptions(gameId: string): GameJoinOptions | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${GAME_JOIN_OPTIONS_KEY}:${gameId}`);
    if (!raw) return null;
    sessionStorage.removeItem(`${GAME_JOIN_OPTIONS_KEY}:${gameId}`);
    return JSON.parse(raw) as GameJoinOptions;
  } catch {
    return null;
  }
}
