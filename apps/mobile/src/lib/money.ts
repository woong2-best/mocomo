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
  if (c === "krw") return formatKrw(amount);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: c.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${c.toUpperCase()}`;
  }
}

export const MIN_PAYOUT_USD_CENTS = 1_000;
export const MIN_CALL_BOOKING_USD_CENTS = 500;
export const LETTER_DONATION_MIN_USD_CENTS = 500;
export const SALE_MEDIA_MIN_PRICE_USD_CENTS = 100;
export const SALE_MEDIA_MAX_PRICE_USD_CENTS = 100_000;

/** 1 MOCO = $5. Keep in sync with src/lib/gems/constants.ts */
export const SALE_MOCO_USD_CENTS = 500;

export function saleCentsFromMoco(moco: number): number {
  return Math.round(moco * SALE_MOCO_USD_CENTS);
}

export function formatSaleMoco(cents: number): string {
  const tenths = Math.round(Math.abs(cents) / (SALE_MOCO_USD_CENTS / 10));
  const value = tenths / 10;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} MOCO`;
}
/** Legacy field name — amounts are USD cents site-wide. */
export const SALE_MEDIA_MIN_PRICE_KRW = SALE_MEDIA_MIN_PRICE_USD_CENTS;
