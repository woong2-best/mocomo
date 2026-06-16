import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { LISTING_FEE_KRW } from "@/lib/goods-shop";
import { EVENT_REGISTRATION_FEE_KRW } from "@/lib/event-registration";
import { fulfillEventRegistration } from "@/actions/events";
import {
  creditSellerEarning,
  recordPlatformFee,
  recordPaymentGross,
  splitPlatformFee,
} from "@/lib/settlement";
import {
  fulfillEmoticonPurchase,
  fulfillListingFee,
  fulfillPhysicalGoodsPayment,
} from "@/actions/goods-shop";
import { fulfillCreatorEpisodePurchase } from "@/actions/creator-works";
import { fulfillPostMediaPurchase } from "@/actions/post-media-purchase";
import { calcPlatformFee } from "@/lib/utils";
import { tierFromAmount } from "@/lib/tiers";
import { notifyTip } from "@/lib/notifications";
import { parseVideoTipMeta } from "@/lib/donation-metadata";
import { normalizeYoutubeUrl } from "@/lib/video-donation";

const PLATFORM_FEE_RATE = 0.1;

async function fulfillTip(
  senderId: string,
  receiverId: string,
  amount: number,
  message?: string,
  paymentIntentId?: string,
  channelId?: string,
  tipKind?: string,
  rawMeta?: Record<string, unknown>
) {
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
  const sellerAmount = amount - platformFee;

  const tip = await db.tip.create({
    data: {
      senderId,
      receiverId,
      amount,
      message: message || null,
      platformFee,
      channelId: channelId?.trim() || null,
    },
  });

  if (tipKind === "video" && channelId?.trim()) {
    const video = rawMeta ? parseVideoTipMeta(rawMeta) : null;
    const normalizedUrl = video?.videoUrl ? normalizeYoutubeUrl(video.videoUrl) : null;
    await db.liveVideoDonation.create({
      data: {
        tipId: tip.id,
        channelId: channelId.trim(),
        senderId,
        receiverId,
        amount,
        status: normalizedUrl ? "PENDING_REVIEW" : "AWAITING_URL",
        videoUrl: normalizedUrl,
        videoTitle: video?.videoTitle ?? null,
        thumbnailUrl: video?.thumbnailUrl ?? null,
        description: video?.description ?? null,
        startSec: video?.startSec ?? 0,
        endSec: video?.endSec ?? null,
        playToEnd: video?.playToEnd ?? false,
        durationSec: video?.durationSec ?? null,
        anonymous: video?.anonymous ?? false,
      },
    });
  }

  await recordPlatformFee(platformFee, {
    referenceType: "tip",
    referenceId: `${senderId}-${receiverId}-${Date.now()}`,
    paymentIntentId,
    memo: `후원 수수료 @${receiver.username}`,
  });
  await creditSellerEarning(receiverId, sellerAmount, {
    referenceType: "tip",
    referenceId: paymentIntentId ?? "tip",
    paymentIntentId,
    memo: `후원 @${sender.username}`,
  });

  const existing = await db.creatorSupport.findUnique({
    where: { supporterId_creatorId: { supporterId: senderId, creatorId: receiverId } },
  });
  const newTotal = (existing?.totalAmount ?? 0) + amount;

  const [senderRow, receiverRow] = await Promise.all([
    db.user.findUnique({ where: { id: senderId }, select: { totalSupportSent: true } }),
    db.user.findUnique({ where: { id: receiverId }, select: { totalSupportReceived: true } }),
  ]);
  const newSent = (senderRow?.totalSupportSent ?? 0) + amount;
  const newReceived = (receiverRow?.totalSupportReceived ?? 0) + sellerAmount;

  const tier = tierFromAmount(newTotal);
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
      data: { totalTips: { increment: sellerAmount } },
    });
  }

  await notifyTip(receiverId, senderId, amount, receiver.username);

  revalidatePath(`/u/${receiver.username}`);
  revalidatePath("/support");
  revalidatePath("/wallet");
  revalidatePath("/rankings");
  if (channelId) {
    revalidatePath(`/voice/${channelId}`);
    revalidatePath("/live");
  }
  return { success: true, tipId: tip.id, videoTip: tipKind === "video" && !!channelId?.trim() };
}

/**
 * 결제 승인 후 공통 처리 (Stripe Checkout 성공·웹훅 공통, 멱등)
 */
