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
  AGREEMENTS: "Terms",
  EMAIL: "이메일",
  PHONE: "Mobile phone",
  SELLER_INFO: "Seller information",
  KYC: "Identity verification",
  SETTLEMENT: "Stripe",
  COMPLETE: "Done.",
};

export const SELLER_ONBOARDING_UI_LABELS: Record<SellerOnboardingUiStep, string> = {
  ACCOUNT: "계정",
  AGREEMENTS: "Terms",
  EMAIL: "이메일",
  SELLER_INFO: "Seller information",
  STRIPE: "Stripe",
  COMPLETE: "Done.",
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

import { isStripeMarketCountry } from "@/lib/marketplace/market-access";

export const SELLER_MARKETS = [
  { code: "KR", labelKo: "Korea", labelEn: "Korea" },
  { code: "US", labelKo: "United States", labelEn: "United States" },
  { code: "JP", labelKo: "Japan", labelEn: "Japan" },
  { code: "CN", labelKo: "China", labelEn: "China" },
  { code: "HK", labelKo: "Hong Kong", labelEn: "Hong Kong" },
  { code: "TW", labelKo: "Taiwan", labelEn: "Taiwan" },
  { code: "SG", labelKo: "Singapore", labelEn: "Singapore" },
  { code: "GB", labelKo: "United Kingdom", labelEn: "United Kingdom" },
  { code: "DE", labelKo: "Germany", labelEn: "Germany" },
  { code: "FR", labelKo: "France", labelEn: "France" },
  { code: "AU", labelKo: "Australia", labelEn: "Australia" },
  { code: "CA", labelKo: "Canada", labelEn: "Canada" },
] as const;

/** Stripe Connect 지원 판매 국가 (synced list ∩ policy) */
export const STRIPE_SELLER_MARKETS = SELLER_MARKETS.filter((m) => isStripeMarketCountry(m.code));

/** @deprecated Stripe Connect KYC로 대체 */
export const SELLER_KYC_ID_TYPES = [
  { code: "NATIONAL_ID", labelKo: "Resident registration card / national ID", labelEn: "National ID" },
  { code: "PASSPORT", labelKo: "Passport", labelEn: "Passport" },
  { code: "DRIVERS_LICENSE", labelKo: "Driver's license", labelEn: "Driver's license" },
  { code: "RESIDENT_CARD", labelKo: "Alien registration card / residence card", labelEn: "Residence card" },
] as const;
