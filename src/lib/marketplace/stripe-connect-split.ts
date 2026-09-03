/**
 * Stripe Connect destination charge — 결제 시 플랫폼 수수료(10%) 자동 분할
 */

import type { MarketplaceCheckoutMode } from "@prisma/client";

export type StripeConnectSplitInput = {
  checkoutMode: MarketplaceCheckoutMode;
  sellerConnectAccountId: string | null | undefined;
  platformFeeAmount: number;
  /** PaymentIntent / Checkout total (subtotal + shipping) */
  totalAmount: number;
  transferGroup?: string;
};

export type StripeConnectSplitParams = {
  application_fee_amount?: number;
  transfer_data?: { destination: string };
  transfer_group?: string;
};

/**
 * STRIPE 모드 + Connect 계정 있을 때 destination charge 파라미터 반환.
 * escrow deferred transfer 대신 charge 시점 분할.
 */
export function buildStripeConnectSplitParams(
  input: StripeConnectSplitInput
): StripeConnectSplitParams {
  if (input.checkoutMode !== "STRIPE") return {};
  if (!input.sellerConnectAccountId?.trim()) return {};
  if (input.platformFeeAmount <= 0 || input.totalAmount <= input.platformFeeAmount) {
    return input.transferGroup ? { transfer_group: input.transferGroup } : {};
  }

  return {
    application_fee_amount: input.platformFeeAmount,
    transfer_data: { destination: input.sellerConnectAccountId.trim() },
    ...(input.transferGroup ? { transfer_group: input.transferGroup } : {}),
  };
}
