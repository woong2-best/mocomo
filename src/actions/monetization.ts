"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ProductType, PaymentIntentType, Prisma } from "@prisma/client";
import {
  checkoutCurrencyForType,
  isPaymentsConfigured,
  PREMIUM_USD_CENTS,
} from "@/lib/payments";
import { isMediaContentLocked } from "@/lib/content-access";
import { isSubscriptionActive } from "@/lib/creator-subscription";
import { LISTING_FEE_KRW } from "@/lib/goods-shop";
import { EVENT_REGISTRATION_FEE_KRW } from "@/lib/event-registration";
import { fulfillPaymentIntent } from "@/lib/payment-fulfillment";
import { getAppOrigin, getStripe, isStripeConfigured } from "@/lib/stripe";
import { verifyStripeCheckoutSession } from "@/lib/stripe-checkout";
import { safeReturnPath } from "@/lib/donation-metadata";
import {
  calcVideoDonationAmount,
  DEFAULT_VIDEO_DONATION_SETTINGS,
  normalizeYoutubeUrl,
} from "@/lib/video-donation";

async function validatePaymentInput(
  userId: string,
  input: { type: PaymentIntentType; amount: number; metadata: Record<string, unknown> }
): Promise<{ error: string } | null> {
  if (input.type === "TIP") {
    const receiverId = input.metadata.receiverId as string;
    if (!receiverId || receiverId === userId) return { error: "유효하지 않은 후원 대상입니다." };
    const tipKind = input.metadata.tipKind as string | undefined;
    const channelId = input.metadata.channelId as string | undefined;
    if (tipKind === "video" && !channelId?.trim()) {
      return { error: "영상 후원은 라이브 방송 중에만 가능합니다." };
    }
    if (tipKind === "video") {
      const videoUrl = normalizeYoutubeUrl(String(input.metadata.videoUrl ?? ""));
      if (!videoUrl) return { error: "YouTube URL을 입력해 주세요." };
      const durationSec = Math.max(
        1,
        parseInt(String(input.metadata.durationSec ?? 0), 10) || 0
      );
      const channel = channelId
        ? await db.voiceChannel.findUnique({
            where: { id: channelId },
            select: {
              videoDonationRateKrw: true,
              videoDonationMinKrw: true,
              videoDonationMaxSec: true,
            },
          })
        : null;
      const settings = {
        rateKrwPerSec:
          channel?.videoDonationRateKrw ?? DEFAULT_VIDEO_DONATION_SETTINGS.rateKrwPerSec,
        minKrw: channel?.videoDonationMinKrw ?? DEFAULT_VIDEO_DONATION_SETTINGS.minKrw,
        maxSec: channel?.videoDonationMaxSec ?? DEFAULT_VIDEO_DONATION_SETTINGS.maxSec,
      };
      const expected = calcVideoDonationAmount(durationSec, settings);
      if (input.amount < expected) {
        return {
          error: `영상 후원 최소 금액은 ${expected.toLocaleString()}원입니다.`,
        };
      }
    } else {
      const min = 100;
      if (input.amount < min) {
        return { error: "최소 후원 금액은 100원입니다." };
      }
    }
    if (input.amount > 10_000_000) return { error: "1회 후원 한도는 1,000만원입니다." };
  }

  if (input.type === "PRODUCT") {
    const productId = input.metadata.productId as string;
    const product = await db.digitalProduct.findUnique({ where: { id: productId } });
    if (!product) return { error: "상품을 찾을 수 없습니다." };
    if (product.price !== input.amount) return { error: "상품 가격이 일치하지 않습니다." };
  }

  if (input.type === "PREMIUM") {
    if (input.amount !== PREMIUM_USD_CENTS) {
      return { error: "프리미엄 가격이 올바르지 않습니다." };
    }
  }

  if (input.type === "CREATOR_SUBSCRIPTION") {
    const creatorId = input.metadata.creatorId as string;
    if (!creatorId || creatorId === userId) {
      return { error: "유효하지 않은 구독 대상입니다." };
    }
    const creator = await db.user.findUnique({
      where: { id: creatorId },
      select: { creatorSubscriptionPriceKrw: true },
    });
    if (!creator) return { error: "크리에이터를 찾을 수 없습니다." };
    if (creator.creatorSubscriptionPriceKrw !== input.amount) {
      return { error: "구독 가격이 일치하지 않습니다." };
    }
    const existing = await db.subscription.findUnique({
      where: { subscriberId_creatorId: { subscriberId: userId, creatorId } },
      select: { status: true, currentPeriodEnd: true, subscribedSince: true },
    });
    if (existing && isSubscriptionActive(existing)) {
      return { error: "이미 구독 중입니다." };
    }
  }

  if (input.type === "EMOTICON") {
    const packId = input.metadata.packId as string;
    const packSlug = input.metadata.packSlug as string | undefined;
    let pack = packId ? await db.emoticonPack.findUnique({ where: { id: packId } }) : null;
    if (!pack && packSlug) {
      pack = await db.emoticonPack.findUnique({ where: { slug: packSlug } });
    }
    if (!pack) return { error: "이모티콘을 찾을 수 없습니다. DB 연동(섹션 J)을 확인해 주세요." };
    if (pack.price !== input.amount) return { error: "이모티콘 가격이 일치하지 않습니다." };
  }

  if (input.type === "LISTING_FEE") {
    if (input.amount !== LISTING_FEE_KRW) return { error: "등록비는 5,000원입니다." };
    const requestId = input.metadata.requestId as string;
    const req = await db.goodsListingRequest.findUnique({ where: { id: requestId } });
    if (!req || req.sellerId !== userId) return { error: "굿즈 등록 요청을 찾을 수 없습니다." };
    if (req.listingFeePaid) return { error: "이미 등록비가 결제되었습니다." };
  }

  if (input.type === "PHYSICAL_GOODS") {
    const orderId = input.metadata.orderId as string;
    const order = await db.physicalOrder.findUnique({ where: { id: orderId } });
    if (!order || order.buyerId !== userId) return { error: "주문을 찾을 수 없습니다." };
    if (order.total !== input.amount) return { error: "주문 금액이 일치하지 않습니다." };
    if (order.status !== "PENDING_PAYMENT") return { error: "이미 결제된 주문입니다." };
  }

  if (input.type === "EVENT_REGISTRATION") {
    if (input.amount !== EVENT_REGISTRATION_FEE_KRW) {
      return { error: "이벤트 등록비는 30,000원입니다." };
    }
    const eventId = input.metadata.eventId as string;
    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event || event.createdById !== userId) {
      return { error: "이벤트 등록 정보를 찾을 수 없습니다." };
    }
    if (event.registrationFeePaid) return { error: "이미 등록비가 결제되었습니다." };
  }

  if (input.type === "CREATOR_EPISODE") {
    const episodeId = input.metadata.episodeId as string;
    const episode = await db.creatorEpisode.findUnique({ where: { id: episodeId } });
    if (!episode) return { error: "작품 회차를 찾을 수 없습니다." };
    if (episode.price !== input.amount) return { error: "가격이 일치하지 않습니다." };
    if (episode.price <= 0) return { error: "무료 회차는 구매가 필요 없습니다." };
    if (episode.authorId === userId) return { error: "본인 작품은 구매할 수 없습니다." };
    const owned = await db.creatorEpisodePurchase.findUnique({
      where: { buyerId_episodeId: { buyerId: userId, episodeId } },
    });
    if (owned) return { error: "이미 구매한 회차입니다." };
  }

  if (input.type === "POST_MEDIA") {
    const mediaId = input.metadata.mediaId as string;
    const media = await db.postMedia.findUnique({
      where: { id: mediaId },
      include: {
        post: {
          select: {
            authorId: true,
            visibility: true,
            instantPurchasePriceKrw: true,
          },
        },
      },
    });
    if (!media) return { error: "미디어를 찾을 수 없습니다." };
    if (media.post.authorId === userId) return { error: "본인 콘텐츠는 구매할 수 없습니다." };
    const owned = await db.postMediaPurchase.findUnique({
      where: { buyerId_mediaId: { buyerId: userId, mediaId } },
    });
    if (owned) return { error: "이미 구매한 미디어입니다." };
    const sub = await db.subscription.findUnique({
      where: {
        subscriberId_creatorId: { subscriberId: userId, creatorId: media.post.authorId },
      },
      select: { subscribedSince: true, currentPeriodEnd: true, status: true },
    });
    const { priceKrw, locked } = isMediaContentLocked({
      viewerId: userId,
      authorId: media.post.authorId,
      visibility: media.post.visibility,
      instantPurchasePriceKrw: media.post.instantPurchasePriceKrw,
      mediaPriceKrw: media.priceKrw,
      purchased: false,
      subscription: sub,
    });
    if (!locked || priceKrw <= 0) return { error: "구매가 필요 없는 콘텐츠입니다." };
    if (input.amount !== priceKrw) return { error: "가격이 일치하지 않습니다." };
  }

  if (input.type === "STUDIO_ASSET") {
    const assetId = input.metadata.studioAssetId as string;
    const asset = await db.studioAsset.findUnique({ where: { id: assetId } });
    if (!asset || asset.status !== "PUBLISHED") return { error: "Studio 자산을 찾을 수 없습니다." };
    if (asset.creatorId === userId) return { error: "본인 작품은 구매할 수 없습니다." };
    if (asset.isFree || asset.priceKrw <= 0) return { error: "무료 자산입니다." };
    if (asset.priceKrw !== input.amount) return { error: "가격이 일치하지 않습니다." };
    const owned = await db.studioUserInventory.findUnique({
      where: { userId_studioAssetId: { userId, studioAssetId: assetId } },
    });
    if (owned) return { error: "이미 보유 중입니다." };
  }

  return null;
}

