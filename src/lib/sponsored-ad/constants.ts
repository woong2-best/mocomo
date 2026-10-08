import { PRICE_PER_MOCO_USD } from "@/lib/gems/constants";
import { joinMoco, mocoToTenths, splitUnsignedTenths } from "@/lib/moco/decimal-amount";

/** 24시간(1일)당 0.5 MOCO */
export const SPONSORED_AD_MOCO_PER_DAY = 0.5;

/** 사이드바 스폰서 슬롯 노출 비율 (4:5) */
export const SPONSORED_AD_ASPECT = 4 / 5;

/** 업로드 이미지 최대 크기 (4:5) */
export const SPONSORED_AD_IMAGE_MAX_WIDTH = 960;
export const SPONSORED_AD_IMAGE_MAX_HEIGHT = 1200;

export const SPONSORED_AD_MAX_DAYS = 100;

export const SPONSORED_AD_DURATION_PRESETS = [1, 3, 7, 14] as const;

/**
 * 운영자 광고 — 삭제 전까지 노출.
 * expiresAt 컬럼이 필수라 DB에는 먼 미래로 저장한다 (약 100년).
 */
export const SPONSORED_AD_OPERATOR_UNLIMITED_MAX_DAYS = 36500;

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 운영자 무제한 광고의 expiresAt */
export function calcOperatorUnlimitedExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + SPONSORED_AD_OPERATOR_UNLIMITED_MAX_DAYS * MS_PER_DAY);
}

export const SPONSORED_AD_TARGET_EVENT = "EVENT" as const;
export const SPONSORED_AD_TARGET_POST = "POST" as const;

export type SponsoredAdTargetType =
  | typeof SPONSORED_AD_TARGET_EVENT
  | typeof SPONSORED_AD_TARGET_POST;

export const SPONSORED_AD_STATUS_ACTIVE = "ACTIVE" as const;
export const SPONSORED_AD_STATUS_EXPIRED = "EXPIRED" as const;
export const SPONSORED_AD_STATUS_CANCELLED = "CANCELLED" as const;

export function calcSponsoredAdMoco(days: number): number {
  if (!Number.isInteger(days) || days < 1) {
    throw new Error("INVALID_SPONSORED_AD_DAYS");
  }
  if (days > SPONSORED_AD_MAX_DAYS) {
    throw new Error("SPONSORED_AD_DAYS_TOO_LONG");
  }
  return Math.round(days * SPONSORED_AD_MOCO_PER_DAY * 10) / 10;
}

export function splitSponsoredAdMoco(moco: number): { whole: number; tenths: number } {
  const tenths = mocoToTenths(moco);
  if (tenths == null) throw new Error("INVALID_MOCO_AMOUNT");
  return splitUnsignedTenths(tenths);
}

export function campaignPaidMoco(campaign: { mocoPaid: number; mocoPaidTenths?: number | null }): number {
  return joinMoco(campaign.mocoPaid, campaign.mocoPaidTenths ?? 0);
}

export function isComplimentaryCampaign(campaign: {
  mocoPaid: number;
  mocoPaidTenths?: number | null;
}): boolean {
  return campaignPaidMoco(campaign) === 0;
}

export function calcSponsoredAdExpiresAt(days: number, from = new Date()): Date {
  return new Date(from.getTime() + days * MS_PER_DAY);
}

export function sponsoredAdUsdCents(moco: number): number {
  return Math.round(moco * PRICE_PER_MOCO_USD * 100);
}

export type BoostRefundQuote = {
  elapsedHours: number;
  usedDays: number;
  unusedDays: number;
  refundMoco: number;
  totalDays: number;
};

/** 일할 환불: 사용 시작한 당일은 1일 소모. 미사용 일 × 0.5 MOCO. */
export function calcBoostRefund(input: {
  startsAt: Date;
  days: number;
  now?: Date;
  paidMoco?: number;
}): BoostRefundQuote {
  const now = input.now ?? new Date();
  const elapsedMs = Math.max(0, now.getTime() - input.startsAt.getTime());
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const usedDays = Math.ceil(elapsedHours / 24);
  const unusedDays = Math.max(0, input.days - usedDays);
  let refundMoco = Math.round(unusedDays * SPONSORED_AD_MOCO_PER_DAY * 10) / 10;
  if (input.paidMoco != null) {
    refundMoco = Math.min(refundMoco, Math.max(0, Math.round(input.paidMoco * 10) / 10));
  }
  return { elapsedHours, usedDays, unusedDays, refundMoco, totalDays: input.days };
}
