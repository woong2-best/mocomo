import type { PaymentIntentType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { checkoutCurrencyForType, isPaymentsConfigured } from "@/lib/payments";
import { fulfillPaymentIntent } from "@/lib/payment-fulfillment";
import { getAppOrigin, getStripe, isStripeConfigured } from "@/lib/stripe";
import { verifyStripeCheckoutSession } from "@/lib/stripe-checkout";
import { safeReturnPath } from "@/lib/donation-metadata";
import { validatePaymentInput } from "@/lib/stripe-checkout-validate";

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

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
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
    success_url: urls.successUrl,
    cancel_url: urls.cancelUrl,
    customer_email: input.email ?? undefined,
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

  let redirectPath = "/support";
  if (result.type === "MOCO_TOPUP") {
    redirectPath = "/wallet";
  }
  if (result.type === "TIP") {
    const meta = intent.metadata as Record<string, string | undefined>;
    redirectPath = safeReturnPath(
      meta.returnPath,
      meta.username ? `/u/${meta.username}` : "/support"
    );
    if (meta.channelId) {
      redirectPath = `/voice/${meta.channelId}`;
    }
  }

  if (result.type === "EVENT_REGISTRATION") {
    const meta = intent.metadata as Record<string, string | undefined>;
    if (meta.eventId) redirectPath = `/events/new?eventId=${meta.eventId}&paid=1`;
    else redirectPath = "/events";
  }

  if (result.type === "CREATOR_EPISODE") {
    const meta = intent.metadata as Record<string, string | undefined>;
    if (meta.episodeId) redirectPath = `/works/e/${meta.episodeId}?paid=1`;
    else redirectPath = "/works";
  }

  if (result.type === "POST_MEDIA") {
    const meta = intent.metadata as Record<string, string | undefined>;
    if (meta.returnPath) {
      redirectPath = safeReturnPath(meta.returnPath, "/");
    } else if (meta.username) {
      redirectPath = `/u/${meta.username}?paid=1`;
    } else {
      redirectPath = "/";
    }
  }

  if (result.type === "CREATOR_SUBSCRIPTION") {
    const meta = intent.metadata as Record<string, string | undefined>;
    redirectPath = meta.username ? `/u/${meta.username}?subscribed=1` : "/";
  }

  if (result.type === "FLOWER") {
    redirectPath = "/flowers?tab=wallet";
  }

  if (result.type === "STUDIO_ASSET") {
    const meta = intent.metadata as Record<string, string | undefined>;
    redirectPath = meta.studioAssetId
      ? `/studio/library?purchased=${meta.studioAssetId}`
      : "/studio/library";
  }

  return {
    success: true as const,
    type: result.type,
    alreadyPaid: result.alreadyPaid,
    redirectPath,
  };
}
