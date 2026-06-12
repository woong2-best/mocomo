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
};

export type OmokMove = { x: number; y: number };

export type OmokPublicState = MinigameRoomPublicBase & {
  game: {
    board: number[][];
    turn: "black" | "white" | null;
    turnUserId: string | null;
    lastMove: OmokMove | null;
    ruleMode: "free" | "renju";
    blackUserId: string;
    whiteUserId: string;
  } | null;
};

export type RpsChoice = "rock" | "paper" | "scissors";

export type RpsPublicState = MinigameRoomPublicBase & {
  game: {
    round: number;
    maxRounds: number;
    scores: Record<string, number>;
    phase: "pick" | "reveal" | "round_end" | "done";
    picks: Record<string, RpsChoice | null>;
    lastRound?: { picks: Record<string, RpsChoice>; winnerId: string | null };
  } | null;
};

export type WordChainPublicState = MinigameRoomPublicBase & {
  game: {
    currentWord: string | null;
    turnUserId: string | null;
    usedWords: string[];
    turnEndsAt: number | null;
    timeLeft: number;
  } | null;
};

export type MinigamePublicState = OmokPublicState | RpsPublicState | WordChainPublicState;
