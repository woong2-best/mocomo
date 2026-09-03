import { db } from "@/lib/db";
import type { UsedAuctionBid, UsedAuctionConfig } from "@prisma/client";
import {
  DEFAULT_USED_AUCTION_CONFIG,
  negotiationDueAtFromNow,
  paymentDueAtFromNow,
  type UsedAuctionConfigSlice,
} from "@/lib/used-auction-config";
import { sendUsedAuctionNotification } from "@/lib/used-auction-notify";
import { voidActiveHoldForBidder } from "@/lib/used-auction-bid-hold";
import { USED_MARKET_BAN_MESSAGE } from "@/lib/used-market-access";
import { recordAuctionPaymentTimeoutSanction } from "@/lib/used-market-sanction-log";
import { USED_MARKET_APPEAL_PATH } from "@/lib/used-auction-legal";

export async function getUsedAuctionConfig(): Promise<UsedAuctionConfigSlice> {
  try {
    const row = await db.usedAuctionConfig.findUnique({ where: { id: "default" } });
    if (!row) return DEFAULT_USED_AUCTION_CONFIG;
    return {
      depositEnabled: row.depositEnabled,
      depositRate: row.depositRate,
      paymentDeadlineHours: row.paymentDeadlineHours,
      negotiationDeadlineHours: row.negotiationDeadlineHours,
    };
  } catch {
    return DEFAULT_USED_AUCTION_CONFIG;
  }
}

