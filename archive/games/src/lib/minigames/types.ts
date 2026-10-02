/** 미니게임 플랫폼 — 공통 타입 (확장용) */

export type MinigameCategory = "board" | "word" | "puzzle" | "casual";

export type MinigameStatus = "live" | "beta" | "coming_soon" | "hidden";

export type MatchMode = "random" | "friend" | "code" | "public" | "private";

export type TimeControlPreset =
  | "unlimited"
  | "30s"
  | "1m"
  | "3m"
  | "5m"
  | "10m"
  | "1m+2s"
  | "3m+2s"
  | "5m+3s"
  | "10m+5s";

export type MinigameTier =
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "DIAMOND"
  | "MASTER"
  | "GRANDMASTER"
  | "CHALLENGER";

export type MinigameDefinition = {
  id: string;
  name: string;
  category: MinigameCategory;
  status: MinigameStatus;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  /** 플레이 가능 시 라우트 */
  href?: string;
  supportsSpectate: boolean;
  supportsRanked: boolean;
  supportsReplay: boolean;
};

export type MinigameRoomMode = {
  random: boolean;
  friendInvite: boolean;
  roomCode: boolean;
  publicRoom: boolean;
  privateRoom: boolean;
};

export const DEFAULT_ROOM_MODES: MinigameRoomMode = {
  random: true,
  friendInvite: true,
  roomCode: true,
  publicRoom: true,
  privateRoom: true,
};

export const CATEGORY_LABELS: Record<MinigameCategory, string> = {
  board: "보드게임",
  word: "단어 게임",
  puzzle: "퍼즐",
  casual: "캐주얼",
};

export const CATEGORY_ORDER: MinigameCategory[] = ["board", "word", "puzzle", "casual"];
