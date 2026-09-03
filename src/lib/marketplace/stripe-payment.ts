/**
 * Star Market Stripe payment helpers — manual capture + Connect destination charge.
 *
 * Funds stay authorized (not captured) until purchase confirm. Capture triggers
 * Connect destination transfer + application fee. Pre-capture refunds use cancel;
 * post-capture refunds use reverse_transfer. Disputes route to Connect account reserve.
 */

import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { safeLogWarn, safeLogInfo } from "@/lib/safe-log";

export const MARKETPLACE_CAPTURE_METHOD = "manual" as const;

export function isMarketplacePaymentAuthorized(pi: Stripe.PaymentIntent): boolean {
  return (
    pi.status === "requires_capture" &&
    typeof pi.amount_capturable === "number" &&
    pi.amount_capturable > 0
  );
}

export function isMarketplacePaymentCaptured(pi: Stripe.PaymentIntent): boolean {
  return pi.status === "succeeded";
}

/** Resolve stored ref (pi_, cs_, or legacy session id) to a PaymentIntent id. */
export async function resolveMarketplaceStripePaymentIntentId(
  storedRef: string | null | undefined
): Promise<string | null> {
  if (!storedRef?.trim()) return null;
  const ref = storedRef.trim();
  if (ref.startsWith("pi_")) return ref;
  if (!isStripeConfigured()) return ref.startsWith("cs_") ? null : ref;

  const stripe = getStripe();
  if (ref.startsWith("cs_")) {
    const session = await stripe.checkout.sessions.retrieve(ref);
    const pi = session.payment_intent;
    if (!pi) return null;
    return typeof pi === "string" ? pi : pi.id;
  }
  return ref;
}

export async function retrieveMarketplacePaymentIntent(
  storedRef: string | null | undefined
): Promise<Stripe.PaymentIntent | null> {
  const piId = await resolveMarketplaceStripePaymentIntentId(storedRef);
  if (!piId || !isStripeConfigured()) return null;
  try {
    return await getStripe().paymentIntents.retrieve(piId);
  } catch (e) {
    safeLogWarn("marketplace-stripe", { piId, err: String(e) });
    return null;
  }
}

export type MarketplaceCaptureResult =
  | { ok: true; chargeId: string | null; alreadyCaptured: boolean }
  | { error: string; deferred?: boolean };

/** Capture authorized funds — Connect destination transfer happens at capture. */
export async function captureMarketplacePaymentIntent(
  storedRef: string | null | undefined,
  opts?: { amountToCapture?: number }
): Promise<MarketplaceCaptureResult> {
  if (!isStripeConfigured()) return { error: "Stripe not configured" };

  const piId = await resolveMarketplaceStripePaymentIntentId(storedRef);
  if (!piId) return { error: "Stripe PaymentIntent not found" };

  const stripe = getStripe();
  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.retrieve(piId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to retrieve PaymentIntent" };
  }

  if (pi.status === "succeeded") {
    const chargeId =
      typeof pi.latest_charge === "string"
        ? pi.latest_charge
        : pi.latest_charge?.id ?? null;
    return { ok: true, chargeId, alreadyCaptured: true };
  }

  if (!isMarketplacePaymentAuthorized(pi)) {
    return {
      error: `PaymentIntent is not capturable (status=${pi.status})`,
    };
  }

  try {
    const captured = await stripe.paymentIntents.capture(piId, {
      ...(opts?.amountToCapture != null
        ? { amount_to_capture: opts.amountToCapture }
        : {}),
    });
    const chargeId =
      typeof captured.latest_charge === "string"
        ? captured.latest_charge
        : captured.latest_charge?.id ?? null;
    return { ok: true, chargeId, alreadyCaptured: false };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Capture failed" };
  }
}

export type MarketplaceRefundResult =
  | { ok: true; mode: "cancelled" | "refunded"; stripeRefId?: string }
  | { error: string };

/**
 * Refund or release authorization. Uses reverse_transfer for captured destination charges.
 */
export async function refundOrReleaseMarketplacePayment(input: {
  storedRef: string | null | undefined;
  amount: number;
}): Promise<MarketplaceRefundResult> {
  if (!isStripeConfigured()) return { error: "Stripe not configured" };

  const piId = await resolveMarketplaceStripePaymentIntentId(input.storedRef);
  if (!piId) return { error: "Stripe PaymentIntent not found" };

  const stripe = getStripe();
  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.retrieve(piId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to retrieve PaymentIntent" };
  }

  const total = pi.amount;
  const refundAmount = Math.min(Math.max(0, input.amount), total);

  if (pi.status === "requires_capture") {
    if (refundAmount >= total) {
      try {
        await stripe.paymentIntents.cancel(piId);
        return { ok: true, mode: "cancelled" };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Cancel failed" };
      }
    }
    const captureAmount = total - refundAmount;
    try {
      if (captureAmount > 0) {
        await stripe.paymentIntents.capture(piId, { amount_to_capture: captureAmount });
      } else {
        await stripe.paymentIntents.cancel(piId);
      }
      return { ok: true, mode: "cancelled" };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Partial release failed" };
    }
  }

  if (pi.status === "succeeded") {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: piId,
        amount: refundAmount,
        reverse_transfer: true,
        refund_application_fee: refundAmount >= total,
      });
      return { ok: true, mode: "refunded", stripeRefId: refund.id };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Refund failed" };
    }
  }

  if (pi.status === "canceled") {
    return { ok: true, mode: "cancelled" };
  }

  return { error: `Cannot refund PaymentIntent in status ${pi.status}` };
}

/** Find marketplace order by Stripe PaymentIntent id (direct or via PaymentIntent row). */
export async function findMarketplaceOrderByStripePaymentIntent(
  stripePiId: string
): Promise<{ id: string; sellerId: string; buyerId: string } | null> {
  const direct = await db.marketplaceOrder.findFirst({
    where: { stripePaymentIntentId: stripePiId },
    select: { id: true, sellerId: true, buyerId: true },
  });
  if (direct) return direct;

  const viaKey = await db.marketplaceOrder.findFirst({
    where: {
      OR: [
        { stripePaymentIntentId: { contains: stripePiId.slice(0, 20) } },
        { stripeCheckoutSessionId: stripePiId },
      ],
    },
    select: { id: true, sellerId: true, buyerId: true },
  });
  if (viaKey) return viaKey;

  const intent = await db.paymentIntent.findFirst({
    where: { paymentKey: stripePiId, type: "MARKETPLACE" },
    select: { metadata: true },
  });
  const meta = intent?.metadata as { marketplaceOrderId?: string } | null;
  if (!meta?.marketplaceOrderId) return null;

  return db.marketplaceOrder.findUnique({
    where: { id: meta.marketplaceOrderId },
    select: { id: true, sellerId: true, buyerId: true },
  });
}
