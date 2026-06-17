/** 결제 — Stripe Checkout (권장) */

import { isStripeConfigured } from "@/lib/stripe";

export function isPaymentsConfigured(): boolean {
  return isStripeConfigured();
}

export const PREMIUM_PRICE = 4900;
/** MoCoMo Premium — USD (Stripe 연동 시) */
export const PREMIUM_USD_CENTS = 499;
export const DEFAULT_CREATOR_SUBSCRIPTION_PRICE_KRW = 16_900;

export function checkoutCurrencyForType(type: string): "krw" | "usd" {
  if (type === "PREMIUM") return "usd";
  return "krw";
}
