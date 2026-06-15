/** 클라이언트·서버 공유 미니게임 타입 */

export type MinigameRoomStatus = "lobby" | "playing" | "finished";

export type MinigamePlayerPublic = {
  userId: string;
  username: string;
  ready: boolean;
  role?: string;
};

export type MinigameRoomPublicBase = {
  roomId: string;
  gameId: string;
  hostId: string;
  status: MinigameRoomStatus;
  accessMode: "private" | "public";
  players: MinigamePlayerPublic[];
  spectatorCount: number;
  winnerId: string | null;
  resultMessage: string | null;
  matchId?: string | null;
  timeControl?: string;
  clocks?: Record<string, number>;
  turnTimeLeft?: number;
  spectatorChatEnabled?: boolean;
  recentChat?: MinigameChatMessage[];
  /** 입장 시 비밀번호 필요 여부 */
  passwordRequired?: boolean;
  parkingRushMode?: "solo" | "duel" | "ranked" | "time_attack";
  omokMode?: "pvp" | "solo";
  omokAiDifficulty?: "easy" | "normal" | "hard";
  cpuOpponent?: boolean;
  aiDifficulty?: "easy" | "normal" | "hard";
};

export type MinigameChatMessage = {
  userId: string;
  username: string;
  text: string;
  at: number;
};

/** 모든 게임 공통 퍼블릭 상태 — game 페이로드는 게임별 JSON */
export type MinigamePublicState = MinigameRoomPublicBase & {
  game: Record<string, unknown> | null;
};

export type OmokMove = { x: number; y: number };

export type RpsChoice = "rock" | "paper" | "scissors";

/** @deprecated OmokPublicState — MinigamePublicState.game 사용 */
export type OmokPublicState = MinigamePublicState;

export type RpsPublicState = MinigamePublicState;

export type WordChainPublicState = MinigamePublicState;
