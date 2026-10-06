import type { PaymentIntentType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { checkoutCurrencyForType, isPaymentsConfigured } from "@/lib/payments";
import { fulfillPaymentIntent } from "@/lib/payment-fulfillment";
import { checkoutRedirectPath } from "@/lib/checkout-redirect";
import { confirmCreatorSubscriptionCheckout } from "@/lib/creator-subscription-checkout";
import { getAppOrigin, getStripe, isStripeConfigured } from "@/lib/stripe";
import { verifyStripeCheckoutSession } from "@/lib/stripe-checkout";
import { validatePaymentInput } from "@/lib/stripe-checkout-validate";
import { getOrCreateStripeCustomer } from "@/lib/stripe-payment-methods";
import { assertOfacPaymentRequestAllowed } from "@/lib/compliance/ofac-payment-guard-server";
import {
  assertAndRecordPurchaseTermsConsent,
  assertPurchaseTermsConsentRecorded,
} from "@/lib/purchase-terms-consent";
import type { PurchaseTermsPlatform } from "@/lib/purchase-chargeback-terms";

export type CheckoutPlatform = "web" | "mobile";

export function stripeCheckoutReturnUrls(platform: CheckoutPlatform) {
  const origin = getAppOrigin();
  if (platform === "mobile") {
    return {
      successUrl: `${origin}/payments/mobile-return?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/payments/mobile-cancel`,
    };
  }
  return {
    successUrl: `${origin}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}/payments/fail`,
  };
}

export async function createStripeCheckoutForUser(input: {
  userId: string;
  email?: string | null;
  type: PaymentIntentType;
  amount: number;
  orderName: string;
  metadata: Record<string, unknown>;
  platform?: CheckoutPlatform;
  purchaseTermsAccepted?: boolean;
}) {
  if (!isStripeConfigured()) {
    return {
      error:
        "Payments are not configured. Set STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.",
    };
  }

  const { assertMoneyAgeAllowed } = await import("@/lib/money-age-gate");
  const ageBlock = await assertMoneyAgeAllowed(input.userId);
  if (ageBlock) return ageBlock;

  const ofacBlock = await assertOfacPaymentRequestAllowed(input.userId, input.metadata);
  if (ofacBlock) return ofacBlock;

  const validation = await validatePaymentInput(input.userId, input);
  if (validation) return validation;

  const intent = await db.paymentIntent.create({
    data: {
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      metadata: input.metadata as Prisma.InputJsonValue,
    },
  });

  const consentBlock = await assertAndRecordPurchaseTermsConsent({
    userId: input.userId,
    paymentIntentId: intent.id,
    termsAccepted: input.purchaseTermsAccepted === true,
    platform: input.platform === "mobile" ? "mobile" : "web",
  });
  if (consentBlock.error) {
    await db.paymentIntent.delete({ where: { id: intent.id } }).catch(() => null);
    return { error: consentBlock.error };
  }

  const urls = stripeCheckoutReturnUrls(input.platform ?? "web");
  const stripe = getStripe();
  const currency = checkoutCurrencyForType(input.type);
  let customerId: string;
  try {
    customerId = await getOrCreateStripeCustomer(input.userId, input.email);
  } catch (err) {
    console.error("[stripe-checkout] customer", err instanceof Error ? err.message : "error");
    return { error: "Could not open the checkout page. Try again in a moment." };
  }

  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: "payment",
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: input.amount,
          product_data: { name: input.orderName },
        },
        quantity: 1,
      },
    ],
    metadata: {
      orderId: intent.id,
      type: input.type,
      userId: input.userId,
    },
    payment_intent_data: {
      setup_future_usage: "off_session",
      metadata: {
        orderId: intent.id,
        type: input.type,
        userId: input.userId,
      },
    },
    success_url: urls.successUrl,
    cancel_url: urls.cancelUrl,
  };

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      ...sessionParams,
      automatic_tax: { enabled: true },
      customer_update: { address: "auto" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const taxAddressMissing = /head office address|automatic tax/i.test(message);
    if (!taxAddressMissing) {
      console.error("[stripe-checkout] session", message || "error");
      return { error: "Could not open the checkout page. Try again in a moment." };
    }
    try {
      session = await stripe.checkout.sessions.create(sessionParams);
    } catch (retryErr) {
      console.error(
        "[stripe-checkout] session retry",
        retryErr instanceof Error ? retryErr.message : "error"
      );
      return { error: "Could not open the checkout page. Try again in a moment." };
    }
  }

  if (!session.url) return { error: "Could not create checkout page." };

  return { checkoutUrl: session.url, orderId: intent.id };
}

export async function confirmStripeCheckoutForUser(userId: string, sessionId: string) {
  if (!isPaymentsConfigured()) {
    return { error: "Payments aren't configured." };
  }

  const verified = await verifyStripeCheckoutSession(sessionId);
  if (!verified.ok) return { error: verified.error };

  const intent = await db.paymentIntent.findUnique({ where: { id: verified.orderId } });
  if (!intent || intent.userId !== userId) {
    return { error: "Payment information not found." };
  }

  if (intent.type === "CREATOR_SUBSCRIPTION") {
    return confirmCreatorSubscriptionCheckout(userId, sessionId);
  }

  const consentBlock = await assertPurchaseTermsConsentRecorded(userId, verified.orderId);
  if (consentBlock.error) return { error: consentBlock.error };

  const result = await fulfillPaymentIntent(
    verified.orderId,
    verified.paymentRef,
    verified.amount
  );
  if (!result.ok) return { error: result.error };

  return {
    success: true as const,
    type: result.type,
    alreadyPaid: result.alreadyPaid,
    redirectPath: checkoutRedirectPath(intent, result.type),
  };
}
