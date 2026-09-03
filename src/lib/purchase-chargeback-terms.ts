/**
 * Purchase terms shown before every card / wallet charge.
 * Keep wording identical on web and mobile — used as Stripe dispute evidence.
 */
export const PURCHASE_CHARGEBACK_TERMS_VERSION = "2026-03";

export const PURCHASE_CHARGEBACK_TERMS_TITLE = "결제 전 확인";

export const PURCHASE_CHARGEBACK_TERMS_BULLETS = [
  "본인은 만 18세 이상이며, MoCoMo 이용약관 및 결제·환불 정책에 동의합니다.",
  "타인의 카드·결제 수단을 무단으로 사용한 경우, 그에 따른 모든 법적·금전적 책임은 본인에게 있습니다.",
  "디지털 콘텐츠·유료 서비스는 결제 완료 즉시 제공되며, 관련 법령 및 이용약관에 따라 환불이 제한될 수 있습니다.",
  "부당한 환불·차지백(Chargeback) 신청 시 계정 제한 및 법적 대응이 가능합니다.",
] as const;

export const PURCHASE_CHARGEBACK_TERMS_CHECKBOX_LABEL =
  "위 내용을 확인하였으며, 결제 진행에 동의합니다.";

/** Full text persisted on consent — must match what the user saw. */
export function buildPurchaseChargebackTermsSnapshot(): string {
  const lines = [
    `${PURCHASE_CHARGEBACK_TERMS_TITLE} (v${PURCHASE_CHARGEBACK_TERMS_VERSION})`,
    ...PURCHASE_CHARGEBACK_TERMS_BULLETS.map((b) => `• ${b}`),
    PURCHASE_CHARGEBACK_TERMS_CHECKBOX_LABEL,
  ];
  return lines.join("\n");
}

export const PURCHASE_CHARGEBACK_TERMS_SNAPSHOT = buildPurchaseChargebackTermsSnapshot();

export type PurchaseTermsPlatform = "web" | "mobile";
