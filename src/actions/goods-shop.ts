"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { calcShopFees, ensureEmoticonCatalog, loadEmoticonPacks, LISTING_FEE_KRW } from "@/lib/goods-shop";
import { creditSellerEarning } from "@/lib/settlement";
import { notifyEmoticonGift, notifyGoodsOrder } from "@/lib/notifications";
import type { Prisma } from "@prisma/client";

export async function bootstrapEmoticonCatalog() {
  await ensureEmoticonCatalog(db);
}

export async function getEmoticonPacks() {
  return loadEmoticonPacks(db);
}

export async function getEmoticonPackBySlug(slug: string) {
  const { packs, dbReady } = await loadEmoticonPacks(db);
  const found = packs.find((p) => p.slug === slug);
  if (found) return { pack: found, dbReady };
  return { pack: null, dbReady };
}

/** 결제용 — DB에 팩이 없으면 시드 후 slug로 조회 */
export async function resolveEmoticonPackForPurchase(slug: string) {
  try {
    await ensureEmoticonCatalog(db);
    const pack = await db.emoticonPack.findUnique({ where: { slug } });
    if (pack) return { pack, dbReady: true };
    return { pack: null as null, dbReady: true, error: "이모티콘을 찾을 수 없습니다." };
  } catch {
    return {
      pack: null as null,
      dbReady: false,
      error: "굿즈샵 DB가 연결되지 않았습니다. Supabase SQL 섹션 J를 실행해 주세요.",
    };
  }
}

