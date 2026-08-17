/** 결제 — Stripe Checkout (권장) */

import { isStripeConfigured } from "@/lib/stripe";
import { checkoutCurrency, DEFAULT_CREATOR_SUBSCRIPTION_USD_CENTS } from "@/lib/money";

export function isPaymentsConfigured(): boolean {
  return isStripeConfigured();
}

/** @deprecated use PREMIUM_USD_CENTS */
export const PREMIUM_PRICE = 499;
/** MoCoMo Premium — USD */
export const PREMIUM_USD_CENTS = 499;

/** Default creator monthly subscription (USD cents). */
export const DEFAULT_CREATOR_SUBSCRIPTION_PRICE_KRW = DEFAULT_CREATOR_SUBSCRIPTION_USD_CENTS;

export function checkoutCurrencyForType(_type?: string): "usd" {
  return checkoutCurrency();
}
