/** 이웃 집 방문 퍼널 — UI용 (신규 사용자 완료율) */
export type VisitFunnelState = {
  targetName: string;
  targetFloor: number;
  /** 1=층 이동 2=복도 3=입장 */
  step: 1 | 2 | 3;
  canEnter: boolean;
  atDoor: boolean;
  phaseLabel: string;
  hint: string;
};
