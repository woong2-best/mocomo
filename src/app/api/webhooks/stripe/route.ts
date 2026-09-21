import { NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { fulfillPaymentIntent } from "@/lib/payment-fulfillment";
import { verifyStripeCheckoutSession } from "@/lib/stripe-checkout";
import { confirmCreatorSubscriptionCheckout } from "@/lib/creator-subscription-checkout";
import { db } from "@/lib/db";
import { isMarketplacePaymentAuthorized } from "@/lib/marketplace/stripe-payment";
import { handleStripeChargeDisputeEvent } from "@/lib/marketplace/stripe-dispute";
import type Stripe from "stripe";
import { getStripeSubscriptionIdFromInvoice } from "@/lib/stripe-subscription-utils";

export const runtime = "nodejs";

/** Platform + Connect webhook signing secrets (둘 중 하나로 서명 검증) */
function stripeWebhookSecrets(): string[] {
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET?.trim(),
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim(),
  ].filter((s): s is string => !!s && s.length > 0);
  return [...new Set(secrets)];
}

function constructStripeEvent(
  stripe: ReturnType<typeof getStripe>,
  body: string,
  signature: string,
  secrets: string[]
): Stripe.Event {
  let lastError: unknown;
  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(body, signature, secret);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Invalid signature");
}

async function fulfillFromPaymentIntent(pi: Stripe.PaymentIntent) {
  const orderId = pi.metadata?.orderId;
  if (!orderId) return null;

  if (pi.metadata?.type === "USED_AUCTION_BID_HOLD") {
    return null;
  }

  const isMarketplace = pi.metadata?.type === "MARKETPLACE";
  if (isMarketplace && !isMarketplacePaymentAuthorized(pi)) {
    return null;
  }

  const amount =
    isMarketplace && pi.status === "requires_capture"
      ? pi.amount
      : pi.amount;

  return fulfillPaymentIntent(orderId, pi.id, amount);
}

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const secrets = stripeWebhookSecrets();
  if (secrets.length === 0) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET (and optionally STRIPE_CONNECT_WEBHOOK_SECRET) missing" },
      { status: 503 }
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = constructStripeEvent(stripe, body, signature, secrets);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const sessionId = session.id;

    if (session.mode === "subscription" && session.metadata?.type === "CREATOR_SUBSCRIPTION") {
      const subscriberId = session.metadata?.userId;
      if (subscriberId) {
        await confirmCreatorSubscriptionCheckout(subscriberId, sessionId).catch((e) => {
          console.error("[stripe-webhook] creator subscription checkout", e);
        });
      }
    } else {
      const verified = await verifyStripeCheckoutSession(sessionId);
      if (!verified.ok) {
        return NextResponse.json({ error: verified.error }, { status: 422 });
      }

      const intent = await db.paymentIntent.findUnique({ where: { id: verified.orderId } });
      if (intent?.type === "CREATOR_SUBSCRIPTION") {
        await confirmCreatorSubscriptionCheckout(intent.userId, sessionId);
      } else {
        const result = await fulfillPaymentIntent(
          verified.orderId,
          verified.paymentRef,
          verified.amount
        );
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 422 });
        }
      }
    }
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const stripeSubscriptionId = getStripeSubscriptionIdFromInvoice(invoice);
    if (stripeSubscriptionId && invoice.billing_reason === "subscription_cycle") {
      const { renewCreatorSubscriptionFromInvoice } = await import(
        "@/lib/creator-subscription-stripe"
      );
      await renewCreatorSubscriptionFromInvoice({
        stripeSubscriptionId,
        amountUsdCents: invoice.amount_paid,
        stripeInvoiceId: invoice.id,
      }).catch((e) => console.error("[stripe-webhook] subscription renewal", e));
    }
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const { syncCreatorSubscriptionFromStripe } = await import(
      "@/lib/creator-subscription-stripe"
    );
    await syncCreatorSubscriptionFromStripe(sub.id).catch((e) =>
      console.error("[stripe-webhook] subscription sync", e)
    );
  }

  if (
    event.type === "payment_intent.amount_capturable_updated" ||
    event.type === "payment_intent.succeeded"
  ) {
    const pi = event.data.object as Stripe.PaymentIntent;

    if (event.type === "payment_intent.succeeded" && pi.metadata?.type === "MARKETPLACE") {
      // Marketplace fulfillment happens on authorization; capture triggers settlement in escrow.
    } else if (pi.metadata?.type === "USED_AUCTION_BID_HOLD") {
      // Bid holds are verified at bid placement; no product fulfillment.
    } else {
      const result = await fulfillFromPaymentIntent(pi);
      if (result && !result.ok) {
        return NextResponse.json({ error: result.error }, { status: 422 });
      }
    }
  }

  if (
    event.type === "charge.dispute.created" ||
    event.type === "charge.dispute.closed" ||
    event.type === "charge.dispute.funds_withdrawn"
  ) {
    await handleStripeChargeDisputeEvent(event).catch((e) => {
      console.error("[stripe-webhook] charge.dispute handler failed", e);
    });
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    const { syncStripeConnectAccountToDb } = await import(
      "@/lib/marketplace/stripe-connect-sync"
    );
    await syncStripeConnectAccountToDb(account).catch((e) => {
      console.error("[stripe-webhook] account.updated sync failed", e);
    });

    const userId = account.metadata?.mocomoUserId?.trim();
    if (userId && account.payouts_enabled) {
      const { reprocessHeldRewardBatchesForUser } = await import(
        "@/lib/settlement-moco/payout"
      );
      await reprocessHeldRewardBatchesForUser(userId).catch((e) => {
        console.error("[stripe-webhook] reward reprocess after account.updated", e);
      });
    }
  }

  if (event.type === "person.updated") {
    const person = event.data.object as Stripe.Person;
    const accountRef = person.account;
    const accountId = typeof accountRef === "string" ? accountRef : null;
    if (accountId) {
      const stripeClient = getStripe();
      const account = await stripeClient.accounts.retrieve(accountId).catch(() => null);
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

  // Transfer 성공은 cron의 transfers.create 응답으로 COMPLETED 처리.
  // Stripe에 transfer.failed / transfer.paid 이벤트는 없음 — 비동기 실패는 transfer.reversed 만 수신.
  if (event.type === "transfer.reversed") {
    const transfer = event.data.object as Stripe.Transfer;
    const { handleCreatorRewardTransferReversed } = await import(
      "@/lib/settlement-moco/transfer-webhook"
    );
    await handleCreatorRewardTransferReversed(transfer).catch((e) => {
      console.error("[stripe-webhook] transfer.reversed handler", e);
    });
  }

  if (event.type === "payout.failed") {
    const payout = event.data.object as Stripe.Payout;
    const connectAccountId =
      typeof event.account === "string" ? event.account : null;
    const { handleCreatorRewardPayoutFailed } = await import(
      "@/lib/settlement-moco/transfer-webhook"
    );
    await handleCreatorRewardPayoutFailed(payout, connectAccountId).catch((e) => {
      console.error("[stripe-webhook] payout.failed handler", e);
    });
  }

  return NextResponse.json({ received: true });
}
