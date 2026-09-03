/**
 * Stripe Connect destination charge — manual capture until purchase confirm.
 *
 * At capture: application_fee + transfer to Connect account (seller-side payout).
 * Pre-capture: auth hold only — no platform balance custody (MTL-safe).
 * Post-capture disputes: funds drawn from Connect account reserve.
 */

import type { MarketplaceCheckoutMode } from "@prisma/client";
import { MARKETPLACE_CAPTURE_METHOD } from "@/lib/marketplace/stripe-payment";

export type StripeConnectSplitInput = {
  checkoutMode: MarketplaceCheckoutMode;
  sellerConnectAccountId: string | null | undefined;
  platformFeeAmount: number;
  /** PaymentIntent / Checkout total (subtotal + shipping) */
  totalAmount: number;
  transferGroup?: string;
};

export type StripeConnectSplitParams = {
  capture_method?: "manual";
  application_fee_amount?: number;
  transfer_data?: { destination: string };
  transfer_group?: string;
};

/**
 * STRIPE mode + Connect account → manual capture destination charge params.
 * Seller Connect reserve (not platform balance) holds post-capture dispute exposure.
 */
export function buildStripeConnectSplitParams(
  input: StripeConnectSplitInput
): StripeConnectSplitParams {
  if (input.checkoutMode !== "STRIPE") return {};
  const destination = input.sellerConnectAccountId?.trim();
  if (!destination) return {};

  const fee = Math.max(0, Math.floor(input.platformFeeAmount));
  const params: StripeConnectSplitParams = {
    capture_method: MARKETPLACE_CAPTURE_METHOD,
    transfer_data: { destination },
    ...(input.transferGroup ? { transfer_group: input.transferGroup } : {}),
  };
  if (fee > 0 && input.totalAmount > fee) {
    params.application_fee_amount = fee;
  }
  return params;
}