export async function getMyEmoticonStorage() {
  const user = await requireAuth();
  return db.userEmoticon.findMany({
    where: { userId: user.id },
    include: { pack: true, gift: { include: { receiver: { select: { username: true } } } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getReceivedEmoticonGifts() {
  const user = await requireAuth();
  return db.emoticonGift.findMany({
    where: { receiverId: user.id },
    include: {
      pack: true,
      sender: { select: { username: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function sendEmoticonToStreamer(itemId: string, receiverUsername: string) {
  const user = await requireAuth();
  const receiverName = receiverUsername.trim().replace(/^@/, "");
  if (!receiverName) return { error: "스트리머 닉네임을 입력해 주세요." };

  const receiver = await db.user.findUnique({
    where: { username: receiverName },
    select: { id: true, username: true },
  });
  if (!receiver) return { error: "스트리머를 찾을 수 없습니다." };
  if (receiver.id === user.id) return { error: "본인에게는 보낼 수 없습니다." };

  const item = await db.userEmoticon.findUnique({
    where: { id: itemId },
    include: { pack: true, gift: true },
  });
  if (!item || item.userId !== user.id) return { error: "이모티콘을 찾을 수 없습니다." };
  if (item.status !== "AVAILABLE") return { error: "이미 사용된 이모티콘입니다." };
  if (item.gift) return { error: "이미 전송된 이모티콘입니다." };

  const { platformFee, creatorAmount } = calcShopFees(item.pricePaid);

  await db.$transaction([
    db.userEmoticon.update({
      where: { id: itemId },
      data: { status: "USED", usedAt: new Date() },
    }),
    db.emoticonGift.create({
      data: {
        itemId,
        senderId: user.id,
        receiverId: receiver.id,
        packId: item.packId,
        amount: item.pricePaid,
        platformFee,
        creatorAmount,
      },
    }),
    db.user.update({
      where: { id: receiver.id },
      data: { totalSupportReceived: { increment: creatorAmount } },
    }),
  ]);

  await notifyEmoticonGift(
    receiver.id,
    user.id,
    item.pack.name,
    creatorAmount
  );

  await creditSellerEarning(receiver.id, creatorAmount, {
    referenceType: "emoticon_gift",
    referenceId: itemId,
    memo: `이모티콘 선물 · ${item.pack.name}`,
  });

  revalidatePath("/support");
  revalidatePath(`/u/${receiver.username}`);
  revalidatePath("/wallet");
  return { success: true, creatorAmount };
}

export async function fulfillEmoticonPurchase(userId: string, packId: string) {
  const pack = await db.emoticonPack.findUnique({ where: { id: packId } });
  if (!pack) return { error: "이모티콘을 찾을 수 없습니다." };
  await db.userEmoticon.create({
    data: { userId, packId, pricePaid: pack.price },
  });
  revalidatePath("/support");
  return { success: true };
}

export async function createGoodsListingRequest(data: {
  title: string;
  description: string;
  images: string[];
  videoUrl?: string;
}) {
  const user = await requireAuth();
  if (!data.title.trim()) return { error: "상품명을 입력해 주세요." };
  if (!data.description.trim()) return { error: "상품 설명을 입력해 주세요." };
  if (data.images.length === 0) {
    data.images = [];
  }

  const request = await db.goodsListingRequest.create({
    data: {
      sellerId: user.id,
      title: data.title.trim(),
      description: data.description.trim(),
      media: { images: data.images, videoUrl: data.videoUrl || null } as Prisma.InputJsonValue,
      status: "AWAITING_FEE",
    },
  });
  revalidatePath("/support");
  return { requestId: request.id };
}

export async function fulfillListingFee(requestId: string, sellerId: string) {
  const request = await db.goodsListingRequest.findUnique({ where: { id: requestId } });
  if (!request || request.sellerId !== sellerId) return { error: "등록 요청을 찾을 수 없습니다." };

  const media = request.media as { images?: string[]; videoUrl?: string | null };
  const images = media.images ?? [];

  await db.$transaction(async (tx) => {
    await tx.goodsListingRequest.update({
      where: { id: requestId },
      data: { listingFeePaid: true, status: "APPROVED" },
    });
    await tx.physicalProduct.create({
      data: {
        sellerId,
        requestId,
        title: request.title,
        description: request.description,
        price: 0,
        images: images as Prisma.InputJsonValue,
        active: false,
      },
    });
  });

  revalidatePath("/support");
  revalidatePath("/support");
  return { success: true };
}

export async function updatePhysicalProductPrice(productId: string, price: number, shippingFee?: number) {
  const user = await requireAuth();
  if (price < 1000) return { error: "판매가는 1,000원 이상이어야 합니다." };
  const product = await db.physicalProduct.findUnique({ where: { id: productId } });
  if (!product || product.sellerId !== user.id) return { error: "상품을 찾을 수 없습니다." };

  await db.physicalProduct.update({
    where: { id: productId },
    data: {
      price,
      shippingFee: shippingFee ?? product.shippingFee,
      active: true,
    },
  });
  revalidatePath("/support");
  revalidatePath("/support");
  return { success: true };
}

export async function getPhysicalProducts() {
  return db.physicalProduct.findMany({
    where: { active: true, price: { gt: 0 } },
    include: { seller: { select: { username: true, image: true } } },
    orderBy: { createdAt: "desc" },
    take: 48,
  });
}

export async function getPhysicalProduct(id: string) {
  return db.physicalProduct.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, username: true, image: true } },
      request: { select: { media: true } },
    },
  });
}

export async function createPhysicalOrderDraft(input: {
  productId: string;
  quantity: number;
  recipientName: string;
  phone: string;
  zipCode: string;
  address: string;
  detailAddress?: string;
}) {
  const user = await requireAuth();
  const product = await db.physicalProduct.findUnique({ where: { id: input.productId } });
  if (!product || !product.active) return { error: "상품을 찾을 수 없습니다." };
  if (product.sellerId === user.id) return { error: "본인 상품은 구매할 수 없습니다." };
  const qty = Math.max(1, Math.min(input.quantity, product.stock));
  const productTotal = product.price * qty;
  const shippingFee = product.shippingFee;
  const subtotal = productTotal + shippingFee;
  const { platformFee, creatorAmount } = calcShopFees(productTotal);

  const order = await db.physicalOrder.create({
    data: {
      buyerId: user.id,
      sellerId: product.sellerId,
      total: subtotal,
      productTotal,
      shippingFee,
      platformFee,
      sellerAmount: creatorAmount + shippingFee,
      status: "PENDING_PAYMENT",
      recipientName: input.recipientName.trim(),
      phone: input.phone.trim(),
      zipCode: input.zipCode.trim(),
      address: input.address.trim(),
      detailAddress: input.detailAddress?.trim() || null,
      items: {
        create: { productId: product.id, quantity: qty, unitPrice: product.price },
      },
    },
  });

  return { orderId: order.id, amount: subtotal };
}

export async function fulfillPhysicalGoodsPayment(orderId: string, buyerId: string) {
  const order = await db.physicalOrder.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });
  if (!order || order.buyerId !== buyerId) return { error: "주문을 찾을 수 없습니다." };
  if (order.status !== "PENDING_PAYMENT") return { success: true, alreadyPaid: true };

  const item = order.items[0];
  if (!item) return { error: "주문 항목이 없습니다." };

  await db.$transaction([
    db.physicalOrder.update({
      where: { id: orderId },
      data: { status: "PAID" },
    }),
    db.physicalProduct.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    }),
  ]);

  await notifyGoodsOrder(order.sellerId, order.recipientName, order.total);

  revalidatePath("/support");
  revalidatePath("/wallet");
  return { success: true };
}

export async function getMyBuyOrders() {
  const user = await requireAuth();
  return db.physicalOrder.findMany({
    where: { buyerId: user.id },
    include: { items: { include: { product: { select: { title: true, images: true } } } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMySellerProducts() {
  const user = await requireAuth();
  return db.physicalProduct.findMany({
    where: { sellerId: user.id },
    include: { request: { select: { status: true, listingFeePaid: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMySellOrders() {
  const user = await requireAuth();
  return db.physicalOrder.findMany({
    where: { sellerId: user.id, status: { not: "PENDING_PAYMENT" } },
    include: {
      buyer: { select: { username: true } },
      items: { include: { product: { select: { title: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateOrderShipping(orderId: string, status: "PREPARING" | "SHIPPED" | "DELIVERED", trackingNo?: string) {
  const user = await requireAuth();
  const order = await db.physicalOrder.findUnique({ where: { id: orderId } });
  if (!order || order.sellerId !== user.id) return { error: "주문을 찾을 수 없습니다." };

  await db.physicalOrder.update({
    where: { id: orderId },
    data: { status, trackingNo: trackingNo?.trim() || order.trackingNo },
  });
  revalidatePath("/support");
  return { success: true };
}
