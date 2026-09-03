"use server";

/**
 * @deprecated Direct trade removed — Stripe-only marketplace.
 */

import type { MarketplaceCheckoutInput } from "@/actions/marketplace-checkout";
import { MARKET_UNAVAILABLE_KO } from "@/lib/marketplace/market-access";

const DISABLED = MARKET_UNAVAILABLE_KO;

export async function initDirectTradeMarketplaceOrder(
  _buyer: { id: string; countryCode?: string | null },
  _input: MarketplaceCheckoutInput
) {
  return { error: DISABLED } as const;
}

export async function confirmDirectTradePayment(_marketplaceOrderId: string) {
  return { error: DISABLED } as const;
}