/** Stripe Checkout 세션 생성 후 결제 페이지 URL 반환 */
export async function createStripeCheckout(input: {
  type: PaymentIntentType;
  amount: number;
  orderName: string;
  metadata: Record<string, unknown>;
}) {
  if (!isStripeConfigured()) {
    return {
      error:
        "결제가 설정되지 않았습니다. STRIPE_SECRET_KEY와 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY를 설정하세요.",
    };
  }

  const user = await requireAuth();
  const validation = await validatePaymentInput(user.id, input);
  if (validation) return validation;

  const intent = await db.paymentIntent.create({
    data: {
      userId: user.id,
      type: input.type,
      amount: input.amount,
      metadata: input.metadata as Prisma.InputJsonValue,
    },
  });

  const origin = getAppOrigin();
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
      userId: user.id,
    },
    success_url: `${origin}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/payments/fail`,
    customer_email: user.email ?? undefined,
  });

  if (!session.url) return { error: "결제 페이지를 만들 수 없습니다." };

  return { checkoutUrl: session.url, orderId: intent.id };
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
  if (!isPaymentsConfigured()) {
    return { error: "결제가 설정되지 않았습니다." };
  }

  const user = await requireAuth();
  const verified = await verifyStripeCheckoutSession(sessionId);
  if (!verified.ok) return { error: verified.error };

  const intent = await db.paymentIntent.findUnique({ where: { id: verified.orderId } });
  if (!intent || intent.userId !== user.id) {
    return { error: "결제 정보를 찾을 수 없습니다." };
  }

  const result = await fulfillPaymentIntent(
    verified.orderId,
    verified.paymentRef,
    verified.amount
  );
  if (!result.ok) return { error: result.error };

  revalidatePath("/support");
  revalidatePath("/wallet");

  let redirectPath = "/support";
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

  if (result.type === "STUDIO_ASSET") {
    const meta = intent.metadata as Record<string, string | undefined>;
    redirectPath = meta.studioAssetId ? `/studio/library?purchased=${meta.studioAssetId}` : "/studio/library";
    revalidatePath("/studio/library");
    revalidatePath("/studio/market");
    revalidatePath("/apt");
  }

  return {
    success: true,
    type: result.type,
    alreadyPaid: result.alreadyPaid,
    redirectPath,
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
