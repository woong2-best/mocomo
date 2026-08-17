/**
 * Site-wide payment currency.
 * All payment amounts are stored and charged as USD cents (Stripe minor units).
 * DB fields may still be named *Krw historically — values are USD cents.
 */

export const SITE_CURRENCY = "usd" as const;

/** Format USD cents for display ($X.XX). */
export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Alias — all site payments display in USD. */
export function formatMoney(cents: number, opts?: { freeLabel?: string }): string {
  if (cents === 0 && opts?.freeLabel) return opts.freeLabel;
  return formatUsd(cents);
}

/** @deprecated use formatMoney — kept for migration */
export function formatPrice(amount: number, currency?: string | null): string {
  const c = (currency ?? SITE_CURRENCY).toLowerCase();
  if (c === "usd") return formatUsd(amount);
  if (c === "krw") return formatUsd(amount);
  return `${amount.toLocaleString()} ${c.toUpperCase()}`;
}

export function checkoutCurrency(): typeof SITE_CURRENCY {
  return SITE_CURRENCY;
}

// ——— Limits & defaults (USD cents) ———

export const MIN_TIP_USD_CENTS = 100;
export const MAX_TIP_USD_CENTS = 100_000;
export const MIN_PAYOUT_USD_CENTS = Number(process.env.MIN_PAYOUT_USD_CENTS ?? 1_000);
export const LISTING_FEE_USD_CENTS = 500;
export const DEFAULT_CREATOR_SUBSCRIPTION_USD_CENTS = 1_299;
export const LETTER_DONATION_MIN_USD_CENTS = 500;
export const SALE_MEDIA_MIN_PRICE_USD_CENTS = 100;
export const SALE_MEDIA_MAX_PRICE_USD_CENTS = 100_000;
export const MIN_CALL_BOOKING_USD_CENTS = 500;
export const MAX_CALL_BOOKING_USD_CENTS = 50_000;
export const EVENT_REGISTRATION_FEE_PER_DAY_USD_CENTS = 100;
export const EVENT_REGISTRATION_MAX_DAYS = 100;
export const EVENT_REGISTRATION_MAX_FEE_USD_CENTS =
  EVENT_REGISTRATION_FEE_PER_DAY_USD_CENTS * EVENT_REGISTRATION_MAX_DAYS;
export const MAX_USED_LISTING_PRICE_USD_CENTS = 2_100_000_000;
export const MARKETPLACE_HIGH_PRICE_THRESHOLD_USD_CENTS = 50_000;

/** Backward-compatible aliases (USD cents semantics). */
export const MIN_PAYOUT_KRW = MIN_PAYOUT_USD_CENTS;
export const LISTING_FEE_KRW = LISTING_FEE_USD_CENTS;
export const LETTER_DONATION_MIN_KRW = LETTER_DONATION_MIN_USD_CENTS;
export const DEFAULT_CREATOR_SUBSCRIPTION_PRICE_KRW = DEFAULT_CREATOR_SUBSCRIPTION_USD_CENTS;
export const MIN_CALL_BOOKING_KRW = MIN_CALL_BOOKING_USD_CENTS;
export const MAX_CALL_BOOKING_KRW = MAX_CALL_BOOKING_USD_CENTS;
export const EVENT_REGISTRATION_FEE_PER_DAY_KRW = EVENT_REGISTRATION_FEE_PER_DAY_USD_CENTS;
export const EVENT_REGISTRATION_MAX_FEE_KRW = EVENT_REGISTRATION_MAX_FEE_USD_CENTS;
export const SALE_MEDIA_MIN_PRICE_KRW = SALE_MEDIA_MIN_PRICE_USD_CENTS;

export const EMOTICON_PRICES_USD_CENTS = [999, 1_999, 2_999, 4_999] as const;
