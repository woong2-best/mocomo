/**
 * Site-wide payment currency (mobile).
 * All payment amounts are stored and charged as USD cents.
 */

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatKrw(won: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(won);
}

export function formatPrice(amount: number, currency?: string | null): string {
  const c = (currency ?? "krw").toLowerCase();
  if (c === "usd") return formatUsd(amount);
  return formatKrw(amount);
}

export const MIN_PAYOUT_USD_CENTS = 1_000;
export const MIN_CALL_BOOKING_USD_CENTS = 500;
export const LETTER_DONATION_MIN_USD_CENTS = 500;
export const SALE_MEDIA_MIN_PRICE_USD_CENTS = 100;
export const SALE_MEDIA_MAX_PRICE_USD_CENTS = 100_000;
/** Legacy field name — amounts are USD cents site-wide. */
export const SALE_MEDIA_MIN_PRICE_KRW = SALE_MEDIA_MIN_PRICE_USD_CENTS;
