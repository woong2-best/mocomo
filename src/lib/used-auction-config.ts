/** 낙찰 후 결제 제한 (시간) */
export const DEFAULT_PAYMENT_DEADLINE_HOURS = 5;

/** 차순위 협상 제한 (시간) */
export const DEFAULT_NEGOTIATION_DEADLINE_HOURS = 24;

/** 향후 입찰 보증금 — Stripe auth hold (USD) */
export const DEFAULT_DEPOSIT_RATE = 0.05;

/** Bid auth hold minimum (USD cents) — no Stripe fee until capture */
export const USED_AUCTION_MIN_BID_HOLD_USD_CENTS = 50;

/** Winning bid capture floor (USD cents) — $0.30 Stripe fixed fee */
export const USED_AUCTION_MIN_CAPTURABLE_USD_CENTS = 500;

/** Card authorization validity — re-auth cron fires before expiry */
export const USED_AUCTION_HOLD_AUTH_DAYS = 7;

export const USED_AUCTION_REAUTH_LEAD_HOURS = 24;

export type UsedAuctionConfigSlice = {
  depositEnabled: boolean;
  depositRate: number;
  paymentDeadlineHours: number;
  negotiationDeadlineHours: number;
};

export const DEFAULT_USED_AUCTION_CONFIG: UsedAuctionConfigSlice = {
  depositEnabled: false,
  depositRate: DEFAULT_DEPOSIT_RATE,
  paymentDeadlineHours: DEFAULT_PAYMENT_DEADLINE_HOURS,
  negotiationDeadlineHours: DEFAULT_NEGOTIATION_DEADLINE_HOURS,
};

export function paymentDueAtFromNow(
  hours = DEFAULT_PAYMENT_DEADLINE_HOURS,
  now = Date.now()
): Date {
  return new Date(now + hours * 60 * 60 * 1000);
}

export function negotiationDueAtFromNow(
  hours = DEFAULT_NEGOTIATION_DEADLINE_HOURS,
  now = Date.now()
): Date {
  return new Date(now + hours * 60 * 60 * 1000);
}

export function formatPaymentCountdown(dueAt: Date | string, now = Date.now()): string {
  const end =
    typeof dueAt === "string" ? new Date(dueAt).getTime() : dueAt.getTime();
  const diff = end - now;
  if (diff <= 0) return "00:00:00";
  const totalSecs = Math.floor(diff / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
