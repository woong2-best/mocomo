"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { assertUsedMarketAccess } from "@/lib/used-market-access";
import { sendUsedAuctionNotification } from "@/lib/used-auction-notify";
import { formatUsedPrice, maxUsedListingPrice } from "@/lib/used-market";

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

  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.auctionState !== "PRICE_NEGOTIATION") {
    return { error: "actions.sjyqady" };
  }

  const price = Math.floor(amount);
  if (!Number.isFinite(price) || price <= 0 || price > maxUsedListingPrice(listing.currency)) {
    return { error: "actions.s4api9p" };
  }
  if (!isNegotiationParticipant(listing, user.id)) {
    return { error: "actions.st3onev" };
  }
  if (!listing.activeNegotiationRoomId) {
    return { error: "actions.s14bligm" };
  }
  if (listing.negotiationDueAt && listing.negotiationDueAt.getTime() < Date.now()) {
    return { error: "actions.s2db9e9" };
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
      content: t("actions.s18wizt0", { v0: formatUsedPrice(price, listing.currency) }),
    },
  });
  await db.chatRoom.update({
    where: { id: listing.activeNegotiationRoomId },
    data: { updatedAt: new Date() },
  });

  await sendUsedAuctionNotification({
    userId: otherId,
    type: "price_offer",
    title: t("actions.sxwvteq"),
    body: `${listing.title} · ${formatUsedPrice(price, listing.currency)}`,
    link,
    actorId: user.id,
  });

  revalidatePath(`/market/${listingId}`);
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
    return { error: "actions.s489u0p" };
  }
  const listing = offer.listing;
  if (listing.auctionState !== "PRICE_NEGOTIATION") {
    return { error: "actions.sd121ao" };
  }
  if (!isNegotiationParticipant(listing, user.id)) {
    return { error: "actions.st3onev" };
  }
  if (offer.proposerId === user.id) {
    return { error: "actions.s1w3upmy" };
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
      content: t("actions.s14y13cc", { v0: formatUsedPrice(offer.amount, listing.currency) }),
    },
  });

  await sendUsedAuctionNotification({
    userId: offer.proposerId,
    type: "price_accept",
    title: t("actions.s1j1igxo"),
    body: `${listing.title} · ${formatUsedPrice(offer.amount, listing.currency)}`,
    link,
    actorId: user.id,
  });

  revalidatePath(`/market/${listing.id}`);
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
  if (!offer || offer.status !== "PENDING") return { error: "actions.s489u0p" };
  if (!isNegotiationParticipant(offer.listing, user.id)) return { error: "actions.st3onev" };
  if (offer.proposerId === user.id) return { error: "actions.s1eyjtyv" };

  await db.usedPriceOffer.update({
    where: { id: offerId },
    data: { status: "REJECTED" },
  });

  await db.message.create({
    data: {
      roomId: offer.roomId,
      senderId: user.id,
      content: t("actions.s1hhfdn5", { v0: formatUsedPrice(offer.amount, offer.listing.currency) }),
    },
  });

  await sendUsedAuctionNotification({
    userId: offer.proposerId,
    type: "price_reject",
    title: t("actions.sxwujpx"),
    body: offer.listing.title,
    link: `/messages/${offer.roomId}?usedListing=${offer.listingId}`,
    actorId: user.id,
  });

  revalidatePath(`/market/${offer.listingId}`);
  return { success: true };
}

/** 거래 거절 (차순위 입찰자) */
export async function declineUsedAuctionNegotiation(listingId: string) {
  const user = await requireAuth();
  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.auctionState !== "PRICE_NEGOTIATION") {
    return { error: "actions.s1cyzlot" };
  }
  if (listing.negotiationBuyerId !== user.id) {
    return { error: "actions.s102fc5s" };
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

  revalidatePath(`/market/${listingId}`);
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
