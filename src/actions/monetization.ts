"use server";

import { revalidatePath } from "next/cache";
import { revalidateAptHub } from "@/lib/apt/revalidate-hub";
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
    if (!receiverId || receiverId === userId) return { error: "? íš¨?˜ì? ?Šì? ?„ì› ?€?ì…?ˆë‹¤." };
    const tipKind = input.metadata.tipKind as string | undefined;
    const channelId = input.metadata.channelId as string | undefined;
    if (tipKind === "video" && !channelId?.trim()) {
      return { error: "?ìƒ ?„ì›?€ ?¼ì´ë¸?ë°©ì†¡ ì¤‘ì—ë§?ê°€?¥í•©?ˆë‹¤." };
    }
    if (tipKind === "video") {
      const videoUrl = normalizeYoutubeUrl(String(input.metadata.videoUrl ?? ""));
      if (!videoUrl) return { error: "YouTube URL???…ë ¥??ì£¼ì„¸??" };
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
          error: `?ìƒ ?„ì› ìµœì†Œ ê¸ˆì•¡?€ ${expected.toLocaleString()}?ì…?ˆë‹¤.`,
        };
      }
    } else {
      const min = 100;
      if (input.amount < min) {
        return { error: "ìµœì†Œ ?„ì› ê¸ˆì•¡?€ 100?ì…?ˆë‹¤." };
      }
    }
    if (input.amount > 10_000_000) return { error: "1???„ì› ?œë„??1,000ë§Œì›?…ë‹ˆ??" };
  }

  if (input.type === "PRODUCT") {
    const productId = input.metadata.productId as string;
    const product = await db.digitalProduct.findUnique({ where: { id: productId } });
    if (!product) return { error: "?í’ˆ??ì°¾ì„ ???†ìŠµ?ˆë‹¤." };
    if (product.price !== input.amount) return { error: "?í’ˆ ê°€ê²©ì´ ?¼ì¹˜?˜ì? ?ŠìŠµ?ˆë‹¤." };
  }

  if (input.type === "PREMIUM") {
    if (input.amount !== PREMIUM_USD_CENTS) {
      return { error: "?„ë¦¬ë¯¸ì—„ ê°€ê²©ì´ ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤." };
    }
  }

  if (input.type === "CREATOR_SUBSCRIPTION") {
    const creatorId = input.metadata.creatorId as string;
    if (!creatorId || creatorId === userId) {
      return { error: "? íš¨?˜ì? ?Šì? êµ¬ë… ?€?ì…?ˆë‹¤." };
    }
    const creator = await db.user.findUnique({
      where: { id: creatorId },
      select: { creatorSubscriptionPriceKrw: true },
    });
    if (!creator) return { error: "?¬ë¦¬?ì´?°ë? ì°¾ì„ ???†ìŠµ?ˆë‹¤." };
    if (creator.creatorSubscriptionPriceKrw !== input.amount) {
      return { error: "êµ¬ë… ê°€ê²©ì´ ?¼ì¹˜?˜ì? ?ŠìŠµ?ˆë‹¤." };
    }
    const existing = await db.subscription.findUnique({
      where: { subscriberId_creatorId: { subscriberId: userId, creatorId } },
      select: { status: true, currentPeriodEnd: true, subscribedSince: true },
    });
    if (existing && isSubscriptionActive(existing)) {
      return { error: "?´ë? êµ¬ë… ì¤‘ì…?ˆë‹¤." };
    }
  }

  if (input.type === "EMOTICON") {
    const packId = input.metadata.packId as string;
    const packSlug = input.metadata.packSlug as string | undefined;
    let pack = packId ? await db.emoticonPack.findUnique({ where: { id: packId } }) : null;
    if (!pack && packSlug) {
      pack = await db.emoticonPack.findUnique({ where: { slug: packSlug } });
    }
    if (!pack) return { error: "?´ëª¨?°ì½˜??ì°¾ì„ ???†ìŠµ?ˆë‹¤. DB ?°ë™(?¹ì…˜ J)???•ì¸??ì£¼ì„¸??" };
    if (pack.price !== input.amount) return { error: "?´ëª¨?°ì½˜ ê°€ê²©ì´ ?¼ì¹˜?˜ì? ?ŠìŠµ?ˆë‹¤." };
  }

  if (input.type === "LISTING_FEE") {
    if (input.amount !== LISTING_FEE_KRW) return { error: "?±ë¡ë¹„ëŠ” 5,000?ì…?ˆë‹¤." };
    const requestId = input.metadata.requestId as string;
    const req = await db.goodsListingRequest.findUnique({ where: { id: requestId } });
    if (!req || req.sellerId !== userId) return { error: "êµ¿ì¦ˆ ?±ë¡ ?”ì²­??ì°¾ì„ ???†ìŠµ?ˆë‹¤." };
    if (req.listingFeePaid) return { error: "?´ë? ?±ë¡ë¹„ê? ê²°ì œ?˜ì—ˆ?µë‹ˆ??" };
  }

  if (input.type === "PHYSICAL_GOODS") {
    const orderId = input.metadata.orderId as string;
    const order = await db.physicalOrder.findUnique({ where: { id: orderId } });
    if (!order || order.buyerId !== userId) return { error: "ì£¼ë¬¸??ì°¾ì„ ???†ìŠµ?ˆë‹¤." };
    if (order.total !== input.amount) return { error: "ì£¼ë¬¸ ê¸ˆì•¡???¼ì¹˜?˜ì? ?ŠìŠµ?ˆë‹¤." };
    if (order.status !== "PENDING_PAYMENT") return { error: "?´ë? ê²°ì œ??ì£¼ë¬¸?…ë‹ˆ??" };
  }

  if (input.type === "EVENT_REGISTRATION") {
    if (input.amount !== EVENT_REGISTRATION_FEE_KRW) {
      return { error: "?´ë²¤???±ë¡ë¹„ëŠ” 30,000?ì…?ˆë‹¤." };
    }
    const eventId = input.metadata.eventId as string;
    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event || event.createdById !== userId) {
      return { error: "?´ë²¤???±ë¡ ?•ë³´ë¥?ì°¾ì„ ???†ìŠµ?ˆë‹¤." };
    }
    if (event.registrationFeePaid) return { error: "?´ë? ?±ë¡ë¹„ê? ê²°ì œ?˜ì—ˆ?µë‹ˆ??" };
  }

  if (input.type === "CREATOR_EPISODE") {
    const episodeId = input.metadata.episodeId as string;
    const episode = await db.creatorEpisode.findUnique({ where: { id: episodeId } });
    if (!episode) return { error: "?‘í’ˆ ?Œì°¨ë¥?ì°¾ì„ ???†ìŠµ?ˆë‹¤." };
    if (episode.price !== input.amount) return { error: "ê°€ê²©ì´ ?¼ì¹˜?˜ì? ?ŠìŠµ?ˆë‹¤." };
    if (episode.price <= 0) return { error: "ë¬´ë£Œ ?Œì°¨??êµ¬ë§¤ê°€ ?„ìš” ?†ìŠµ?ˆë‹¤." };
    if (episode.authorId === userId) return { error: "ë³¸ì¸ ?‘í’ˆ?€ êµ¬ë§¤?????†ìŠµ?ˆë‹¤." };
    const owned = await db.creatorEpisodePurchase.findUnique({
      where: { buyerId_episodeId: { buyerId: userId, episodeId } },
    });
    if (owned) return { error: "?´ë? êµ¬ë§¤???Œì°¨?…ë‹ˆ??" };
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
    if (!media) return { error: "ë¯¸ë””?´ë? ì°¾ì„ ???†ìŠµ?ˆë‹¤." };
    if (media.post.authorId === userId) return { error: "ë³¸ì¸ ì½˜í…ì¸ ëŠ” êµ¬ë§¤?????†ìŠµ?ˆë‹¤." };
    const owned = await db.postMediaPurchase.findUnique({
      where: { buyerId_mediaId: { buyerId: userId, mediaId } },
    });
    if (owned) return { error: "?´ë? êµ¬ë§¤??ë¯¸ë””?´ì…?ˆë‹¤." };
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
    if (!locked || priceKrw <= 0) return { error: "êµ¬ë§¤ê°€ ?„ìš” ?†ëŠ” ì½˜í…ì¸ ì…?ˆë‹¤." };
    if (input.amount !== priceKrw) return { error: "ê°€ê²©ì´ ?¼ì¹˜?˜ì? ?ŠìŠµ?ˆë‹¤." };
  }

  if (input.type === "STUDIO_ASSET") {
    const assetId = input.metadata.studioAssetId as string;
    const asset = await db.studioAsset.findUnique({ where: { id: assetId } });
    if (!asset || asset.status !== "PUBLISHED") return { error: "Studio ?ì‚°??ì°¾ì„ ???†ìŠµ?ˆë‹¤." };
    if (asset.creatorId === userId) return { error: "ë³¸ì¸ ?‘í’ˆ?€ êµ¬ë§¤?????†ìŠµ?ˆë‹¤." };
    if (asset.isFree || asset.priceKrw <= 0) return { error: "ë¬´ë£Œ ?ì‚°?…ë‹ˆ??" };
    if (asset.priceKrw !== input.amount) return { error: "ê°€ê²©ì´ ?¼ì¹˜?˜ì? ?ŠìŠµ?ˆë‹¤." };
    const owned = await db.studioUserInventory.findUnique({
      where: { userId_studioAssetId: { userId, studioAssetId: assetId } },
    });
    if (owned) return { error: "?´ë? ë³´ìœ  ì¤‘ì…?ˆë‹¤." };
  }

  return null;
}

