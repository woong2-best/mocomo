export type SketchQuizStatus = "lobby" | "playing" | "round_end" | "finished";

export type SketchStroke = {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
};

export type SketchQuizPlayer = {
  userId: string;
  username: string;
  score: number;
  isHost: boolean;
  isDrawer: boolean;
};

export type SketchQuizGuess = {
  userId: string;
  username: string;
  text: string;
  correct: boolean;
  at: number;
};

/** 클라이언트에 전달되는 공개 방 상태 (정답 단어 제외) */
export type SketchQuizPublicState = {
  roomId: string;
  hostId: string;
  status: SketchQuizStatus;
  accessMode: "private" | "public";
  hasPassword: boolean;
  requireFollow: boolean;
  players: SketchQuizPlayer[];
  round: number;
  maxRounds: number;
  drawerId: string | null;
  category: string | null;
  wordLength: number;
  timeLeft: number;
  strokes: SketchStroke[];
  recentGuesses: SketchQuizGuess[];
  lastCorrect: { userId: string; username: string; word: string } | null;
  roundMessage: string | null;
};

export type SketchQuizWordPayload = {
  word: string;
  category: string;
};
