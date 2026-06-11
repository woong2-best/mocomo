/** 라이브 방송 오버레이 — 돌림판·추첨·텍스트 (시청자 CSS 동기화, WHIP 미변경) */

export type LiveOverlayWidgetType = "text" | "wheel" | "lottery" | "quiz" | "wordGuess";

export type LiveOverlayTextProps = {
  content: string;
  fontSize: number;
  color: string;
  background: string;
  bold: boolean;
  align: "left" | "center" | "right";
};

export type LiveOverlayWheelSegment = {
  id: string;
  label: string;
  weight: number;
};

export type LiveOverlayWheelProps = {
  title: string;
  segments: LiveOverlayWheelSegment[];
  /** 0–360 누적 회전 (시청자 애니메이션) */
  rotation: number;
  spinning: boolean;
  lastResult: string | null;
};

export type LiveOverlayLotteryProps = {
  title: string;
  entries: string[];
  winner: string | null;
  drawing: boolean;
  removeWinner: boolean;
  history: string[];
};

export type LiveOverlayQuizScore = { username: string; score: number };

export type LiveOverlayQuizProps = {
  title: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  phase: "idle" | "active" | "reveal";
  timeLeft: number;
  durationSec: number;
  scores: LiveOverlayQuizScore[];
  answeredIds: string[];
  lastWinner: string | null;
  points: number;
};

export type LiveOverlayWordGuessEntry = {
  username: string;
  text: string;
  correct: boolean;
};

export type LiveOverlayWordGuessProps = {
  title: string;
  category: string;
  answer: string;
  hint: string;
  phase: "idle" | "active" | "reveal";
  timeLeft: number;
  durationSec: number;
  winner: string | null;
  recentGuesses: LiveOverlayWordGuessEntry[];
};

export type LiveOverlayWidgetProps =
  | LiveOverlayTextProps
  | LiveOverlayWheelProps
  | LiveOverlayLotteryProps
  | LiveOverlayQuizProps
  | LiveOverlayWordGuessProps;

export type LiveOverlayWidget = {
  id: string;
  type: LiveOverlayWidgetType;
  /** 미리보기 영역 기준 % (0–100) */
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  visible: boolean;
  props: LiveOverlayWidgetProps;
};

export type LiveOverlayState = {
  version: number;
  widgets: LiveOverlayWidget[];
};

export type LiveOverlayStatePayload = {
  channelId: string;
  state: LiveOverlayState;
};
