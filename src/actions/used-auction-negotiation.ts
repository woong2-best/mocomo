"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { assertUsedMarketAccess } from "@/lib/used-market-access";
import { sendUsedAuctionNotification } from "@/lib/used-auction-notify";
import { MAX_USED_LISTING_PRICE } from "@/lib/used-market";

function isNegotiationParticipant(
  listing: { sellerId: string; negotiationBuyerId: string | null },
  userId: string
) {
  return listing.sellerId === userId || listing.negotiationBuyerId === userId;
}

/** 가격 제안 */
export async function proposeUsedAuctionPrice(listingId: string, amount: number) {
  const user = await requireAuth();
  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  const price = Math.floor(amount);
  if (!Number.isFinite(price) || price <= 0 || price > MAX_USED_LISTING_PRICE) {
    return { error: "가격을 올바르게 입력해 주세요." };
  }

  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.auctionState !== "PRICE_NEGOTIATION") {
    return { error: "가격 협상 중인 경매가 아닙니다." };
  }
  if (!isNegotiationParticipant(listing, user.id)) {
    return { error: "권한이 없습니다." };
  }
  if (!listing.activeNegotiationRoomId) {
    return { error: "거래방이 없습니다." };
  }
  if (listing.negotiationDueAt && listing.negotiationDueAt.getTime() < Date.now()) {
    return { error: "협상 기한이 지났습니다." };
  }

  await db.$transaction(async (tx) => {
    await tx.usedPriceOffer.updateMany({
      where: { listingId, status: "PENDING" },
      data: { status: "SUPERSEDED" },
    });
    await tx.usedPriceOffer.create({
      data: {
        listingId,
        roomId: listing.activeNegotiationRoomId!,
        proposerId: user.id,
        amount: price,
        status: "PENDING",
      },
    });
  });

  const otherId =
    listing.sellerId === user.id ? listing.negotiationBuyerId! : listing.sellerId;
  const link = `/messages/${listing.activeNegotiationRoomId}?usedListing=${listingId}`;

  await db.message.create({
    data: {
      roomId: listing.activeNegotiationRoomId,
      senderId: user.id,
      content: `💰 가격 제안: ${price.toLocaleString()}원`,
    },
  });
  await db.chatRoom.update({
    where: { id: listing.activeNegotiationRoomId },
    data: { updatedAt: new Date() },
  });

  await sendUsedAuctionNotification({
    userId: otherId,
    type: "price_offer",
    title: "가격 제안 도착",
    body: `${listing.title} · ${price.toLocaleString()}원`,
    link,
    actorId: user.id,
  });

  revalidatePath(`/used/${listingId}`);
  revalidatePath(`/messages/${listing.activeNegotiationRoomId}`);
  return { success: true, amount: price };
}

/** 상대 제안 수락 */
export async function acceptUsedAuctionPrice(offerId: string) {
  const user = await requireAuth();
  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  const offer = await db.usedPriceOffer.findUnique({
    where: { id: offerId },
    include: { listing: true },
  });
  if (!offer || offer.status !== "PENDING") {
    return { error: "유효한 제안이 아닙니다." };
  }
  const listing = offer.listing;
  if (listing.auctionState !== "PRICE_NEGOTIATION") {
    return { error: "협상이 종료되었습니다." };
  }
  if (!isNegotiationParticipant(listing, user.id)) {
    return { error: "권한이 없습니다." };
  }
  if (offer.proposerId === user.id) {
    return { error: "본인 제안은 수락할 수 없습니다." };
  }

  await db.$transaction(async (tx) => {
    await tx.usedPriceOffer.update({
      where: { id: offerId },
      data: { status: "ACCEPTED" },
    });
    await tx.usedPriceOffer.updateMany({
      where: { listingId: listing.id, status: "PENDING", id: { not: offerId } },
      data: { status: "SUPERSEDED" },
    });
    await tx.usedListing.update({
      where: { id: listing.id },
      data: {
        auctionState: "NEGOTIATION_COMPLETED",
        agreedPrice: offer.amount,
        currentBidAmount: offer.amount,
        price: offer.amount,
      },
    });
  });

  const link = `/messages/${offer.roomId}?usedListing=${listing.id}`;
  await db.message.create({
    data: {
      roomId: offer.roomId,
      senderId: user.id,
      content: `✅ ${offer.amount.toLocaleString()}원에 합의했습니다. 결제를 진행해 주세요.`,
    },
  });

  await sendUsedAuctionNotification({
    userId: offer.proposerId,
    type: "price_accept",
    title: "가격 수락",
    body: `${listing.title} · ${offer.amount.toLocaleString()}원`,
    link,
    actorId: user.id,
  });

  revalidatePath(`/used/${listing.id}`);
  revalidatePath(`/messages/${offer.roomId}`);
  return { success: true, amount: offer.amount };
}

/** 제안 거절 */
export async function rejectUsedAuctionPrice(offerId: string) {
  const user = await requireAuth();
  const offer = await db.usedPriceOffer.findUnique({
    where: { id: offerId },
    include: { listing: true },
  });
  if (!offer || offer.status !== "PENDING") return { error: "유효한 제안이 아닙니다." };
  if (!isNegotiationParticipant(offer.listing, user.id)) return { error: "권한이 없습니다." };
  if (offer.proposerId === user.id) return { error: "본인 제안은 거절할 수 없습니다." };

  await db.usedPriceOffer.update({
    where: { id: offerId },
    data: { status: "REJECTED" },
  });

  await db.message.create({
    data: {
      roomId: offer.roomId,
      senderId: user.id,
      content: `❌ ${offer.amount.toLocaleString()}원 제안을 거절했습니다.`,
    },
  });

  await sendUsedAuctionNotification({
    userId: offer.proposerId,
    type: "price_reject",
    title: "가격 제안 거절",
    body: offer.listing.title,
    link: `/messages/${offer.roomId}?usedListing=${offer.listingId}`,
    actorId: user.id,
  });

  revalidatePath(`/used/${offer.listingId}`);
  return { success: true };
}

/** 거래 거절 (차순위 입찰자) */
export async function declineUsedAuctionNegotiation(listingId: string) {
  const user = await requireAuth();
  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.auctionState !== "PRICE_NEGOTIATION") {
    return { error: "협상 중인 경매가 아닙니다." };
  }
  if (listing.negotiationBuyerId !== user.id) {
    return { error: "차순위 입찰자만 거래를 거절할 수 있습니다." };
  }

  await db.usedAuctionBid.updateMany({
    where: { listingId, bidderId: user.id },
    data: { bidStatus: "SUPERSEDED" },
  });

  const { transferToNextBidder } = await import("@/lib/used-auction-lifecycle");
  const transfer = await transferToNextBidder(listingId);
  if (!transfer.transferred) {
    await db.usedListing.update({
      where: { id: listingId },
      data: { auctionState: "NEGOTIATION_FAILED", status: "SELLING" },
    });
  }

  revalidatePath(`/used/${listingId}`);
  return { success: true };
}

export async function getUsedPriceOffers(listingId: string, roomId?: string) {
  try {
    const offers = await db.usedPriceOffer.findMany({
      where: {
        listingId,
        ...(roomId ? { roomId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        proposer: { select: { id: true, username: true, name: true } },
      },
    });
    return { offers };
  } catch {
    return { offers: [] };
  }
}
