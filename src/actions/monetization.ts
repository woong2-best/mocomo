"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { calcPlatformFee } from "@/lib/utils";
import { tierFromAmount } from "@/lib/tiers";
import { ProductType, PaymentIntentType, Prisma } from "@prisma/client";
import {
  isPaymentsConfigured,
  confirmTossPayment,
  PREMIUM_PRICE,
} from "@/lib/payments";
import { LISTING_FEE_KRW } from "@/lib/goods-shop";
import {
  fulfillEmoticonPurchase,
  fulfillListingFee,
  fulfillPhysicalGoodsPayment,
} from "@/actions/goods-shop";

const PLATFORM_FEE_RATE = 0.1;

async function fulfillTip(senderId: string, receiverId: string, amount: number, message?: string) {
  const receiver = await db.user.findUnique({
    where: { id: receiverId },
    select: { username: true },
  });
  if (!receiver) return { error: "사용자를 찾을 수 없습니다." };

  const sender = await db.user.findUnique({
    where: { id: senderId },
    select: { username: true },
  });
  if (!sender) return { error: "사용자를 찾을 수 없습니다." };

  const platformFee = calcPlatformFee(amount, PLATFORM_FEE_RATE);
  await db.tip.create({
    data: {
      senderId,
      receiverId,
      amount,
      message: message || null,
      platformFee,
    },
  });

  const existing = await db.creatorSupport.findUnique({
    where: { supporterId_creatorId: { supporterId: senderId, creatorId: receiverId } },
  });
  const newTotal = (existing?.totalAmount ?? 0) + amount;
  const tier = tierFromAmount(newTotal);

  const [senderRow, receiverRow] = await Promise.all([
    db.user.findUnique({ where: { id: senderId }, select: { totalSupportSent: true } }),
    db.user.findUnique({ where: { id: receiverId }, select: { totalSupportReceived: true } }),
  ]);
  const newSent = (senderRow?.totalSupportSent ?? 0) + amount;
  const newReceived = (receiverRow?.totalSupportReceived ?? 0) + amount;

  await db.user.update({
    where: { id: senderId },
    data: {
      totalSupportSent: newSent,
      supportTierSent: tierFromAmount(newSent),
    },
  });
  await db.user.update({
    where: { id: receiverId },
    data: {
      totalSupportReceived: newReceived,
      supportTierReceived: tierFromAmount(newReceived),
    },
  });

  await db.creatorSupport.upsert({
    where: { supporterId_creatorId: { supporterId: senderId, creatorId: receiverId } },
    create: { supporterId: senderId, creatorId: receiverId, totalAmount: amount, tier },
    update: { totalAmount: newTotal, tier },
  });

  const cosProfile = await db.cosplayerProfile.findUnique({ where: { userId: receiverId } });
  if (cosProfile) {
    await db.cosplayerProfile.update({
      where: { id: cosProfile.id },
      data: { totalTips: { increment: amount - platformFee } },
    });
  }

  const msgPreview = message ? ` "${message.slice(0, 40)}${message.length > 40 ? "…" : ""}"` : "";
  await db.notification.create({
    data: {
      userId: receiverId,
      type: "tip",
      title: "후원 알림",
      body: `${sender.username}님이 ${amount.toLocaleString()}원을 후원했습니다.${msgPreview}`,
      link: `/u/${receiver.username}`,
    },
  });

  revalidatePath(`/u/${receiver.username}`);
  return { tier, totalWithCreator: newTotal };
}

