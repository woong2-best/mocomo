import { revalidatePath } from "next/cache";
import { revalidateAptHub } from "@/lib/apt/revalidate-hub";
import { db } from "@/lib/db";
import { LISTING_FEE_KRW } from "@/lib/goods-shop";
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
import { fulfillFlowerPurchase } from "@/lib/flower/service";
import { fulfillCreatorEpisodePurchase } from "@/actions/creator-works";
import { fulfillPostMediaPurchase } from "@/actions/post-media-purchase";
import { fulfillMessageMediaPurchase } from "@/actions/message-media-purchase";
import { fulfillCreatorSubscriptionPurchase } from "@/actions/creator-subscription-purchase";
import { calcPlatformFee } from "@/lib/utils";
import { tierFromAmount } from "@/lib/tiers";
import { notifyTip } from "@/lib/notifications";
import { parseVideoTipMeta } from "@/lib/donation-metadata";
import { normalizeYoutubeUrl } from "@/lib/video-donation";
import { buildLetterDonationMessageBody } from "@/lib/chat-letter-donation";
import { COMMUNITY_FEED_PATH } from "@/lib/site-routes";
import { creditPlatformWallet } from "@/lib/platform/wallet/service";
import { findMocoTopupPackage, krwToMoco } from "@/lib/moco/economy";

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
  if (!receiver) return { error: "???? ?? ? ????." };

  const sender = await db.user.findUnique({
    where: { id: senderId },
    select: { username: true },
  });
  if (!sender) return { error: "???? ?? ? ????." };

  if (channelId?.trim()) {
    const { assertLiveDonationsAllowed } = await import(
      "@/lib/streaming-accounts/donation-guard"
    );
    const donationCheck = await assertLiveDonationsAllowed(channelId.trim());
    if (!donationCheck.ok) return { error: donationCheck.error };
  }

  const { applyBenefitsToSettlement } = await import("@/lib/admin/services/promotions");
  const feeResult = await applyBenefitsToSettlement({
    userId: receiverId,
    grossAmountKrw: amount,
    referenceType: "tip_settlement",
    referenceId: paymentIntentId ?? undefined,
    note: `tip from ${sender.username}`,
  });
  const platformFee = feeResult.feeAfterKrw;
  const sellerAmount = feeResult.sellerAmountKrw;

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
    memo: `?? ??? @${receiver.username}`,
  });
  await creditSellerEarning(receiverId, sellerAmount, {
    referenceType: "tip",
    referenceId: paymentIntentId ?? "tip",
    paymentIntentId,
    memo: `?? @${sender.username}`,
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

  await notifyTip(receiverId, senderId, amount, receiver.username, {
    message: message || null,
    channelId: channelId?.trim() || null,
  });

  const roomId =
    typeof rawMeta?.roomId === "string" && rawMeta.roomId.trim() ? rawMeta.roomId.trim() : null;
  if (roomId && tipKind === "letter") {
    const member = await db.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId: senderId } },
      select: { userId: true },
    });
    if (member) {
      await db.message.create({
        data: {
          roomId,
          senderId,
          content: buildLetterDonationMessageBody(tip.id),
        },
      });
      await db.chatRoom.update({
        where: { id: roomId },
        data: { updatedAt: new Date() },
      });
    }
  }

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
 * ?? ?? ? ?? ?? (Stripe Checkout ????? ??, ??)
 */
