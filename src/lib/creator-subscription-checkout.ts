import type { PaymentIntentType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { checkoutRedirectPath } from "@/lib/checkout-redirect";
import { checkoutCurrencyForType, isPaymentsConfigured } from "@/lib/payments";
import { getAppOrigin, getStripe, isStripeConfigured } from "@/lib/stripe";
import { validatePaymentInput } from "@/lib/stripe-checkout-validate";
import { getOrCreateStripeCustomer } from "@/lib/stripe-payment-methods";
import { assertOfacPaymentRequestAllowed } from "@/lib/compliance/ofac-payment-guard-server";
import {
  assertAndRecordPurchaseTermsConsent,
  assertPurchaseTermsConsentRecorded,
} from "@/lib/purchase-terms-consent";
import {
  assertAndRecordRecurringDonationConsent,
  assertRecurringDonationConsentRecorded,
} from "@/lib/recurring-donation-consent";
import type { PurchaseTermsPlatform } from "@/lib/purchase-chargeback-terms";
import { stripeCheckoutReturnUrls, type CheckoutPlatform } from "@/lib/stripe-checkout-service";
import { fulfillCreatorSubscriptionFromStripe } from "@/lib/creator-subscription-stripe";

export async function createCreatorSubscriptionCheckoutForUser(input: {
  userId: string;
  email?: string | null;
  amount: number;
  orderName: string;
  metadata: Record<string, unknown>;
  platform?: CheckoutPlatform;
  purchaseTermsAccepted?: boolean;
  recurringDonationTermsAccepted?: boolean;
}) {
  void input;
  return { error: "Creator subscriptions have been discontinued." };

  if (!isStripeConfigured()) {
    return { error: "Payments aren't configured." };
  }

  const checkoutInput = {
    type: "CREATOR_SUBSCRIPTION" as PaymentIntentType,
    amount: input.amount,
    metadata: input.metadata,
  };

  const ofacBlock = await assertOfacPaymentRequestAllowed(input.userId, input.metadata);
  if (ofacBlock) return ofacBlock;

  const validation = await validatePaymentInput(input.userId, checkoutInput);
  if (validation) return validation;

  const intent = await db.paymentIntent.create({
    data: {
      userId: input.userId,
      type: "CREATOR_SUBSCRIPTION",
      amount: input.amount,
      metadata: input.metadata as Prisma.InputJsonValue,
    },
  });

  const purchaseConsent = await assertAndRecordPurchaseTermsConsent({
    userId: input.userId,
    paymentIntentId: intent.id,
    termsAccepted: input.purchaseTermsAccepted === true,
    platform: input.platform === "mobile" ? "mobile" : "web",
  });
  if (purchaseConsent.error) {
    await db.paymentIntent.delete({ where: { id: intent.id } }).catch(() => null);
    return { error: purchaseConsent.error };
  }

  const recurringConsent = await assertAndRecordRecurringDonationConsent({
    userId: input.userId,
    paymentIntentId: intent.id,
    accepted: input.recurringDonationTermsAccepted === true,
  });
  if (recurringConsent.error) {
    await db.paymentIntent.delete({ where: { id: intent.id } }).catch(() => null);
    return { error: recurringConsent.error };
  }

  const creatorId = String(input.metadata.creatorId ?? "");
  const urls = stripeCheckoutReturnUrls(input.platform ?? "web");
  const stripe = getStripe();
  const currency = checkoutCurrencyForType("CREATOR_SUBSCRIPTION");
  const customerId = await getOrCreateStripeCustomer(input.userId, input.email);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    payment_method_types: ["card"],
    automatic_tax: { enabled: true },
    customer_update: { address: "auto" },
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: input.amount,
          recurring: { interval: "month" },
          product_data: { name: input.orderName },
        },
        quantity: 1,
      },
    ],
    metadata: {
      orderId: intent.id,
      type: "CREATOR_SUBSCRIPTION",
      userId: input.userId,
      creatorId,
    },
    subscription_data: {
      metadata: {
        orderId: intent.id,
        creatorId,
        subscriberId: input.userId,
        type: "CREATOR_SUBSCRIPTION",
      },
    },
    success_url: urls.successUrl,
    cancel_url: urls.cancelUrl,
  });

  if (!session.url) return { error: "Could not create checkout page." };

  await db.paymentIntent.update({
    where: { id: intent.id },
    data: { paymentKey: session.id },
  });

  return { checkoutUrl: session.url, orderId: intent.id };
}

export async function confirmCreatorSubscriptionCheckout(userId: string, sessionId: string) {
  if (!isPaymentsConfigured()) {
    return { error: "Payments aren't configured." };
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const orderId = session.metadata?.orderId;
  if (!orderId) return { error: "No order information." };

  const intent = await db.paymentIntent.findUnique({ where: { id: orderId } });
  if (!intent || intent.userId !== userId) {
    return { error: "Payment information not found." };
  }

  if (intent.status === "PAID") {
    return {
      success: true as const,
      type: intent.type,
      alreadyPaid: true,
      redirectPath: checkoutRedirectPath(intent, intent.type),
    };
  }

  if (session.payment_status !== "paid" && session.status !== "complete") {
    return { error: "Payment not completed." };
  }

  const purchaseConsent = await assertPurchaseTermsConsentRecorded(userId, orderId);
  if (purchaseConsent.error) return { error: purchaseConsent.error };

  const recurringConsent = await assertRecurringDonationConsentRecorded(userId, orderId);
  if (recurringConsent.error) return { error: recurringConsent.error };

  const subRef = session.subscription;
  const stripeSubscriptionId = typeof subRef === "string" ? subRef : null;
  if (!stripeSubscriptionId) {
    return { error: "Could not verify subscription information." };
  }

  const amount = session.amount_total ?? intent.amount;
  const result = await fulfillCreatorSubscriptionFromStripe({
    orderId,
    subscriberId: userId,
    stripeSubscriptionId,
    stripeSessionId: sessionId,
    amountUsdCents: amount,
  });

  if ("error" in result) return { error: result.error };

  return {
    success: true as const,
    type: "CREATOR_SUBSCRIPTION",
    redirectPath: checkoutRedirectPath(intent, "CREATOR_SUBSCRIPTION"),
  };
}
