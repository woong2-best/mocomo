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
import { payCheckoutWithGems } from "@/lib/gems/checkout-pay";
import { safeReturnPath } from "@/lib/donation-metadata";
import { createStripeCheckoutForUser } from "@/lib/stripe-checkout-service";
import type { PaymentIntentType } from "@prisma/client";
import { db } from "@/lib/db";
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
  if (type === "GEM_TOPUP") {
    revalidatePath("/wallet");
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

export async function payWithMoco(orderId: string, purchaseTermsAccepted?: boolean) {
  const user = await requireAuth();
  const { checkRateLimit, authLimiter } = await import("@/lib/ratelimit");
  const limited = await checkRateLimit(authLimiter, `moco-pay:${user.id}`);
  if (!limited.success) {
    return { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." };
  }
  if (!orderId || typeof orderId !== "string" || orderId.length > 64) {
    return { error: "잘못된 결제 요청입니다." };
  }
  const result = await payCheckoutWithMoco(user.id, orderId, {
    purchaseTermsAccepted,
    platform: "web",
  });
  if ("success" in result && result.success) {
    revalidateAfterPayment(result.type);
  }
  return result;
}

export async function payWithSavedCard(
  orderId: string,
  paymentMethodId: string,
  purchaseTermsAccepted?: boolean
) {
  const user = await requireAuth();
  const result = await payCheckoutWithSavedMethod(user.id, orderId, paymentMethodId, {
    purchaseTermsAccepted,
    platform: "web",
  });
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

function gemPayRedirectPath(
  type: PaymentIntentType,
  metadata: Record<string, unknown>
): string {
  if (type === "TIP") {
    const username = typeof metadata.username === "string" ? metadata.username : undefined;
    const channelId = typeof metadata.channelId === "string" ? metadata.channelId : undefined;
    const returnPath = typeof metadata.returnPath === "string" ? metadata.returnPath : undefined;
    if (channelId) return `/voice/${channelId}`;
    return safeReturnPath(returnPath, username ? `/u/${username}` : "/support");
  }
  if (type === "POST_MEDIA") {
    const returnPath = typeof metadata.returnPath === "string" ? metadata.returnPath : undefined;
    const username = typeof metadata.username === "string" ? metadata.username : undefined;
    if (returnPath) return safeReturnPath(returnPath, "/");
    if (username) return `/u/${username}?paid=1`;
    const postId = typeof metadata.postId === "string" ? metadata.postId : undefined;
    if (postId) return `/post/${postId}`;
    return "/";
  }
  return "/wallet";
}

export async function payWithGems(input: {
  type: PaymentIntentType;
  amount: number;
  metadata: Record<string, unknown>;
}) {
  const user = await requireAuth();
  const { checkRateLimit, authLimiter } = await import("@/lib/ratelimit");
  const limited = await checkRateLimit(authLimiter, `gem-pay:${user.id}`);
  if (!limited.success) {
    return { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." };
  }

  const result = await payCheckoutWithGems({
    userId: user.id,
    type: input.type,
    amountUsdCents: input.amount,
    metadata: input.metadata,
  });

  if ("error" in result && result.error) {
    const messages: Record<string, string> = {
      INSUFFICIENT_GEMS_BALANCE: "젬 잔액이 부족합니다. 지갑에서 충전해 주세요.",
    };
    return { error: messages[result.error] ?? result.error };
  }

  if ("success" in result && result.success) {
    revalidateAfterPayment(input.type);
    return {
      success: true as const,
      type: input.type,
      redirectPath: gemPayRedirectPath(input.type, input.metadata),
      balance: "balance" in result ? result.balance : undefined,
    };
  }

  return { error: "결제에 실패했습니다." };
}

export async function createStripeCheckoutRedirect(input: {
  type: PaymentIntentType;
  amount: number;
  orderName: string;
  metadata: Record<string, unknown>;
  purchaseTermsAccepted?: boolean;
}) {
  const user = await requireAuth();
  return createStripeCheckoutForUser({
    userId: user.id,
    email: user.email,
    platform: "web",
    purchaseTermsAccepted: input.purchaseTermsAccepted,
    ...input,
  });
}

export async function prepareMarketplacePayment(input: MarketplaceCheckoutInput) {
  const user = await requireAuth();
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { countryCode: true },
  });
  return prepareMarketplacePaymentForBuyer(
    { id: user.id, email: user.email, countryCode: dbUser?.countryCode },
    input,
    "web"
  );
}

export async function payMarketplaceWithSavedCard(
  orderId: string,
  paymentMethodId: string,
  purchaseTermsAccepted?: boolean
) {
  const user = await requireAuth();
  const result = await payCheckoutWithSavedMethod(user.id, orderId, paymentMethodId, {
    purchaseTermsAccepted,
    platform: "web",
  });
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

export async function createMarketplaceCheckoutRedirect(
  orderId: string,
  purchaseTermsAccepted?: boolean
) {
  const user = await requireAuth();
  return createMarketplaceCheckoutSessionForPaymentIntent(
    { id: user.id, email: user.email },
    orderId,
    "web",
    { purchaseTermsAccepted }
  );
}
