/** Repeat Violators Policy — Stripe due diligence & internal ops reference */

export const REPEAT_VIOLATORS_WARNING_THRESHOLD = 3;

export const REPEAT_VIOLATORS_POLICY = {
  title: "Repeat Violators Policy",
  summary:
    "After three community-guideline warnings on the same account, we apply permanent suspension and block payouts and settlements.",
  steps: [
    {
      warnings: "1–2 times",
      action: "Content removal, warning notice, higher risk score",
    },
    {
      warnings: "3 times",
      action: "Permanent suspension, creator/seller payout block, Stripe Connect settlement halt",
    },
    {
      warnings: "Severe violation",
      action: "Immediate permanent suspension without warning, payout block, law-enforcement report when needed",
    },
  ],
  severeViolationReasons: [
    "Child sexual abuse and exploitation",
    "Terrorism and violent extremism",
    "Large-scale fraud and phishing",
  ],
} as const;

export function shouldAutoEscalateToPermanentBan(warningCount: number): boolean {
  return warningCount >= REPEAT_VIOLATORS_WARNING_THRESHOLD;
}

export function repeatViolatorsEscalationReason(warningCount: number): string {
  return `반복 위반자 정책 — ${warningCount}회 경고 누적 (3회 기준 영구 정지 및 수익 차단)`;
}
