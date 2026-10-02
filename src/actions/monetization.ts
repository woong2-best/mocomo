"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ProductType, PaymentIntentType } from "@prisma/client";
import { isPaymentsConfigured } from "@/lib/payments";
import {
  confirmStripeCheckoutForUser,
  createStripeCheckoutForUser,
} from "@/lib/stripe-checkout-service";

/** Stripe Checkout 세션 생성 후 결제 페이지 URL 반환 */
export async function createStripeCheckout(input: {
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

/** @deprecated createStripeCheckout 사용 */
export async function createPaymentIntent(input: {
  type: PaymentIntentType;
  amount: number;
  metadata: Record<string, unknown>;
}) {
  return createStripeCheckout({
    type: input.type,
    amount: input.amount,
    orderName: "actions.mocomo",
    metadata: input.metadata,
  });
}

export async function confirmStripeCheckout(sessionId: string) {
  const user = await requireAuth();
  const result = await confirmStripeCheckoutForUser(user.id, sessionId);
  if ("error" in result && result.error) return { error: result.error };

  revalidatePath("/support");
  revalidatePath("/wallet");

  if (result.type === "FLOWER") {
    revalidatePath("/flowers");
  }
  if (result.type === "STUDIO_ASSET") {
    revalidatePath("/studio/library");
    revalidatePath("/studio/market");
  }

  return {
    success: true,
    type: result.type,
    alreadyPaid: result.alreadyPaid,
    redirectPath: result.redirectPath,
  };
}

/** @deprecated confirmStripeCheckout 사용 */
export async function confirmPaymentIntent(
  _paymentKey: string,
  _orderId: string,
  _amount: number
) {
  return { error: "actions.stripe_checkout_session_id" };
}

export async function sendTip(_receiverId: string, _amount: number, _message?: string) {
  return { error: "actions.s1tfxq3u" };
}

export async function subscribeToCreator(creatorId: string, amount: number) {
  if (!isPaymentsConfigured()) {
    return { error: "market.paymentsDisabled" };
  }
  const user = await requireAuth();
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  const sub = await db.subscription.upsert({
    where: { subscriberId_creatorId: { subscriberId: user.id, creatorId } },
    create: {
      subscriberId: user.id,
      creatorId,
      amount,
      currentPeriodEnd: periodEnd,
      status: "active",
    },
    update: { amount, currentPeriodEnd: periodEnd, status: "active" },
  });
  return { subscription: sub };
}

export async function upgradePremium() {
  return { error: "actions.sv8rxhj" };
}

export async function createDigitalProduct(data: {
  title: string;
  description?: string;
  price: number;
  type: ProductType;
  previewUrl: string;
  fileUrl: string;
}) {
  const user = await requireAuth();
  if (!data.previewUrl || !data.fileUrl) {
    return { error: "actions.url_3" };
  }
  const product = await db.digitalProduct.create({
    data: { sellerId: user.id, ...data },
  });
  revalidatePath("/support");
  return { product };
}

export async function purchaseProduct(_productId: string) {
  return { error: "actions.s15yrkd2" };
}

export async function getTipRanking(limit = 10) {
  const tips = await db.tip.groupBy({
    by: ["receiverId"],
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: limit,
  });
  const users = await db.user.findMany({
    where: { id: { in: tips.map((t) => t.receiverId) } },
    select: { id: true, username: true, image: true, supportTierSent: true },
  });
  return tips.map((t, i) => ({
    rank: i + 1,
    user: users.find((u) => u.id === t.receiverId),
    total: t._sum.amount ?? 0,
  }));
}

export async function getUserPurchases(userId: string) {
  const orders = await db.order.findMany({
    where: { buyerId: userId, status: "completed" },
    include: {
      items: { include: { product: { select: { id: true, title: true, fileUrl: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  return orders.flatMap((o) => o.items.map((i) => i.product));
}
