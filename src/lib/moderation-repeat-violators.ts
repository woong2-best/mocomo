/** Repeat Violators Policy — Stripe due diligence & internal ops reference */

export const REPEAT_VIOLATORS_WARNING_THRESHOLD = 3;

export const REPEAT_VIOLATORS_POLICY = {
  title: "반복 위반자 정책 (Repeat Violators Policy)",
  summary:
    "동일 계정에 운영원칙 위반 경고가 3회 누적되면 영구 정지 및 수익·정산 차단을 적용합니다.",
  steps: [
    {
      warnings: "1~2회",
      action: "콘텐츠 삭제, 경고 알림, 위험도 점수 상승",
    },
    {
      warnings: "3회",
      action: "영구 정지, 크리에이터·판매자 수익 차단, Stripe Connect 정산 중단",
    },
    {
      warnings: "중대 위반",
      action: "경고 없이 즉시 영구 정지, 수익 차단, 필요 시 법 집행 기관 신고",
    },
  ],
  severeViolationReasons: [
    "아동·청소년 성착취·유해 콘텐츠",
    "테러·폭력적 극단주의 선동",
    "대규모 사기·피싱",
  ],
} as const;

export function shouldAutoEscalateToPermanentBan(warningCount: number): boolean {
  return warningCount >= REPEAT_VIOLATORS_WARNING_THRESHOLD;
}

export function repeatViolatorsEscalationReason(warningCount: number): string {
  return `반복 위반자 정책 — ${warningCount}회 경고 누적 (3회 기준 영구 정지 및 수익 차단)`;
}
