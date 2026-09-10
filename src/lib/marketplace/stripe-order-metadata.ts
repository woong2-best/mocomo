/** Stripe PaymentIntent metadata for Star Market Connect manual-capture orders. */
export function marketplaceStripeMetadata(input: {
  paymentIntentDbId: string;
  buyerId: string;
  marketplaceOrderId: string;
  listingId: string;
  sellerId: string;
}) {
  return {
    orderId: input.paymentIntentDbId,
    type: "MARKETPLACE",
    userId: input.buyerId,
    marketplaceOrderId: input.marketplaceOrderId,
    listingId: input.listingId,
    sellerId: input.sellerId,
    mocomoPaymentIntentId: input.paymentIntentDbId,
    escrow: "connect_manual_capture",
  };
}