export async function fulfillPaymentIntent(
  orderId: string,
  paymentRef: string,
  amount: number
): Promise<{ ok: true; type: string; alreadyPaid?: boolean } | { ok: false; error: string }> {
  const intent = await db.paymentIntent.findUnique({ where: { id: orderId } });
  if (!intent) return { ok: false, error: "결제 정보를 찾을 수 없습니다." };
  if (intent.status === "PAID") {
    return { ok: true, type: intent.type, alreadyPaid: true };
  }
  if (intent.amount !== amount) {
    return { ok: false, error: "결제 금액이 일치하지 않습니다." };
  }

  const meta = intent.metadata as Record<string, string>;
  const userId = intent.userId;

  await recordPaymentGross(amount, intent.id, intent.type);

  if (intent.type === "TIP") {
    const r = await fulfillTip(
      userId,
      meta.receiverId,
      amount,
      meta.message,
      intent.id,
      meta.channelId,
      meta.tipKind,
      meta as Record<string, unknown>
    );
    if ("error" in r && r.error) return { ok: false, error: r.error };
  }

  if (intent.type === "PRODUCT") {
    const productId = meta.productId;
    const product = await db.digitalProduct.findUnique({ where: { id: productId } });
    if (!product) return { ok: false, error: "상품을 찾을 수 없습니다." };
    const { platformFee, sellerAmount } = splitPlatformFee(amount);
    await db.order.create({
      data: {
        buyerId: userId,
        total: amount,
        status: "completed",
        items: { create: { productId, price: amount } },
      },
    });
    await db.digitalProduct.update({
      where: { id: productId },
      data: { salesCount: { increment: 1 } },
    });
    await recordPlatformFee(platformFee, {
      referenceType: "digital_product",
      referenceId: productId,
      paymentIntentId: intent.id,
    });
    await creditSellerEarning(product.sellerId, sellerAmount, {
      referenceType: "digital_product",
      referenceId: productId,
      paymentIntentId: intent.id,
    });
    revalidatePath("/support");
  }

  if (intent.type === "PREMIUM") {
    const until = new Date();
    until.setMonth(until.getMonth() + 1);
    await db.user.update({
      where: { id: userId },
      data: { premiumTier: "PREMIUM", premiumUntil: until },
    });
    await recordPlatformFee(amount, {
      referenceType: "premium",
      referenceId: userId,
      paymentIntentId: intent.id,
      memo: "프리미엄 구독",
    });
    revalidatePath("/premium");
    revalidatePath("/settings");
  }

  if (intent.type === "EMOTICON") {
    let packId = meta.packId;
    if (!packId && meta.packSlug) {
      const p = await db.emoticonPack.findUnique({ where: { slug: meta.packSlug } });
      packId = p?.id ?? packId;
    }
    const r = await fulfillEmoticonPurchase(userId, packId);
    if ("error" in r && r.error) return { ok: false, error: r.error };
    await recordPlatformFee(amount, {
      referenceType: "emoticon",
      referenceId: packId,
      paymentIntentId: intent.id,
      memo: "이모티콘 구매 (플랫폼 보관)",
    });
    revalidatePath("/support");
  }

  if (intent.type === "LISTING_FEE") {
    const r = await fulfillListingFee(meta.requestId, userId);
    if ("error" in r && r.error) return { ok: false, error: r.error };
    await recordPlatformFee(LISTING_FEE_KRW, {
      referenceType: "listing_fee",
      referenceId: meta.requestId,
      paymentIntentId: intent.id,
      memo: "굿즈 등록비",
    });
    revalidatePath("/support");
  }

  if (intent.type === "EVENT_REGISTRATION") {
    const r = await fulfillEventRegistration(meta.eventId, userId);
    if ("error" in r && r.error) return { ok: false, error: r.error };
    await recordPlatformFee(EVENT_REGISTRATION_FEE_KRW, {
      referenceType: "event_registration",
      referenceId: meta.eventId,
      paymentIntentId: intent.id,
      memo: "이벤트 등록비",
    });
    revalidatePath("/events");
  }

  if (intent.type === "PHYSICAL_GOODS") {
    const r = await fulfillPhysicalGoodsPayment(meta.orderId, userId);
    if ("error" in r && r.error) return { ok: false, error: r.error };
    const order = await db.physicalOrder.findUnique({ where: { id: meta.orderId } });
    if (order) {
      await recordPlatformFee(order.platformFee, {
        referenceType: "physical_order",
        referenceId: order.id,
        paymentIntentId: intent.id,
      });
      await creditSellerEarning(order.sellerId, order.sellerAmount, {
        referenceType: "physical_order",
        referenceId: order.id,
        paymentIntentId: intent.id,
        memo: "굿즈 판매 정산",
      });
    }
    revalidatePath("/support");
  }

  if (intent.type === "CREATOR_EPISODE") {
    const r = await fulfillCreatorEpisodePurchase(userId, meta.episodeId, amount, intent.id);
    if ("error" in r && r.error) return { ok: false, error: r.error };
    if ("success" in r && r.success && !r.alreadyOwned) {
      await recordPlatformFee(r.platformFee, {
        referenceType: "creator_episode",
        referenceId: r.referenceId,
        paymentIntentId: intent.id,
      });
      await creditSellerEarning(r.authorId, r.sellerAmount, {
        referenceType: "creator_episode",
        referenceId: r.referenceId,
        paymentIntentId: intent.id,
        memo: "크리에이터 작품 판매",
      });
    }
    revalidatePath("/works");
    revalidatePath(`/works/e/${meta.episodeId}`);
  }

  if (intent.type === "POST_MEDIA") {
    const r = await fulfillPostMediaPurchase(userId, meta.mediaId, amount, intent.id);
    if ("error" in r && r.error) return { ok: false, error: r.error };
    if ("success" in r && r.success && !r.alreadyOwned) {
      await recordPlatformFee(r.platformFee, {
        referenceType: "post_media",
        referenceId: r.referenceId,
        paymentIntentId: intent.id,
      });
      await creditSellerEarning(r.authorId, r.sellerAmount, {
        referenceType: "post_media",
        referenceId: r.referenceId,
        paymentIntentId: intent.id,
        memo: "프로필 유료 미디어",
      });
    }
    if (meta.username) revalidatePath(`/u/${meta.username}`);
    if ("postId" in r && r.postId) revalidatePath(`/post/${r.postId}`);
    revalidatePath("/");
  }

  await db.paymentIntent.update({
    where: { id: orderId },
    data: { status: "PAID", paymentKey: paymentRef, paidAt: new Date() },
  });

  revalidatePath("/wallet");
  revalidatePath("/admin/finance");
  return { ok: true, type: intent.type };
}
