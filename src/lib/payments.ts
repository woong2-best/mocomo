/** 결제 — Stripe Checkout (권장) */

import { isStripeConfigured } from "@/lib/stripe";

export function isPaymentsConfigured(): boolean {
  return isStripeConfigured();
}

export const PREMIUM_PRICE = 4900;
