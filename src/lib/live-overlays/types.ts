/** 라이브 방송 오버레이 — 텍스트 (시청자 CSS 동기화, WHIP 미포함) */

export type LiveOverlayWidgetType = "text";

export type LiveOverlayTextProps = {
  content: string;
  fontSize: number;
  color: string;
  background: string;
  bold: boolean;
  align: "left" | "center" | "right";
};

export type LiveOverlayWidgetProps = LiveOverlayTextProps;

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