export async function fulfillPaymentIntent(
  orderId: string,
  paymentRef: string,
  amount: number
): Promise<{ ok: true; type: string; alreadyPaid?: boolean } | { ok: false; error: string }> {
  const intent = await db.paymentIntent.findUnique({ where: { id: orderId } });
  if (!intent) return { ok: false, error: "?? ??? ?? ? ????." };
  if (intent.status === "PAID") {
    return { ok: true, type: intent.type, alreadyPaid: true };
  }
  if (intent.amount !== amount) {
    return { ok: false, error: "?? ??? ???? ????." };
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
    if (!product) return { ok: false, error: "??? ?? ? ????." };
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
      memo: "???? ??",
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
      memo: "???? ?? (??? ??)",
    });
    revalidatePath("/support");
  }

  if (intent.type === "FLOWER") {
    const flowerTypeId = String(meta.flowerTypeId ?? "");
    const quantity = Math.max(1, Math.min(20, Number(meta.quantity) || 1));
    const r = await fulfillFlowerPurchase({
      buyerId: userId,
      flowerTypeId,
      quantity,
      paymentIntentId: intent.id,
      amountPaid: amount,
    });
    if ("error" in r && r.error) return { ok: false, error: r.error };
    // Platform already received Stripe funds; inventory issued. Redeem fee captured later.
    revalidatePath("/flowers");
    revalidatePath("/support");
  }

  if (intent.type === "LISTING_FEE") {
    const r = await fulfillListingFee(meta.requestId, userId);
    if ("error" in r && r.error) return { ok: false, error: r.error };
    await recordPlatformFee(LISTING_FEE_KRW, {
      referenceType: "listing_fee",
      referenceId: meta.requestId,
      paymentIntentId: intent.id,
      memo: "?? ???",
    });
    revalidatePath("/support");
  }

  if (intent.type === "EVENT_REGISTRATION") {
    const r = await fulfillEventRegistration(meta.eventId, userId);
    if ("error" in r && r.error) return { ok: false, error: r.error };
    await recordPlatformFee(intent.amount, {
      referenceType: "event_registration",
      referenceId: meta.eventId,
      paymentIntentId: intent.id,
      memo: "??? ???",
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
        memo: "?? ?? ??",
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
        memo: "????? ?? ??",
      });
    }
    revalidatePath("/works");
    revalidatePath(`/works/e/${meta.episodeId}`);
  }

  if (intent.type === "CREATOR_SUBSCRIPTION") {
    const r = await fulfillCreatorSubscriptionPurchase(
      userId,
      meta.creatorId,
      amount,
      intent.id
    );
    if ("error" in r && r.error) return { ok: false, error: r.error };
    if ("success" in r && r.success) {
      await recordPlatformFee(r.platformFee, {
        referenceType: "creator_subscription",
        referenceId: r.referenceId,
        paymentIntentId: intent.id,
        memo: "????? ??",
      });
      await creditSellerEarning(r.creatorId, r.sellerAmount, {
        referenceType: "creator_subscription",
        referenceId: r.referenceId,
        paymentIntentId: intent.id,
        memo: "????? ?? ??",
      });
    }
    if (r.username) revalidatePath(`/u/${r.username}`);
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
        memo: "??? ?? ???",
      });
    }
    if (meta.username) revalidatePath(`/u/${meta.username}`);
    if ("postId" in r && r.postId) {
      revalidatePath(`/post/${r.postId}`);
      revalidatePath(`/u/${meta.username ?? ""}`);
    }
    revalidatePath(COMMUNITY_FEED_PATH);
  }

  if (intent.type === "MESSAGE_MEDIA") {
    const r = await fulfillMessageMediaPurchase(
      userId,
      String(meta.attachmentId ?? ""),
      amount,
      intent.id
    );
    if ("error" in r && r.error) return { ok: false, error: r.error };
    if ("success" in r && r.success && !r.alreadyOwned) {
      await recordPlatformFee(r.platformFee, {
        referenceType: "message_media",
        referenceId: r.referenceId,
        paymentIntentId: intent.id,
      });
      await creditSellerEarning(r.authorId, r.sellerAmount, {
        referenceType: "message_media",
        referenceId: r.referenceId,
        paymentIntentId: intent.id,
        memo: "DM 팬아트 판매",
      });
    }
    if ("roomId" in r && r.roomId) {
      revalidatePath(`/messages/${r.roomId}`);
    }
  }

  if (intent.type === "STUDIO_ASSET") {
    const { fulfillStudioAssetPurchase } = await import("@/studio/actions/checkout");
    const assetId = String(meta.studioAssetId ?? "");
    const r = await fulfillStudioAssetPurchase(userId, assetId, amount);
    if ("error" in r && r.error) return { ok: false, error: r.error };
    if ("success" in r && r.success && !r.alreadyOwned && r.platformFee != null) {
      await recordPlatformFee(r.platformFee, {
        referenceType: "studio_asset",
        referenceId: assetId,
        paymentIntentId: intent.id,
        memo: "MoCoMo Studio ??",
      });
    }
    revalidatePath("/studio/market");
    revalidatePath("/studio/library");
    revalidateAptHub();
  }

  if (intent.type === "MARKETPLACE") {
    const marketplaceOrderId = String(meta.marketplaceOrderId ?? "");
    const { fulfillMarketplaceOrder } = await import("@/lib/marketplace/fulfillment");
    const r = await fulfillMarketplaceOrder({
      marketplaceOrderId,
      paymentIntentDbId: intent.id,
      paymentRef,
      amount,
    });
    if ("error" in r && r.error) return { ok: false, error: r.error };
    revalidatePath("/market");
    revalidatePath("/market/orders");
    revalidatePath(`/market/orders/${marketplaceOrderId}`);
  }

  if (intent.type === "MOCO_TOPUP") {
    const metaMoco = Number(meta.mocoAmount);
    const pack = findMocoTopupPackage(metaMoco);
    const mocoAmount = pack?.moco ?? krwToMoco(amount);
    if (pack && pack.krw !== amount) {
      return { ok: false, error: "모코 충전 금액이 패키지와 일치하지 않습니다." };
    }
    if (mocoAmount <= 0) {
      return { ok: false, error: "모코 충전량을 확인할 수 없습니다." };
    }
    await creditPlatformWallet({
      userId,
      bucket: "MOCO_POINTS",
      amount: mocoAmount,
      reason: "MOCO_TOPUP",
      referenceType: "payment_intent",
      referenceId: intent.id,
      metadata: { krw: amount },
    });
    // Top-up fee is Stripe processing only; platform keeps gross as liability until tip spend.
    revalidatePath("/wallet");
  }

  if (intent.type === "CALL_BOOKING") {
    const { fulfillCallBookingPayment } = await import("@/lib/call-booking");
    const bookingId = String(meta.bookingId ?? "");
    const r = await fulfillCallBookingPayment({
      bookingId,
      fanId: userId,
      paymentIntentId: intent.id,
      paymentRef,
      amount,
    });
    if ("error" in r && r.error) return { ok: false, error: r.error };
  }

  await db.paymentIntent.update({
    where: { id: orderId },
    data: { status: "PAID", paymentKey: paymentRef, paidAt: new Date() },
  });

  revalidatePath("/wallet");
  revalidatePath("/admin/finance");
  return { ok: true, type: intent.type };
}