export function rankBidsByBidder(bids: UsedAuctionBid[]): UsedAuctionBid[] {
  const best = new Map<string, UsedAuctionBid>();
  for (const bid of bids) {
    if (bid.bidStatus === "FORFEITED" || bid.bidStatus === "SUPERSEDED") continue;
    const prev = best.get(bid.bidderId);
    if (!prev || bid.amount > prev.amount) best.set(bid.bidderId, bid);
  }
  return [...best.values()].sort((a, b) => b.amount - a.amount || b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getRankedBidders(listingId: string, excludeUserIds: string[] = []) {
  const bids = await db.usedAuctionBid.findMany({
    where: { listingId },
    orderBy: [{ amount: "desc" }, { createdAt: "desc" }],
  });
  return rankBidsByBidder(bids).filter((b) => !excludeUserIds.includes(b.bidderId));
}

async function getOrCreateDmRoomBetween(userA: string, userB: string) {
  const existing = await db.chatRoom.findFirst({
    where: {
      type: "DM",
      AND: [
        { members: { some: { userId: userA } } },
        { members: { some: { userId: userB } } },
      ],
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const room = await db.chatRoom.create({
    data: {
      type: "DM",
      isPublic: false,
      members: {
        create: [
          { userId: userA, role: "owner" },
          { userId: userB, role: "member" },
        ],
      },
    },
    select: { id: true },
  });
  return room.id;
}

export async function beginAuctionPaymentWindow(
  listingId: string,
  winnerId: string,
  config?: UsedAuctionConfigSlice
) {
  const cfg = config ?? (await getUsedAuctionConfig());
  const paymentDueAt = paymentDueAtFromNow(cfg.paymentDeadlineHours);

  await db.$transaction(async (tx) => {
    await tx.usedListing.update({
      where: { id: listingId },
      data: {
        auctionState: "PAYMENT_PENDING",
        status: "RESERVED",
        winningBidderId: winnerId,
        paymentDueAt,
        paymentCompletedAt: null,
        paymentReminder1hSent: false,
        paymentReminder10mSent: false,
        paymentTimeoutProcessed: false,
      },
    });
    await tx.usedAuctionBid.updateMany({
      where: { listingId, bidderId: winnerId },
      data: { bidStatus: "WINNER" },
    });
    await tx.user.update({
      where: { id: winnerId },
      data: { auctionWinCount: { increment: 1 } },
    });
  });
}

export async function setupWinnerTradeChat(
  listingId: string,
  buyerId: string,
  introLines: string[]
) {
  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    select: { id: true, title: true, sellerId: true, currentBidAmount: true, price: true },
  });
  if (!listing) return null;

  const roomId = await getOrCreateDmRoomBetween(listing.sellerId, buyerId);
  try {
    await db.usedListingChat.upsert({
      where: { listingId_buyerId: { listingId, buyerId } },
      create: { listingId, roomId, buyerId },
      update: { roomId },
    });
  } catch {
    /* optional */
  }

  const amount = listing.currentBidAmount ?? listing.price;
  const priceText = amount === 0 ? "나눔" : `${amount.toLocaleString()}원`;
  const intro = [
    ...introLines,
    "",
    `상품: ${listing.title}`,
    `낙찰가: ${priceText}`,
    `링크: /used/${listing.id}`,
  ].join("\n");

  await db.message.create({
    data: { roomId, senderId: listing.sellerId, content: intro },
  });
  await db.chatRoom.update({ where: { id: roomId }, data: { updatedAt: new Date() } });
  return roomId;
}

async function banUserFromUsedMarket(userId: string, listingId: string) {
  const sanctionLogId = await recordAuctionPaymentTimeoutSanction(userId, listingId);

  await db.user.update({
    where: { id: userId },
    data: {
      usedMarketBannedAt: new Date(),
      usedMarketBanReason: USED_MARKET_BAN_MESSAGE,
      usedMarketBanListingId: listingId,
      auctionPaymentDefaultCount: { increment: 1 },
      auctionLastPaymentDefaultAt: new Date(),
    },
  });

  return sanctionLogId;
}

export async function transferToNextBidder(
  listingId: string,
  config?: UsedAuctionConfigSlice,
  options?: { incrementForfeitCount?: boolean }
) {
  const cfg = config ?? (await getUsedAuctionConfig());
  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing) return { transferred: false };

  const priorForfeited = await db.usedAuctionBid.findMany({
    where: { listingId, bidStatus: { in: ["FORFEITED", "SUPERSEDED"] } },
    select: { bidderId: true },
  });
  const excludeUserIds = [...new Set(priorForfeited.map((p) => p.bidderId))];
  if (listing.winningBidderId) excludeUserIds.push(listing.winningBidderId);
  if (listing.negotiationBuyerId) excludeUserIds.push(listing.negotiationBuyerId);

  const ranked = await getRankedBidders(listingId, excludeUserIds);
  const next = ranked[0];
  if (!next) {
    await db.usedListing.update({
      where: { id: listingId },
      data: {
        auctionState: "NEGOTIATION_FAILED",
        status: "SELLING",
        winningBidderId: null,
        negotiationBuyerId: null,
        negotiationDueAt: null,
        paymentDueAt: null,
      },
    });
    await sendUsedAuctionNotification({
      userId: listing.sellerId,
      type: "ended",
      title: "경매 거래 무산",
      body: `${listing.title} — 차순위 입찰자가 없습니다. 다시 등록할 수 있습니다.`,
      link: `/used/${listingId}`,
    });
    return { transferred: false, relisted: true };
  }

  const negotiationDueAt = negotiationDueAtFromNow(cfg.negotiationDeadlineHours);
  const roomId = await getOrCreateDmRoomBetween(listing.sellerId, next.bidderId);

  await db.$transaction(async (tx) => {
    await tx.usedListing.update({
      where: { id: listingId },
      data: {
        auctionState: "PRICE_NEGOTIATION",
        status: "RESERVED",
        winningBidderId: null,
        negotiationBuyerId: next.bidderId,
        negotiationDueAt,
        negotiationTimeoutProcessed: false,
        activeNegotiationRoomId: roomId,
        paymentDueAt: null,
        ...(options?.incrementForfeitCount
          ? { forfeitedWinnerCount: { increment: 1 } }
          : {}),
      },
    });
    await tx.usedListingChat.upsert({
      where: { listingId_buyerId: { listingId, buyerId: next.bidderId } },
      create: { listingId, roomId, buyerId: next.bidderId },
      update: { roomId },
    });
  });

  const prevAmount = listing.currentBidAmount ?? listing.price;
  const intro = [
    "이전 낙찰자가 결제를 완료하지 않아 회원님에게 거래 기회가 제공되었습니다.",
    "",
    `이전 최고 입찰: ${prevAmount.toLocaleString()}원 (미결제)`,
    `회원님 입찰: ${next.amount.toLocaleString()}원`,
    "",
    "아래에서 가격을 협의해 주세요. 24시간 내 합의하지 않으면 거래가 종료됩니다.",
  ];
  await db.message.create({
    data: { roomId, senderId: listing.sellerId, content: intro.join("\n") },
  });
  await db.chatRoom.update({ where: { id: roomId }, data: { updatedAt: new Date() } });

  await sendUsedAuctionNotification({
    userId: next.bidderId,
    type: "won",
    title: "차순위 거래 기회",
    body: `${listing.title} — 가격 협의를 진행해 주세요.`,
    link: `/messages/${roomId}?usedListing=${listingId}`,
  });
  await sendUsedAuctionNotification({
    userId: listing.sellerId,
    type: "transfer",
    title: "차순위 입찰자에게 승계",
    body: `${listing.title} — ${next.amount.toLocaleString()}원 입찰자와 협의하세요.`,
    link: `/messages/${roomId}?usedListing=${listingId}`,
  });

  return { transferred: true, nextBidderId: next.bidderId, roomId };
}

/** Stripe: auto next-bidder win + MarketplaceOrder. Honor: legacy price negotiation. */
export async function promoteNextAuctionWinner(
  listingId: string,
  config?: UsedAuctionConfigSlice,
  options?: { incrementForfeitCount?: boolean }
) {
  const cfg = config ?? (await getUsedAuctionConfig());
  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing) return { transferred: false };

  const { resolveBidHoldMode } = await import("@/lib/used-auction-bid-hold");
  const holdMode = await resolveBidHoldMode({ listing });

  if (holdMode !== "stripe") {
    return transferToNextBidder(listingId, cfg, options);
  }

  const priorForfeited = await db.usedAuctionBid.findMany({
    where: { listingId, bidStatus: { in: ["FORFEITED", "SUPERSEDED"] } },
    select: { bidderId: true },
  });
  const excludeUserIds = [...new Set(priorForfeited.map((p) => p.bidderId))];
  if (listing.winningBidderId) excludeUserIds.push(listing.winningBidderId);
  if (listing.negotiationBuyerId) excludeUserIds.push(listing.negotiationBuyerId);

  const ranked = await getRankedBidders(listingId, excludeUserIds);
  const next = ranked[0];
  if (!next) {
    await db.usedListing.update({
      where: { id: listingId },
      data: {
        auctionState: "NEGOTIATION_FAILED",
        status: "SELLING",
        winningBidderId: null,
        negotiationBuyerId: null,
        negotiationDueAt: null,
        paymentDueAt: null,
        marketplaceOrderId: null,
      },
    });
    await sendUsedAuctionNotification({
      userId: listing.sellerId,
      type: "ended",
      title: "경매 거래 무산",
      body: `${listing.title} — 차순위 입찰자가 없습니다.`,
      link: `/used/${listingId}`,
    });
    return { transferred: false, relisted: true };
  }

  const { attemptAutoHoldAndActivateOrder, usedOrderLink } = await import(
    "@/lib/used-auction-marketplace-order"
  );
  const auto = await attemptAutoHoldAndActivateOrder(listingId, next.bidderId, next.amount);

  if ("ok" in auto && auto.ok) {
    await db.usedListing.update({
      where: { id: listingId },
      data: {
        auctionState: "TRANSFERRED_TO_NEXT_BIDDER",
        status: "RESERVED",
        winningBidderId: next.bidderId,
        negotiationBuyerId: null,
        negotiationDueAt: null,
        paymentDueAt: null,
        marketplaceOrderId: auto.orderId,
        ...(options?.incrementForfeitCount ? { forfeitedWinnerCount: { increment: 1 } } : {}),
      },
    });
    const orderLink = usedOrderLink(auto.orderId);
    await sendUsedAuctionNotification({
      userId: next.bidderId,
      type: "won",
      title: "차순위 자동 낙찰",
      body: `${listing.title} — 주문이 생성되었습니다.`,
      link: orderLink,
    });
    await sendUsedAuctionNotification({
      userId: listing.sellerId,
      type: "transfer",
      title: "차순위 낙찰 — 배송 준비",
      body: `${listing.title}`,
      link: orderLink,
    });
    return { transferred: true, stripe: true, orderId: auto.orderId, nextBidderId: next.bidderId };
  }

  await beginAuctionPaymentWindow(listingId, next.bidderId, cfg);
  await db.usedListing.update({
    where: { id: listingId },
    data: {
      auctionState: "TRANSFERRED_TO_NEXT_BIDDER",
      ...(options?.incrementForfeitCount ? { forfeitedWinnerCount: { increment: 1 } } : {}),
    },
  });

  const link = `/used/${listingId}`;
  await sendUsedAuctionNotification({
    userId: next.bidderId,
    type: "won",
    title: "차순위 낙찰 — 카드 hold 필요",
    body: `${listing.title} — 입찰 hold 승인 후 주문이 생성됩니다.`,
    link,
  });
  await sendUsedAuctionNotification({
    userId: listing.sellerId,
    type: "transfer",
    title: "차순위 입찰자에게 승계",
    body: `${listing.title}`,
    link,
  });

  return {
    transferred: true,
    pendingHold: true,
    nextBidderId: next.bidderId,
    autoError: "error" in auto ? auto.error : undefined,
  };
}

export async function processPaymentTimeout(listingId: string, config?: UsedAuctionConfigSlice) {
  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.auctionState !== "PAYMENT_PENDING") return { processed: false };
  if (!listing.paymentDueAt || listing.paymentDueAt.getTime() > Date.now()) return { processed: false };
  if (listing.paymentTimeoutProcessed) return { processed: false };
  if (!listing.winningBidderId) return { processed: false };

  const winnerId = listing.winningBidderId;

  await db.$transaction(async (tx) => {
    await tx.usedListing.update({
      where: { id: listingId },
      data: {
        paymentTimeoutProcessed: true,
        auctionState: "PAYMENT_TIMEOUT",
      },
    });
    await tx.usedAuctionBid.updateMany({
      where: { listingId, bidderId: winnerId },
      data: { bidStatus: "FORFEITED" },
    });
  });

  await banUserFromUsedMarket(winnerId, listingId);

  await voidActiveHoldForBidder(listingId, winnerId, "payment_timeout");

  await sendUsedAuctionNotification({
    userId: winnerId,
    type: "payment_failed",
    title: "낙찰 결제 기한 초과",
    body: `${listing.title} — 중고거래 이용이 제한되었습니다. 이의가 있으면 ${USED_MARKET_APPEAL_PATH}에서 소명해 주세요.`,
    link: USED_MARKET_APPEAL_PATH,
  });
  await sendUsedAuctionNotification({
    userId: listing.sellerId,
    type: "ended",
    title: "낙찰자 결제 미이행",
    body: `${listing.title} — 차순위 입찰자에게 승계합니다.`,
    link: `/used/${listingId}`,
  });

  const transfer = await promoteNextAuctionWinner(listingId, config, { incrementForfeitCount: true });
  return { processed: true, transfer };
}

