import type { PaymentIntentType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { checkoutCurrencyForType, isPaymentsConfigured } from "@/lib/payments";
import { fulfillPaymentIntent } from "@/lib/payment-fulfillment";
import { checkoutRedirectPath } from "@/lib/checkout-redirect";
import { getAppOrigin, getStripe, isStripeConfigured } from "@/lib/stripe";
import { verifyStripeCheckoutSession } from "@/lib/stripe-checkout";
import { validatePaymentInput } from "@/lib/stripe-checkout-validate";
import { getOrCreateStripeCustomer } from "@/lib/stripe-payment-methods";
import { assertOfacPaymentRequestAllowed } from "@/lib/compliance/ofac-payment-guard-server";

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
}) {
  if (!isStripeConfigured()) {
    return {
      error:
        "결제가 설정되지 않았습니다. STRIPE_SECRET_KEY와 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY를 설정하세요.",
    };
  }

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

  const urls = stripeCheckoutReturnUrls(input.platform ?? "web");
  const stripe = getStripe();
  const currency = checkoutCurrencyForType(input.type);
  const customerId = await getOrCreateStripeCustomer(input.userId, input.email);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    payment_method_types: ["card"],
    automatic_tax: { enabled: true },
    customer_update: { address: "auto" },
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
  });

  if (!session.url) return { error: "결제 페이지를 만들 수 없습니다." };

  return { checkoutUrl: session.url, orderId: intent.id };
}

export async function confirmStripeCheckoutForUser(userId: string, sessionId: string) {
  if (!isPaymentsConfigured()) {
    return { error: "결제가 설정되지 않았습니다." };
  }

  const verified = await verifyStripeCheckoutSession(sessionId);
  if (!verified.ok) return { error: verified.error };

  const intent = await db.paymentIntent.findUnique({ where: { id: verified.orderId } });
  if (!intent || intent.userId !== userId) {
    return { error: "결제 정보를 찾을 수 없습니다." };
  }

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
