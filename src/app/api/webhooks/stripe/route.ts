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

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    const { syncStripeConnectAccountToDb } = await import(
      "@/lib/marketplace/stripe-connect-sync"
    );
    await syncStripeConnectAccountToDb(account).catch((e) => {
      console.error("[stripe-webhook] account.updated sync failed", e);
    });
  }

  if (event.type === "person.updated") {
    const person = event.data.object as Stripe.Person;
    const accountId =
      typeof person.account === "string" ? person.account : person.account?.id;
    if (accountId) {
      const stripe = getStripe();
      const account = await stripe.accounts.retrieve(accountId).catch(() => null);
      if (account) {
        const { syncStripeConnectAccountToDb } = await import(
          "@/lib/marketplace/stripe-connect-sync"
        );
        await syncStripeConnectAccountToDb(account).catch((e) => {
          console.error("[stripe-webhook] person.updated sync failed", e);
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
