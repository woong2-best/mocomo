/** 라이브 방송 오버레이 — 돌림판·추첨·텍스트 (시청자 CSS 동기화, WHIP 미변경) */

export type LiveOverlayWidgetType = "text" | "wheel" | "lottery";

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

export type LiveOverlayWidgetProps =
  | LiveOverlayTextProps
  | LiveOverlayWheelProps
  | LiveOverlayLotteryProps;

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
