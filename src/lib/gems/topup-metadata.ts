import type { GemTopupQuote } from "@/lib/gems/constants";

export function gemTopupStripeMetadata(quote: Extract<GemTopupQuote, { ok: true }>) {
  return {
    gemAmount: quote.moco,
    base_price_cents: quote.basePriceCents,
    pg_fee_cents: quote.pgFeeCents,
    gross_amount_cents: quote.usdCents,
    platform_margin_cents: quote.platformRevenueCents,
    creator_allocation_cents: quote.creatorAllocationCents,
  };
}
