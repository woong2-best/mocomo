import { NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { fulfillPaymentIntent } from "@/lib/payment-fulfillment";
import { verifyStripeCheckoutSession } from "@/lib/stripe-checkout";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET missing" }, { status: 503 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const sessionId = session.id;
    const verified = await verifyStripeCheckoutSession(sessionId);
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 422 });
    }

    const result = await fulfillPaymentIntent(
      verified.orderId,
      verified.paymentRef,
      verified.amount
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const orderId = pi.metadata?.orderId;
    if (orderId) {
      const result = await fulfillPaymentIntent(orderId, pi.id, pi.amount);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 422 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
