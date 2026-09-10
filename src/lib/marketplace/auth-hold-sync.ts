/**
 * Persist Stripe manual-capture auth hold expiry on MarketplaceOrder.
 */

import { db } from "@/lib/db";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { resolveHoldExpiresAtFromPaymentIntent } from "@/lib/marketplace/card-authorization";
import { resolveMarketplaceStripePaymentIntentId } from "@/lib/marketplace/stripe-payment";

export async function syncMarketplaceOrderAuthHoldExpiry(
  orderId: string
): Promise<Date | null> {
  if (!isStripeConfigured()) return null;

  const order = await db.marketplaceOrder.findUnique({
    where: { id: orderId },
    select: {
      stripePaymentIntentId: true,
      stripeCheckoutSessionId: true,
      checkoutMode: true,
    },
  });
  if (!order || order.checkoutMode !== "STRIPE") return null;

  const piId = await resolveMarketplaceStripePaymentIntentId(
    order.stripePaymentIntentId ?? order.stripeCheckoutSessionId
  );
  if (!piId) return null;

  try {
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(piId);
    if (pi.status !== "requires_capture") return null;

    const expiresAt = await resolveHoldExpiresAtFromPaymentIntent(stripe, pi);
    await db.marketplaceOrder.update({
      where: { id: orderId },
      data: { authHoldExpiresAt: expiresAt },
    });
    return expiresAt;
  } catch {
    return null;
  }
}