export async function processPaymentReminders(listingId: string) {
  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.auctionState !== "PAYMENT_PENDING" || !listing.paymentDueAt) return;
  if (!listing.winningBidderId) return;

  const remaining = listing.paymentDueAt.getTime() - Date.now();
  const link = `/used/${listingId}`;

  if (!listing.paymentReminder1hSent && remaining <= 60 * 60 * 1000 && remaining > 10 * 60 * 1000) {
    await db.usedListing.update({
      where: { id: listingId },
      data: { paymentReminder1hSent: true },
    });
    await sendUsedAuctionNotification({
      userId: listing.winningBidderId,
      type: "won",
      title: "결제 마감 1시간 전",
      body: listing.title,
      link,
    });
  }

  if (!listing.paymentReminder10mSent && remaining <= 10 * 60 * 1000 && remaining > 0) {
    await db.usedListing.update({
      where: { id: listingId },
      data: { paymentReminder10mSent: true },
    });
    await sendUsedAuctionNotification({
      userId: listing.winningBidderId,
      type: "won",
      title: "결제 마감 10분 전",
      body: listing.title,
      link,
    });
  }
}

export async function processNegotiationTimeout(listingId: string, config?: UsedAuctionConfigSlice) {
  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.auctionState !== "PRICE_NEGOTIATION") return { processed: false };
  if (!listing.negotiationDueAt || listing.negotiationDueAt.getTime() > Date.now()) {
    return { processed: false };
  }
  if (listing.negotiationTimeoutProcessed) return { processed: false };

  await db.usedListing.update({
    where: { id: listingId },
    data: { negotiationTimeoutProcessed: true },
  });

  const currentBuyer = listing.negotiationBuyerId;
  if (currentBuyer) {
    await db.usedAuctionBid.updateMany({
      where: { listingId, bidderId: currentBuyer },
      data: { bidStatus: "SUPERSEDED" },
    });
  }

  const transfer = await transferToNextBidder(listingId, config);
  if (!transfer.transferred) {
    await db.usedListing.update({
      where: { id: listingId },
      data: { auctionState: "NEGOTIATION_FAILED", status: "SELLING" },
    });
  }
  return { processed: true, transfer };
}

