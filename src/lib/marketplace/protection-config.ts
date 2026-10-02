/**
 * Marketplace buyer/seller protection config — tunables in one place.
 */

/** Buyer dispute window after delivery before auto-confirm + capture (hours) */
export const MARKETPLACE_DISPUTE_WINDOW_HOURS = 72;

/** Shipped but no delivery signal → treat as delivered (days from shippedAt). Keep ≤ card auth window (~30d EA). */
export const MARKETPLACE_DELIVERY_FALLBACK_DAYS = 14;

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

/** Re-auth cron fires when hold expires within this many hours */
export const MARKETPLACE_REAUTH_LEAD_HOURS = 24;

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

/**
 * Uniform Stripe Connect payout delay (days) — tier-independent; sanctions may override.
 * Stripe enforces a per-account minimum (often 2 for US Express). syncSellerStripeReserve
 * falls back to higher delay_days if the API rejects a lower value.
 */
export const MARKETPLACE_PAYOUT_DELAY_DAYS = 2;

/** Payment/auth BLOCKED orders auto-closed after this many days without recovery */
export const MARKETPLACE_SETTLEMENT_BLOCKED_GRACE_DAYS = 5;

export const MARKETPLACE_DISPUTE_REASONS = [
  { id: "NOT_RECEIVED", label: "Not shipped / not received" },
  { id: "COUNTERFEIT", label: "Counterfeit goods" },
  { id: "NOT_AS_DESCRIBED", label: "Not as described" },
  { id: "DAMAGED", label: "Damaged" },
  { id: "MISSING_PARTS", label: "Missing parts" },
  { id: "SELLER_NO_RESPONSE", label: "No contact" },
  { id: "SCAM_FRAUD_ACCOUNT", label: "Fraudulent account / fake payment" },
  { id: "OTHER", label: "Other fraud or harm" },
] as const;

export const MARKETPLACE_REPORT_REASONS = [
  { id: "FRAUD", label: "Fraud" },
  { id: "COUNTERFEIT", label: "Counterfeit" },
  { id: "COPYRIGHT", label: "Copyright infringement" },
  { id: "ILLEGAL", label: "Illegal product" },
  { id: "SPAM", label: "Spam" },
  { id: "ADULT", label: "Adult content" },
  { id: "OTHER", label: "Other" },
] as const;

export const MARKETPLACE_SANCTION_LABELS: Record<string, string> = {
  NONE: "Normal",
  WARNING: "First warning",
  LISTING_RESTRICTED: "Second offense — listing restricted",
  SALES_SUSPENDED: "Third offense — selling suspended",
  SETTLEMENT_HELD: "Fourth offense — settlement on hold",
  PERMANENT_BAN: "Stage 5 — permanent sales ban",
};
