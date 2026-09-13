import { PRICE_PER_MOCO_USD } from "@/lib/gems/constants";

/** 24시간(1일)당 1 MOCO */
export const SPONSORED_AD_MOCO_PER_DAY = 1;

/** 사이드바 스폰서 슬롯 노출 비율 (4:5) */
export const SPONSORED_AD_ASPECT = 4 / 5;

/** 업로드 이미지 최대 크기 (4:5) */
export const SPONSORED_AD_IMAGE_MAX_WIDTH = 960;
export const SPONSORED_AD_IMAGE_MAX_HEIGHT = 1200;

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
