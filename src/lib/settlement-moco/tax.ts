import { isKrSellerCountry } from "@/lib/marketplace/seller-region-policy";
import {
  KR_WITHHOLDING_RATE,
  SETTLEMENT_FX_KRW_PER_USD,
  type TaxFormType,
} from "@/lib/settlement-moco/constants";

export function resolveTaxFormType(countryCode: string): TaxFormType {
  return countryCode.toUpperCase() === "US" ? "W9" : "W8BEN";
}

export function isUsPersonCountry(countryCode: string): boolean {
  return countryCode.toUpperCase() === "US";
}

/** 국가별 Reward 지급 통화 */
export function rewardCurrencyForCountry(countryCode: string): "krw" | "usd" | "jpy" {
  const c = countryCode.toUpperCase();
  if (c === "KR") return "krw";
  if (c === "JP") return "jpy";
  return "usd";
}

export type RewardAmountBreakdown = {
  currency: "krw" | "usd" | "jpy";
  grossMinor: number;
  withholdingMinor: number;
  netMinor: number;
};

/** TIER_CONFIG rewardUsd(달러 정수) → Stripe Transfer minor units */
export function calcTierRewardAmount(input: {
  rewardUsd: number;
  countryCode: string;
}): RewardAmountBreakdown {
  const currency = rewardCurrencyForCountry(input.countryCode);
  const usdCents = input.rewardUsd * 100;

  if (currency === "krw") {
    const grossKrw = Math.round((input.rewardUsd) * SETTLEMENT_FX_KRW_PER_USD);
    const withholding = isKrSellerCountry(input.countryCode)
      ? Math.floor(grossKrw * KR_WITHHOLDING_RATE)
      : 0;
    return {
      currency: "krw",
      grossMinor: grossKrw,
      withholdingMinor: withholding,
      netMinor: grossKrw - withholding,
    };
  }

  if (currency === "jpy") {
    const fx = Number(process.env.SETTLEMENT_FX_JPY_PER_USD ?? 150);
    const grossJpy = Math.round(input.rewardUsd * fx);
    return {
      currency: "jpy",
      grossMinor: grossJpy,
      withholdingMinor: 0,
      netMinor: grossJpy,
    };
  }

  return {
    currency: "usd",
    grossMinor: usdCents,
    withholdingMinor: 0,
    netMinor: usdCents,
  };
}

/** @deprecated tier 기반 calcTierRewardAmount 사용 */
export function calcRewardAmount(input: {
  settlementMoco: number;
  countryCode: string;
  rewardRate: number;
}): RewardAmountBreakdown {
  return calcTierRewardAmount({
    rewardUsd: 0,
    countryCode: input.countryCode,
  });
}

export function validateW9Ssn(ssn: string): string | null {
  const digits = ssn.replace(/\D/g, "");
  if (digits.length !== 9) return "SSN/ITIN 9자리를 입력해 주세요.";
  return null;
}

export function maskSsnLast4(ssn: string): string {
  return ssn.replace(/\D/g, "").slice(-4);
}
