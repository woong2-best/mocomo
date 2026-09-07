/** 1 gem = $0.01 USD */
export const PRICE_PER_GEM_USD = 0.01;

/** 100 gems = $1.00 */
export const GEM_TO_USD_RATE = 0.01;

/** Minimum Stripe top-up ($5.00) */
export const MIN_GEM_TOPUP_USD = 5;

export const MIN_GEM_TOPUP_GEMS = 500;

/** Platform margin on creator payouts (10%) */
export const PLATFORM_MARGIN_RATE = 0.1;

/** Refund processing fee (10% of unused gem value) */
export const REFUND_PROCESSING_FEE_RATE = 0.1;

/** KR: 30 days, global: 14 days */
export const REFUND_WINDOW_DAYS_KR = 30;
export const REFUND_WINDOW_DAYS_GLOBAL = 14;

/** Hybrid payout thresholds (USD) */
export const PAYOUT_SKIP_BELOW_USD = 5;
export const PAYOUT_INSTANT_FROM_USD = 33;

export const GEMS_RATE_VERSION = "v1.0_2026";

export type GiftEventSource = "profile_tip" | "live_tip" | "post_media_purchase";

export const GEM_TOPUP_PACKAGES = [
  { gems: 500, usdCents: 500, label: "500 Gems ($5)" },
  { gems: 2_000, usdCents: 2_000, label: "2,000 Gems ($20)" },
  { gems: 5_000, usdCents: 5_000, label: "5,000 Gems ($50)" },
  { gems: 10_000, usdCents: 10_000, label: "10,000 Gems ($100)" },
] as const;

export function findGemTopupPackage(gems: number) {
  return GEM_TOPUP_PACKAGES.find((p) => p.gems === gems) ?? null;
}

export function gemsToUsd(gems: number): number {
  return gems * GEM_TO_USD_RATE;
}

export function usdToGems(usd: number): number {
  return Math.floor(usd / GEM_TO_USD_RATE);
}

export function usdCentsToUsd(cents: number): number {
  return cents / 100;
}

export function usdToStripeCents(usd: number): number {
  return Math.max(0, Math.round(usd * 100));
}

/** Legal copy — payment UI footer */
export const GEM_PURCHASE_TERMS_COPY =
  "By clicking 'Pay', you agree to our Terms of Service. Unused Gems can be refunded within 14 days (30 days for KR residents), subject to a 10% processing fee. Spent Gems are strictly non-refundable.";
