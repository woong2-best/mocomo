import { PRICE_PER_MOCO_USD } from "@/lib/gems/constants";

/** 24시간(1일)당 1 MOCO */
export const SPONSORED_AD_MOCO_PER_DAY = 1;

export const SPONSORED_AD_MAX_DAYS = 100;

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const SPONSORED_AD_TARGET_EVENT = "EVENT" as const;

export type SponsoredAdTargetType = typeof SPONSORED_AD_TARGET_EVENT;

export const SPONSORED_AD_STATUS_ACTIVE = "ACTIVE" as const;
export const SPONSORED_AD_STATUS_EXPIRED = "EXPIRED" as const;

export function calcSponsoredAdMoco(days: number): number {
  if (!Number.isInteger(days) || days < 1) {
    throw new Error("INVALID_SPONSORED_AD_DAYS");
  }
  if (days > SPONSORED_AD_MAX_DAYS) {
    throw new Error("SPONSORED_AD_DAYS_TOO_LONG");
  }
  return days * SPONSORED_AD_MOCO_PER_DAY;
}

export function calcSponsoredAdExpiresAt(days: number, from = new Date()): Date {
  return new Date(from.getTime() + days * MS_PER_DAY);
}

export function sponsoredAdUsdCents(moco: number): number {
  return Math.round(moco * PRICE_PER_MOCO_USD * 100);
}