export async function runAuctionLifecycleBatch(take = 50) {
  const now = new Date();
  let paymentTimeouts = 0;
  let negotiationTimeouts = 0;
  let reminders = 0;

  try {
    const paymentPending = await db.usedListing.findMany({
      where: {
        saleType: "AUCTION",
        auctionState: "PAYMENT_PENDING",
        paymentTimeoutProcessed: false,
        paymentDueAt: { lte: now },
      },
      select: { id: true },
      take,
    });
    for (const row of paymentPending) {
      const res = await processPaymentTimeout(row.id);
      if (res.processed) paymentTimeouts++;
    }

    const paymentRemind = await db.usedListing.findMany({
      where: {
        saleType: "AUCTION",
        auctionState: "PAYMENT_PENDING",
        paymentDueAt: { gt: now },
      },
      select: { id: true },
      take,
    });
    for (const row of paymentRemind) {
      await processPaymentReminders(row.id);
      reminders++;
    }

    const negotiating = await db.usedListing.findMany({
      where: {
        saleType: "AUCTION",
        auctionState: "PRICE_NEGOTIATION",
        negotiationTimeoutProcessed: false,
        negotiationDueAt: { lte: now },
      },
      select: { id: true },
      take,
    });
    for (const row of negotiating) {
      const res = await processNegotiationTimeout(row.id);
      if (res.processed) negotiationTimeouts++;
    }
  } catch (e) {
    console.error("[runAuctionLifecycleBatch]", e);
  }

  return { paymentTimeouts, negotiationTimeouts, reminders };
}
