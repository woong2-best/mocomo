import type { MarketplaceSellerOnboardingStep } from "@prisma/client";

/** 온보딩 단계 순서 — 2차 Seller Center 확장 시 동일 enum 재사용 */
export const SELLER_ONBOARDING_STEPS = [
  "ACCOUNT",
  "AGREEMENTS",
  "EMAIL",
  "PHONE",
  "SELLER_INFO",
  "KYC",
  "SETTLEMENT",
  "COMPLETE",
] as const satisfies readonly MarketplaceSellerOnboardingStep[];

export type SellerOnboardingStepId = (typeof SELLER_ONBOARDING_STEPS)[number];

export const SELLER_ONBOARDING_STEP_LABELS: Record<SellerOnboardingStepId, string> = {
  ACCOUNT: "계정",
  AGREEMENTS: "약관",
  EMAIL: "이메일",
  PHONE: "휴대폰",
  SELLER_INFO: "판매자 정보",
  KYC: "본인 인증",
  SETTLEMENT: "정산",
  COMPLETE: "완료",
};

export function sellerOnboardingStepIndex(step: MarketplaceSellerOnboardingStep): number {
  const idx = SELLER_ONBOARDING_STEPS.indexOf(step as SellerOnboardingStepId);
  return idx < 0 ? 0 : idx;
}

export function nextSellerOnboardingStep(
  step: MarketplaceSellerOnboardingStep
): MarketplaceSellerOnboardingStep {
  const idx = sellerOnboardingStepIndex(step);
  return SELLER_ONBOARDING_STEPS[Math.min(idx + 1, SELLER_ONBOARDING_STEPS.length - 1)];
}

/** 판매시장 (1차: 한국 중심, 구조만 확장 가능) */
export const SELLER_MARKETS = [
  { code: "KR", labelKo: "한국", labelEn: "Korea" },
] as const;
