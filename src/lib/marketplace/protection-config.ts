/**
 * Marketplace buyer/seller protection config — tunables in one place.
 */

/** Buyer dispute window after delivery before auto-confirm + capture (hours) */
export const MARKETPLACE_DISPUTE_WINDOW_HOURS = 72;

/** Shipped but no delivery signal → treat as delivered (days from shippedAt) */
export const MARKETPLACE_DELIVERY_FALLBACK_DAYS = 45;

/** @deprecated Use MARKETPLACE_DISPUTE_WINDOW_HOURS for post-delivery timing */
export const MARKETPLACE_AUTO_CONFIRM_DAYS = 7;

/** New seller: first N confirmed sales OR first N days → conservative escrow */
export const MARKETPLACE_NEW_SELLER_MAX_ORDERS = 10;
export const MARKETPLACE_NEW_SELLER_DAYS = 30;

/** Trust score → tier thresholds */
export const MARKETPLACE_TRUST_TIERS = {
  NEW: { min: 0, max: 49 },
  STANDARD: { min: 50, max: 69 },
  TRUSTED: { min: 70, max: 84 },
  PREMIUM: { min: 85, max: 100 },
} as const;

/** Escrow release delay (days after confirm) by tier — 0 = immediate on confirm */
export const MARKETPLACE_SETTLEMENT_DELAY_DAYS: Record<string, number> = {
  NEW: 7,
  STANDARD: 3,
  TRUSTED: 1,
  PREMIUM: 0,
};

/** Risk score at/above this → admin review */
export const MARKETPLACE_RISK_ADMIN_REVIEW_THRESHOLD = 70;

/** Listing price (KRW) above this flags high-value risk */
export const MARKETPLACE_HIGH_PRICE_THRESHOLD = 500_000;

/** Orders per buyer per hour before velocity flag */
export const MARKETPLACE_BUYER_ORDER_VELOCITY = 5;

/** Cancel+reorder pattern window */
export const MARKETPLACE_CANCEL_PATTERN_WINDOW_HOURS = 24;
export const MARKETPLACE_CANCEL_PATTERN_MIN = 3;

/** Reports on seller before auto admin review / escalate sanction */
export const MARKETPLACE_REPORT_ESCALATE_COUNT = 3;

/** Paid but no tracking registered → auto full refund (days) */
export const MARKETPLACE_SHIP_DEADLINE_DAYS = 5;

/** Buyer photo evidence minimum for auto damage/not-as-described rules */
export const MARKETPLACE_AUTO_DISPUTE_MIN_BUYER_PHOTOS = 2;

/** Seller counter-evidence window before auto buyer refund (days) */
export const MARKETPLACE_AUTO_DISPUTE_SELLER_RESPONSE_DAYS = 3;

/** Stripe Connect rolling reserve % by trust tier (basis points, 100 = 1%) */
export const MARKETPLACE_ROLLING_RESERVE_BPS: Record<string, number> = {
  NEW: 2000,
  STANDARD: 1000,
  TRUSTED: 500,
  PREMIUM: 0,
};

/** Stripe Connect payout delay (days) by trust tier — complements MoCoMo escrow delay */
export const MARKETPLACE_ROLLING_RESERVE_PAYOUT_DAYS: Record<string, number> = {
  NEW: 14,
  STANDARD: 7,
  TRUSTED: 3,
  PREMIUM: 0,
};

export const MARKETPLACE_DISPUTE_REASONS = [
  { id: "NOT_RECEIVED", label: "상품 미도착" },
  { id: "COUNTERFEIT", label: "가품 의심" },
  { id: "NOT_AS_DESCRIBED", label: "설명과 다른 상품" },
  { id: "DAMAGED", label: "파손" },
  { id: "MISSING_PARTS", label: "일부 구성품 누락" },
  { id: "SELLER_NO_RESPONSE", label: "판매자 연락 두절" },
  { id: "OTHER", label: "기타" },
] as const;

export const MARKETPLACE_REPORT_REASONS = [
  { id: "FRAUD", label: "사기" },
  { id: "COUNTERFEIT", label: "가품" },
  { id: "COPYRIGHT", label: "저작권 침해" },
  { id: "ILLEGAL", label: "불법 상품" },
  { id: "SPAM", label: "스팸" },
  { id: "ADULT", label: "음란물" },
  { id: "OTHER", label: "기타" },
] as const;

export const MARKETPLACE_SANCTION_LABELS: Record<string, string> = {
  NONE: "정상",
  WARNING: "1차 경고",
  LISTING_RESTRICTED: "2차 상품 등록 제한",
  SALES_SUSPENDED: "3차 판매 일시 정지",
  SETTLEMENT_HELD: "4차 정산 보류",
  PERMANENT_BAN: "5차 영구 판매 금지",
};