export async function createPaymentIntent(input: {
  type: PaymentIntentType;
  amount: number;
  metadata: Record<string, unknown>;
}) {
  if (!isPaymentsConfigured()) {
    return { error: "결제가 설정되지 않았습니다. TOSS_SECRET_KEY를 .env에 추가하세요." };
  }

  const user = await requireAuth();

  if (input.type === "TIP") {
    const receiverId = input.metadata.receiverId as string;
    if (!receiverId || receiverId === user.id) {
      return { error: "유효하지 않은 후원 대상입니다." };
    }
    if (input.amount < 100) return { error: "최소 후원 금액은 100원입니다." };
    if (input.amount > 10_000_000) return { error: "1회 후원 한도는 1,000만원입니다." };
  }

  if (input.type === "PRODUCT") {
    const productId = input.metadata.productId as string;
    const product = await db.digitalProduct.findUnique({ where: { id: productId } });
    if (!product) return { error: "상품을 찾을 수 없습니다." };
    if (product.price !== input.amount) return { error: "상품 가격이 일치하지 않습니다." };
  }

  if (input.type === "PREMIUM") {
    if (input.amount !== PREMIUM_PRICE) return { error: "프리미엄 가격이 올바르지 않습니다." };
  }

  if (input.type === "EMOTICON") {
    const packId = input.metadata.packId as string;
    const pack = await db.emoticonPack.findUnique({ where: { id: packId } });
    if (!pack) return { error: "이모티콘을 찾을 수 없습니다." };
    if (pack.price !== input.amount) return { error: "이모티콘 가격이 일치하지 않습니다." };
  }

  if (input.type === "LISTING_FEE") {
    if (input.amount !== LISTING_FEE_KRW) return { error: "등록비는 5,000원입니다." };
    const requestId = input.metadata.requestId as string;
    const req = await db.goodsListingRequest.findUnique({ where: { id: requestId } });
    if (!req || req.sellerId !== user.id) return { error: "굿즈 등록 요청을 찾을 수 없습니다." };
    if (req.listingFeePaid) return { error: "이미 등록비가 결제되었습니다." };
  }

  if (input.type === "PHYSICAL_GOODS") {
    const orderId = input.metadata.orderId as string;
    const order = await db.physicalOrder.findUnique({ where: { id: orderId } });
    if (!order || order.buyerId !== user.id) return { error: "주문을 찾을 수 없습니다." };
    if (order.total !== input.amount) return { error: "주문 금액이 일치하지 않습니다." };
    if (order.status !== "PENDING_PAYMENT") return { error: "이미 결제된 주문입니다." };
  }

  const intent = await db.paymentIntent.create({
    data: {
      userId: user.id,
      type: input.type,
      amount: input.amount,
      metadata: input.metadata as Prisma.InputJsonValue,
    },
  });

  return {
    orderId: intent.id,
    amount: intent.amount,
    clientKey: process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!,
  };
}

export async function confirmPaymentIntent(
  paymentKey: string,
  orderId: string,
  amount: number
) {
  if (!isPaymentsConfigured()) {
    return { error: "결제가 설정되지 않았습니다." };
  }

  const user = await requireAuth();
  const intent = await db.paymentIntent.findUnique({ where: { id: orderId } });

  if (!intent || intent.userId !== user.id) {
    return { error: "결제 정보를 찾을 수 없습니다." };
  }
  if (intent.status === "PAID") {
    return { success: true, type: intent.type, alreadyPaid: true };
  }
  if (intent.amount !== amount) {
    return { error: "결제 금액이 일치하지 않습니다." };
  }

  const confirmed = await confirmTossPayment(paymentKey, orderId, amount);
  if (!confirmed.ok) return { error: confirmed.message };

  const meta = intent.metadata as Record<string, string>;

  if (intent.type === "TIP") {
    const result = await fulfillTip(
      user.id,
      meta.receiverId,
      amount,
      meta.message || undefined
    );
    if ("error" in result && result.error) return { error: result.error };
  }

  if (intent.type === "PRODUCT") {
    const productId = meta.productId;
    const product = await db.digitalProduct.findUnique({ where: { id: productId } });
    if (!product) return { error: "상품을 찾을 수 없습니다." };

    await db.order.create({
      data: {
        buyerId: user.id,
        total: amount,
        status: "completed",
        items: { create: { productId, price: amount } },
      },
    });
    await db.digitalProduct.update({
      where: { id: productId },
      data: { salesCount: { increment: 1 } },
    });
    revalidatePath("/market");
    revalidatePath(`/market/${productId}`);
  }

  if (intent.type === "PREMIUM") {
    const until = new Date();
    until.setMonth(until.getMonth() + 1);
    await db.user.update({
      where: { id: user.id },
      data: { premiumTier: "PREMIUM", premiumUntil: until },
    });
    revalidatePath("/premium");
    revalidatePath("/settings");
  }

  if (intent.type === "EMOTICON") {
    const packId = meta.packId;
    const r = await fulfillEmoticonPurchase(user.id, packId);
    if ("error" in r && r.error) return { error: r.error };
    revalidatePath("/market/storage");
  }

  if (intent.type === "LISTING_FEE") {
    const r = await fulfillListingFee(meta.requestId, user.id);
    if ("error" in r && r.error) return { error: r.error };
    revalidatePath("/market/sell");
  }

  if (intent.type === "PHYSICAL_GOODS") {
    const r = await fulfillPhysicalGoodsPayment(meta.orderId, user.id);
    if ("error" in r && r.error) return { error: r.error };
    revalidatePath("/market/orders");
  }

  await db.paymentIntent.update({
    where: { id: orderId },
    data: { status: "PAID", paymentKey, paidAt: new Date() },
  });

  revalidatePath("/support");
  return { success: true, type: intent.type };
}

/** @deprecated 결제 연동 후 createPaymentIntent → confirmPaymentIntent 사용 */
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
  revalidatePath("/market");
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
    select: { id: true, username: true, image: true },
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
