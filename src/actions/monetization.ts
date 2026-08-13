"use server";

import { revalidatePath } from "next/cache";
import { revalidateAptHub } from "@/lib/apt/revalidate-hub";
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
}) {
  const user = await requireAuth();
  return createStripeCheckoutForUser({
    userId: user.id,
    email: user.email,
    platform: "web",
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
    orderName: "MoCoMo 결제",
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
    revalidateAptHub();
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
  return { error: "Stripe Checkout으로 결제해 주세요. session_id가 필요합니다." };
}

export async function sendTip(_receiverId: string, _amount: number, _message?: string) {
  return { error: "결제 창을 통해 후원해 주세요." };
}

export async function subscribeToCreator(creatorId: string, amount: number) {
  if (!isPaymentsConfigured()) {
    return { error: "결제가 설정되지 않았습니다." };
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
  return { error: "결제 창을 통해 프리미엄을 구독해 주세요." };
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
    return { error: "미리보기·다운로드 URL이 필요합니다." };
  }
  const product = await db.digitalProduct.create({
    data: { sellerId: user.id, ...data },
  });
  revalidatePath("/support");
  return { product };
}

export async function purchaseProduct(_productId: string) {
  return { error: "결제 창을 통해 구매해 주세요." };
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
