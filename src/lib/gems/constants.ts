/** 1 MOCO = $0.01 USD (구매 MOCO) */
export const PRICE_PER_MOCO_USD = 0.01;

/** @deprecated PRICE_PER_MOCO_USD */
export const PRICE_PER_GEM_USD = PRICE_PER_MOCO_USD;

/** 100 MOCO = $1.00 */
export const MOCO_TO_USD_RATE = 0.01;

/** @deprecated MOCO_TO_USD_RATE */
export const GEM_TO_USD_RATE = MOCO_TO_USD_RATE;

/** Minimum Stripe top-up ($5.00) */
export const MIN_GEM_TOPUP_USD = 5;

export const MIN_GEM_TOPUP_GEMS = 500;

/** Platform margin on creator payouts (10%) */
export const PLATFORM_MARGIN_RATE = 0.1;

/** Hybrid payout thresholds (USD) */
export const PAYOUT_SKIP_BELOW_USD = 5;
export const PAYOUT_INSTANT_FROM_USD = 33;

export const GEMS_RATE_VERSION = "v1.0_2026";

export type GiftEventSource = "profile_tip" | "live_tip" | "post_media_purchase";

export const GEM_TOPUP_PACKAGES = [
  { gems: 500, usdCents: 500, label: "500 MOCO ($5)" },
  { gems: 2_000, usdCents: 2_000, label: "2,000 MOCO ($20)" },
  { gems: 5_000, usdCents: 5_000, label: "5,000 MOCO ($50)" },
  { gems: 10_000, usdCents: 10_000, label: "10,000 MOCO ($100)" },
] as const;

export function findGemTopupPackage(moco: number) {
  return GEM_TOPUP_PACKAGES.find((p) => p.gems === moco) ?? null;
}

/** @deprecated findGemTopupPackage */
export const findMocoTopupPackage = findGemTopupPackage;

export function mocoToUsd(moco: number): number {
  return moco * MOCO_TO_USD_RATE;
}

/** @deprecated mocoToUsd */
export const gemsToUsd = mocoToUsd;

export function usdToMoco(usd: number): number {
  return Math.floor(usd / MOCO_TO_USD_RATE);
}

/** @deprecated usdToMoco */
export const usdToGems = usdToMoco;

export function usdCentsToUsd(cents: number): number {
  return cents / 100;
}

export function usdToStripeCents(usd: number): number {
  return Math.max(0, Math.round(usd * 100));
}

/** Legal copy — payment UI footer (구매 MOCO) */
export const MOCO_PURCHASE_TERMS_COPY =
  "결제 시 이용약관에 동의합니다. 구매 MOCO는 환불·인출·환전이 불가합니다. 광석 등급은 구매가 아닌 다른 사용자에게 후원을 완료한 누적 MOCO 기준입니다.";

/** @deprecated MOCO_PURCHASE_TERMS_COPY */
export const GEM_PURCHASE_TERMS_COPY = MOCO_PURCHASE_TERMS_COPY;
