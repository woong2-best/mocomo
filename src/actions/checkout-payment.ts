"use server";

import { revalidatePath } from "next/cache";
import { revalidateAptHub } from "@/lib/apt/revalidate-hub";
import { requireAuth } from "@/lib/auth";
import {
  confirmCheckoutPaymentIntent,
  payCheckoutWithSavedMethod,
  prepareCheckoutPaymentIntent,
} from "@/lib/stripe-pay-intent-service";
import { payCheckoutWithMoco } from "@/lib/moco-checkout-service";
import { createStripeCheckoutForUser } from "@/lib/stripe-checkout-service";
import type { PaymentIntentType } from "@prisma/client";
import {
  createMarketplaceCheckoutSessionForPaymentIntent,
  prepareMarketplacePaymentForBuyer,
  type MarketplaceCheckoutInput,
} from "@/actions/marketplace-checkout";

function revalidateAfterPayment(type: string) {
  revalidatePath("/support");
  revalidatePath("/wallet");
  revalidatePath("/");
  revalidatePath("/feed");
  if (type === "POST_MEDIA") {
    revalidatePath("/post/[id]", "page");
    revalidatePath("/u/[username]", "page");
  }
  if (type === "FLOWER") revalidatePath("/flowers");
  if (type === "STUDIO_ASSET") {
    revalidatePath("/studio/library");
    revalidatePath("/studio/market");
    revalidateAptHub();
  }
  if (type === "MARKETPLACE") {
    revalidatePath("/market");
    revalidatePath("/market/orders");
  }
}

export async function prepareCheckoutPayment(input: {
  type: PaymentIntentType;
  amount: number;
  orderName: string;
  metadata: Record<string, unknown>;
}) {
  const user = await requireAuth();
  return prepareCheckoutPaymentIntent({
    userId: user.id,
    email: user.email,
    ...input,
  });
}

export async function payWithMoco(orderId: string) {
  const user = await requireAuth();
  const { checkRateLimit, authLimiter } = await import("@/lib/ratelimit");
  const limited = await checkRateLimit(authLimiter, `moco-pay:${user.id}`);
  if (!limited.success) {
    return { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." };
  }
  if (!orderId || typeof orderId !== "string" || orderId.length > 64) {
    return { error: "잘못된 결제 요청입니다." };
  }
  const result = await payCheckoutWithMoco(user.id, orderId);
  if ("success" in result && result.success) {
    revalidateAfterPayment(result.type);
  }
  return result;
}

export async function payWithSavedCard(orderId: string, paymentMethodId: string) {
  const user = await requireAuth();
  const result = await payCheckoutWithSavedMethod(user.id, orderId, paymentMethodId);
  if ("success" in result && result.success) {
    revalidateAfterPayment(result.type);
  }
  return result;
}

export async function confirmCheckoutPayment(orderId: string) {
  const user = await requireAuth();
  const result = await confirmCheckoutPaymentIntent(user.id, orderId);
  if ("success" in result && result.success) {
    revalidateAfterPayment(result.type);
  }
  return result;
}

/** Fallback — Stripe Checkout redirect with saved customer cards */
export async function createStripeCheckoutRedirect(input: {
  type: PaymentIntentType;
  amount: number;
  orderName: string;
  metadata: Record<string, unknown>;
}) {
  const user = await requireAuth();
  return createStripeCheckoutForUser({
    userId: user.id,
    email: user.email,
    platform: "web",
    ...input,
  });
}

export async function prepareMarketplacePayment(input: MarketplaceCheckoutInput) {
  const user = await requireAuth();
  return prepareMarketplacePaymentForBuyer(
    { id: user.id, email: user.email },
    input,
    "web"
  );
}

export async function payMarketplaceWithSavedCard(orderId: string, paymentMethodId: string) {
  const user = await requireAuth();
  const result = await payCheckoutWithSavedMethod(user.id, orderId, paymentMethodId);
  if ("success" in result && result.success) {
    revalidateAfterPayment(result.type);
  }
  return result;
}

export async function confirmMarketplacePayment(orderId: string) {
  const user = await requireAuth();
  const result = await confirmCheckoutPaymentIntent(user.id, orderId);
  if ("success" in result && result.success) {
    revalidateAfterPayment(result.type);
  }
  return result;
}

export async function createMarketplaceCheckoutRedirect(orderId: string) {
  const user = await requireAuth();
  return createMarketplaceCheckoutSessionForPaymentIntent(
    { id: user.id, email: user.email },
    orderId,
    "web"
  );
}
