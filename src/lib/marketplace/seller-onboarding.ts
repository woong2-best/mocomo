import type { MarketplaceSellerOnboardingStep } from "@prisma/client";
import { sellerRequiresPhoneVerification } from "@/lib/marketplace/seller-region-policy";

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

/** UI 스테퍼용 (해외는 PHONE 제외, Stripe/신분증/계좌 분리 표시) */
export type SellerOnboardingUiStep =
  | "ACCOUNT"
  | "AGREEMENTS"
  | "EMAIL"
  | "PHONE"
  | "SELLER_INFO"
  | "STRIPE"
  | "KYC"
  | "BANK"
  | "COMPLETE";

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

export const SELLER_ONBOARDING_UI_LABELS: Record<SellerOnboardingUiStep, string> = {
  ACCOUNT: "계정",
  AGREEMENTS: "약관",
  EMAIL: "이메일",
  PHONE: "휴대폰",
  SELLER_INFO: "판매자 정보",
  STRIPE: "Stripe",
  KYC: "신분증",
  BANK: "계좌",
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

/** 한국: …휴대폰…KYC…정산 / 해외: …Stripe→신분증→계좌 (SMS 없음) */
export function visibleSellerOnboardingUiSteps(
  countryCode: string | null | undefined
): SellerOnboardingUiStep[] {
  if (sellerRequiresPhoneVerification(countryCode)) {
    return ["ACCOUNT", "AGREEMENTS", "EMAIL", "PHONE", "SELLER_INFO", "KYC", "BANK"];
  }
  return ["ACCOUNT", "AGREEMENTS", "EMAIL", "SELLER_INFO", "STRIPE", "KYC", "BANK"];
}

/** DB step + settlementPhase → 스테퍼/화면용 UI step */
export function toSellerOnboardingUiStep(
  step: SellerOnboardingStepId,
  settlementPhase: "stripe" | "bank" | "done" | null | undefined,
  countryCode: string | null | undefined
): SellerOnboardingUiStep {
  if (step === "SETTLEMENT") {
    if (!sellerRequiresPhoneVerification(countryCode) && settlementPhase === "stripe") {
      return "STRIPE";
    }
    return "BANK";
  }
  if (step === "COMPLETE") return "COMPLETE";
  return step as SellerOnboardingUiStep;
}

/** @deprecated — use visibleSellerOnboardingUiSteps */
export function visibleSellerOnboardingSteps(
  countryCode: string | null | undefined
): SellerOnboardingStepId[] {
  const requirePhone = sellerRequiresPhoneVerification(countryCode);
  return SELLER_ONBOARDING_STEPS.filter(
    (s) => s !== "COMPLETE" && (requirePhone || s !== "PHONE")
  );
}

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

/** KYC 제출 폼 — 2차 OCR API 연동 시 documentKey + 텍스트 필드 그대로 사용 */
export type SellerKycSubmitPayload = {
  legalName: string;
  idType: (typeof SELLER_KYC_ID_TYPES)[number]["code"];
  idNumber: string;
  documentKey: string;
};
