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

export function formatMoney(cents: number, opts?: { freeLabel?: string }): string {
  if (cents === 0 && opts?.freeLabel) return opts.freeLabel;
  return formatUsd(cents);
}

export const MIN_PAYOUT_USD_CENTS = 1_000;
export const MIN_CALL_BOOKING_USD_CENTS = 500;
export const LETTER_DONATION_MIN_USD_CENTS = 500;
