import type { MarketplaceSellerOnboardingStep } from "@prisma/client";
import { sellerRequiresPhoneVerification } from "@/lib/marketplace/seller-region-policy";

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

/** 국가별 표시 단계 — 해외는 PHONE 숨김 */
export function visibleSellerOnboardingSteps(
  countryCode: string | null | undefined
): SellerOnboardingStepId[] {
  const requirePhone = sellerRequiresPhoneVerification(countryCode);
  return SELLER_ONBOARDING_STEPS.filter(
    (s) => s !== "COMPLETE" && (requirePhone || s !== "PHONE")
  );
}

/** 판매 국가/시장 — 글로벌 Marketplace */
export const SELLER_MARKETS = [
  { code: "KR", labelKo: "한국", labelEn: "Korea" },
  { code: "US", labelKo: "미국", labelEn: "United States" },
  { code: "JP", labelKo: "일본", labelEn: "Japan" },
  { code: "CN", labelKo: "중국", labelEn: "China" },
  { code: "HK", labelKo: "홍콩", labelEn: "Hong Kong" },
  { code: "TW", labelKo: "대만", labelEn: "Taiwan" },
  { code: "SG", labelKo: "싱가포르", labelEn: "Singapore" },
  { code: "GB", labelKo: "영국", labelEn: "United Kingdom" },
  { code: "DE", labelKo: "독일", labelEn: "Germany" },
  { code: "FR", labelKo: "프랑스", labelEn: "France" },
  { code: "AU", labelKo: "호주", labelEn: "Australia" },
  { code: "CA", labelKo: "캐나다", labelEn: "Canada" },
] as const;

export const SELLER_KYC_ID_TYPES = [
  { code: "NATIONAL_ID", labelKo: "주민등록증/국가신분증", labelEn: "National ID" },
  { code: "PASSPORT", labelKo: "여권", labelEn: "Passport" },
  { code: "DRIVERS_LICENSE", labelKo: "운전면허증", labelEn: "Driver's license" },
  { code: "RESIDENT_CARD", labelKo: "외국인등록증/체류카드", labelEn: "Residence card" },
] as const;
