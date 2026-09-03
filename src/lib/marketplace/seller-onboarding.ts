import type { MarketplaceSellerOnboardingStep } from "@prisma/client";

/** DB onboardingStep enum — 내부 진행 상태 */
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

/** UI 스테퍼 — Stripe Connect 통합 플로우 */
export type SellerOnboardingUiStep =
  | "ACCOUNT"
  | "AGREEMENTS"
  | "EMAIL"
  | "SELLER_INFO"
  | "STRIPE"
  | "COMPLETE";

export const SELLER_ONBOARDING_STEP_LABELS: Record<SellerOnboardingStepId, string> = {
  ACCOUNT: "계정",
  AGREEMENTS: "약관",
  EMAIL: "이메일",
  PHONE: "휴대폰",
  SELLER_INFO: "판매자 정보",
  KYC: "본인 인증",
  SETTLEMENT: "Stripe",
  COMPLETE: "완료",
};

export const SELLER_ONBOARDING_UI_LABELS: Record<SellerOnboardingUiStep, string> = {
  ACCOUNT: "계정",
  AGREEMENTS: "약관",
  EMAIL: "이메일",
  SELLER_INFO: "판매자 정보",
  STRIPE: "Stripe",
  COMPLETE: "완료",
};

export function visibleSellerOnboardingUiSteps(): SellerOnboardingUiStep[] {
  return ["ACCOUNT", "AGREEMENTS", "EMAIL", "SELLER_INFO", "STRIPE", "COMPLETE"];
}

/** DB step → 스테퍼 UI step (legacy PHONE/KYC → STRIPE) */
export function toSellerOnboardingUiStep(step: SellerOnboardingStepId): SellerOnboardingUiStep {
  if (step === "SETTLEMENT" || step === "PHONE" || step === "KYC") return "STRIPE";
  if (step === "COMPLETE") return "COMPLETE";
  if (step === "SELLER_INFO") return "SELLER_INFO";
  if (step === "EMAIL") return "EMAIL";
  if (step === "AGREEMENTS") return "AGREEMENTS";
  return "ACCOUNT";
}

import { STRIPE_MARKET_COUNTRIES } from "@/lib/marketplace/market-access";

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

/** Stripe Connect 지원 판매 국가만 */
export const STRIPE_SELLER_MARKETS = SELLER_MARKETS.filter((m) =>
  STRIPE_MARKET_COUNTRIES.has(m.code)
);

/** @deprecated Stripe Connect KYC로 대체 */
export const SELLER_KYC_ID_TYPES = [
  { code: "NATIONAL_ID", labelKo: "주민등록증/국가신분증", labelEn: "National ID" },
  { code: "PASSPORT", labelKo: "여권", labelEn: "Passport" },
  { code: "DRIVERS_LICENSE", labelKo: "운전면허증", labelEn: "Driver's license" },
  { code: "RESIDENT_CARD", labelKo: "외국인등록증/체류카드", labelEn: "Residence card" },
] as const;
