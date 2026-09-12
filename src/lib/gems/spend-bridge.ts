import { db } from "@/lib/db";
import { tierFromAmount } from "@/lib/tiers";
import { notifyTip } from "@/lib/notifications";
import { PLATFORM_MARGIN_RATE } from "@/lib/gems/constants";
import { spendGemsOnGift } from "@/lib/gems/gift";
import type { GiftEventSource } from "@/lib/gems/constants";

/** MOCO amount equals USD cents (1 MOCO = $0.01) */
function gemsToAmountCents(gems: number) {
  return gems;
}

async function updateSupportStats(senderId: string, receiverId: string, amountCents: number) {
  const existing = await db.creatorSupport.findUnique({
    where: { supporterId_creatorId: { supporterId: senderId, creatorId: receiverId } },
  });
  const newTotal = (existing?.totalAmount ?? 0) + amountCents;

  const [senderRow, receiverRow] = await Promise.all([
    db.user.findUnique({ where: { id: senderId }, select: { totalSupportSent: true } }),
    db.user.findUnique({ where: { id: receiverId }, select: { totalSupportReceived: true } }),
  ]);
  const newSent = (senderRow?.totalSupportSent ?? 0) + amountCents;
  const newReceived = (receiverRow?.totalSupportReceived ?? 0) + amountCents;

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
    create: { supporterId: senderId, creatorId: receiverId, totalAmount: amountCents, tier },
    update: { totalAmount: newTotal, tier },
  });

  const cosProfile = await db.cosplayerProfile.findUnique({ where: { userId: receiverId } });
  if (cosProfile) {
    await db.cosplayerProfile.update({
      where: { id: cosProfile.id },
      data: { totalTips: { increment: amountCents } },
    });
  }
}

export async function spendGemsOnProfileTip(input: {
  fanId: string;
  creatorId: string;
  gems: number;
  message?: string;
  channelId?: string;
}) {
  const amountCents = gemsToAmountCents(input.gems);
  const platformFee = Math.floor(amountCents * PLATFORM_MARGIN_RATE);

  const gift = await spendGemsOnGift({
    fanId: input.fanId,
    creatorId: input.creatorId,
    gems: input.gems,
    source: "profile_tip",
  });
  if ("error" in gift) return gift;

  const receiver = await db.user.findUnique({
    where: { id: input.creatorId },
    select: { username: true },
  });
  if (!receiver) return { error: "크리에이터를 찾을 수 없습니다." as const };

  const tip = await db.tip.create({
    data: {
      senderId: input.fanId,
      receiverId: input.creatorId,
      amount: amountCents,
      message: input.message?.trim() || null,
      platformFee,
      channelId: input.channelId?.trim() || null,
    },
  });

  await updateSupportStats(input.fanId, input.creatorId, amountCents);
  await notifyTip(input.creatorId, input.fanId, amountCents, receiver.username, {
    message: input.message?.trim() || null,
    channelId: input.channelId?.trim() || null,
  });

  return { success: true as const, tip, giftEvent: gift.giftEvent, balance: gift.balance };
}

export async function spendGemsOnLiveTip(input: {
  fanId: string;
  creatorId: string;
  channelId: string;
  gems: number;
  message?: string;
  liveSupportType?: import("@prisma/client").LiveSupportEventType;
}) {
  const amountCents = gemsToAmountCents(input.gems);
  const platformFee = Math.floor(amountCents * PLATFORM_MARGIN_RATE);

  const gift = await spendGemsOnGift({
    fanId: input.fanId,
    creatorId: input.creatorId,
    gems: input.gems,
    source: "live_tip",
    contentId: input.channelId,
  });
  if ("error" in gift) return gift;

  const tip = await db.tip.create({
    data: {
      senderId: input.fanId,
      receiverId: input.creatorId,
      amount: amountCents,
      message: input.message?.trim() || null,
      platformFee,
      channelId: input.channelId,
    },
  });

  const liveEvent = await db.liveSupportEvent.create({
    data: {
      channelId: input.channelId,
      senderId: input.fanId,
      receiverId: input.creatorId,
      type: input.liveSupportType ?? "GENERAL",
      amount: amountCents,
      message: input.message?.trim() || null,
      metadata: { giftEventId: gift.giftEvent.id, tipId: tip.id },
    },
  });

  const sender = await db.user.findUnique({
    where: { id: input.fanId },
    select: { username: true },
  });
  if (sender) {
    const { relayLiveSupportEvent } = await import("@/lib/live-support-socket-relay");
    void relayLiveSupportEvent(input.channelId, {
      id: liveEvent.id,
      channelId: input.channelId,
      type: liveEvent.type,
      amount: liveEvent.amount,
      message: liveEvent.message,
      metadata: (liveEvent.metadata as Record<string, unknown> | null) ?? null,
      username: sender.username,
      senderId: input.fanId,
      at: liveEvent.createdAt.getTime(),
    });
  }

  await updateSupportStats(input.fanId, input.creatorId, amountCents);

  return {
    success: true as const,
    tip,
    liveEvent,
    giftEvent: gift.giftEvent,
    balance: gift.balance,
  };
}

export async function spendGemsOnPostMedia(input: {
  fanId: string;
  mediaId: string;
  gems: number;
}) {
  const media = await db.postMedia.findUnique({
    where: { id: input.mediaId },
    include: {
      post: { select: { authorId: true, instantPurchasePriceKrw: true, id: true } },
    },
  });
  if (!media) return { error: "미디어를 찾을 수 없습니다." as const };
  if (media.post.authorId === input.fanId) {
    return { error: "본인 콘텐츠는 구매할 수 없습니다." as const };
  }

  const priceCents = media.priceKrw > 0 ? media.priceKrw : media.post.instantPurchasePriceKrw;
  if (priceCents <= 0) return { error: "무료 미디어는 구매가 필요 없습니다." as const };
  if (input.gems !== priceCents) {
    return { error: "가격이 일치하지 않습니다." as const };
  }

  const existing = await db.postMediaPurchase.findUnique({
    where: { buyerId_mediaId: { buyerId: input.fanId, mediaId: input.mediaId } },
  });
  if (existing) return { success: true as const, alreadyOwned: true as const };

  const gift = await spendGemsOnGift({
    fanId: input.fanId,
    creatorId: media.post.authorId,
    gems: input.gems,
    source: "post_media_purchase",
    contentId: input.mediaId,
  });
  if ("error" in gift) return gift;

  const purchase = await db.postMediaPurchase.create({
    data: { buyerId: input.fanId, mediaId: input.mediaId, price: priceCents },
  });
  await db.postMedia.update({
    where: { id: input.mediaId },
    data: { purchaseCount: { increment: 1 } },
  });

  return {
    success: true as const,
    purchase,
    giftEvent: gift.giftEvent,
    balance: gift.balance,
    postId: media.postId,
    authorId: media.post.authorId,
  };
}

export type GemSpendSource = GiftEventSource;