/** Stripe Checkout ?¸ì…˜ ?ì„± ??ê²°ì œ ?˜ì´ì§€ URL ë°˜í™˜ */
export async function createStripeCheckout(input: {
  type: PaymentIntentType;
  amount: number;
  orderName: string;
  metadata: Record<string, unknown>;
}) {
  if (!isStripeConfigured()) {
    return {
      error:
        "ê²°ì œê°€ ?¤ì •?˜ì? ?Šì•˜?µë‹ˆ?? STRIPE_SECRET_KEY?€ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEYë¥??¤ì •?˜ì„¸??",
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

  if (!session.url) return { error: "ê²°ì œ ?˜ì´ì§€ë¥?ë§Œë“¤ ???†ìŠµ?ˆë‹¤." };

  return { checkoutUrl: session.url, orderId: intent.id };
}

/** @deprecated createStripeCheckout ?¬ìš© */
export async function createPaymentIntent(input: {
  type: PaymentIntentType;
  amount: number;
  metadata: Record<string, unknown>;
}) {
  return createStripeCheckout({
    type: input.type,
    amount: input.amount,
    orderName: "MoCoMo ê²°ì œ",
    metadata: input.metadata,
  });
}

export async function confirmStripeCheckout(sessionId: string) {
  if (!isPaymentsConfigured()) {
    return { error: "ê²°ì œê°€ ?¤ì •?˜ì? ?Šì•˜?µë‹ˆ??" };
  }

  const user = await requireAuth();
  const verified = await verifyStripeCheckoutSession(sessionId);
  if (!verified.ok) return { error: verified.error };

  const intent = await db.paymentIntent.findUnique({ where: { id: verified.orderId } });
  if (!intent || intent.userId !== user.id) {
    return { error: "ê²°ì œ ?•ë³´ë¥?ì°¾ì„ ???†ìŠµ?ˆë‹¤." };
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
    revalidateAptHub();
  }

  return {
    success: true,
    type: result.type,
    alreadyPaid: result.alreadyPaid,
    redirectPath,
  };
}

/** @deprecated confirmStripeCheckout ?¬ìš© */
export async function confirmPaymentIntent(
  _paymentKey: string,
  _orderId: string,
  _amount: number
) {
  return { error: "Stripe Checkout?¼ë¡œ ê²°ì œ??ì£¼ì„¸?? session_idê°€ ?„ìš”?©ë‹ˆ??" };
}

export async function sendTip(_receiverId: string, _amount: number, _message?: string) {
  return { error: "ê²°ì œ ì°½ì„ ?µí•´ ?„ì›??ì£¼ì„¸??" };
}

export async function subscribeToCreator(creatorId: string, amount: number) {
  if (!isPaymentsConfigured()) {
    return { error: "ê²°ì œê°€ ?¤ì •?˜ì? ?Šì•˜?µë‹ˆ??" };
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
  return { error: "ê²°ì œ ì°½ì„ ?µí•´ ?„ë¦¬ë¯¸ì—„??êµ¬ë…??ì£¼ì„¸??" };
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
    return { error: "ë¯¸ë¦¬ë³´ê¸°Â·?¤ìš´ë¡œë“œ URL???„ìš”?©ë‹ˆ??" };
  }
  const product = await db.digitalProduct.create({
    data: { sellerId: user.id, ...data },
  });
  revalidatePath("/support");
  return { product };
}

export async function purchaseProduct(_productId: string) {
  return { error: "ê²°ì œ ì°½ì„ ?µí•´ êµ¬ë§¤??ì£¼ì„¸??" };
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
