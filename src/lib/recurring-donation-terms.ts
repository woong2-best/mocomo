/** ROSCA / FTC — creator recurring donation disclosure (v1) */
export const RECURRING_DONATION_TERMS_VERSION = "2026-09-v1";

/** Short notice above pay button (KR) */
export const RECURRING_DONATION_CHECKOUT_NOTICE_KO =
  "매월 자동 결제되는 정기 후원입니다. 결제가 완료된 후원금은 환불되지 않으며, [마이페이지]에서 언제든지 향후 결제를 취소하실 수 있습니다.";

/** Checkbox label (KR) — must be explicitly opted in (default unchecked) */
export const RECURRING_DONATION_CHECKBOX_LABEL_KO =
  "이미 처리된 후원금은 환불되지 않으며, 다음 달 자동 결제는 언제든지 취소할 수 있음을 확인했습니다.";

/** Terms of Service clause (EN) — required in legal/terms */
export const RECURRING_DONATION_TOS_CLAUSE_EN =
  "All recurring donations are non-refundable once processed. You may cancel your subscription at any time to prevent future charges.";

export const RECURRING_DONATION_TOS_CLAUSE_KO =
  "정기 후원(구독)으로 처리된 후원금은 원칙적으로 환불되지 않으며, 언제든지 구독을 해지하여 이후 청구를 중단할 수 있습니다.";

export const RECURRING_DONATION_TERMS_REQUIRED_ERROR =
  "정기 후원 약관에 동의해 주세요.";

export function buildRecurringDonationTermsSnapshot(): string {
  return [
    RECURRING_DONATION_CHECKOUT_NOTICE_KO,
    RECURRING_DONATION_CHECKBOX_LABEL_KO,
    RECURRING_DONATION_TOS_CLAUSE_EN,
  ].join("\n");
}
