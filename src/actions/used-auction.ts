"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  extendedAuctionEndsAt,
  isAuctionLive,
  minNextBidAmount,
  reserveMet,
} from "@/lib/used-auction";
import { sendUsedAuctionNotification } from "@/lib/used-auction-notify";
import { MAX_USED_LISTING_PRICE, MAX_USED_LISTING_PRICE_LABEL } from "@/lib/used-market";
import {
  isUsedMarketEligible,
  USED_KR_ONLY_MSG,
  USED_PHONE_REQUIRED_MSG,
} from "@/lib/used-phone-auth";

function assertUsedMarketAccess(user: {
  countryCode: string;
  phoneVerified: Date | null;
}) {
  if (user.countryCode !== "KR") return USED_KR_ONLY_MSG;
  if (!isUsedMarketEligible(user)) return USED_PHONE_REQUIRED_MSG;
  return null;
}

/** 만료된 경매 마감 처리 (조회 시 호출) */
export async function finalizeExpiredAuctionIfNeeded(listingId: string) {
  try {
    const listing = await db.usedListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.saleType !== "AUCTION") return;
    if (listing.auctionState === "ENDED" || listing.auctionState === "CANCELLED") return;
    const end = listing.auctionEndsAt?.getTime();
    if (!end || end > Date.now()) return;
    if (listing.status !== "SELLING") {
      await db.usedListing.update({
        where: { id: listingId },
        data: { auctionState: "ENDED" },
      });
      return;
    }

    const finalBid = listing.currentBidAmount;
    const winnerId = listing.currentBidderId;
    const won = winnerId && reserveMet(finalBid, listing.reservePrice);

    if (won && winnerId) {
      await db.usedListing.update({
        where: { id: listingId },
        data: {
          auctionState: "ENDED",
          status: "RESERVED",
        },
      });
      await notifyAuctionWinner(listingId, winnerId).catch(() => {});
      const amount = finalBid ?? listing.price;
      await sendUsedAuctionNotification({
        userId: winnerId,
        type: "won",
        title: "경매 낙찰",
        body: `${listing.title} · ${amount.toLocaleString()}원`,
        link: `/used/${listingId}`,
      });
      await sendUsedAuctionNotification({
        userId: listing.sellerId,
        type: "ended",
        title: "경매 낙찰 완료",
        body: `${listing.title} · ${amount.toLocaleString()}원`,
        link: `/used/${listingId}`,
      });
    } else {
      await db.usedListing.update({
        where: { id: listingId },
        data: {
          auctionState: "ENDED",
          status: "SELLING",
        },
      });
      await sendUsedAuctionNotification({
        userId: listing.sellerId,
        type: "ended",
        title: listing.bidCount > 0 ? "경매 유찰" : "경매 종료 (입찰 없음)",
        body: listing.title,
        link: `/used/${listingId}`,
      });
    }
    revalidatePath(`/used/${listingId}`);
    revalidatePath("/used");
    revalidatePath("/used/my");
  } catch {
    /* 스키마 미적용 */
  }
}

/** 크론·배치 — 만료된 경매 일괄 마감 */
export async function finalizeAllExpiredAuctions(take = 50) {
  try {
    const rows = await db.usedListing.findMany({
      where: {
        saleType: "AUCTION",
        status: "SELLING",
        auctionEndsAt: { lte: new Date() },
        OR: [{ auctionState: "LIVE" }, { auctionState: null }],
      },
      select: { id: true },
      take,
    });
    for (const row of rows) {
      await finalizeExpiredAuctionIfNeeded(row.id);
    }
    return { processed: rows.length };
  } catch {
    return { processed: 0 };
  }
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

async function notifyAuctionWinner(listingId: string, winnerId: string) {
  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      title: true,
      price: true,
      currentBidAmount: true,
      sellerId: true,
    },
  });
  if (!listing) return;

  const roomId = await getOrCreateDmRoomBetween(listing.sellerId, winnerId);

  try {
    await db.usedListingChat.upsert({
      where: { listingId_buyerId: { listingId, buyerId: winnerId } },
      create: { listingId, roomId, buyerId: winnerId },
      update: { roomId },
    });
  } catch {
    /* optional table */
  }

  const amount = listing.currentBidAmount ?? listing.price;
  const priceText = amount === 0 ? "나눔" : `${amount.toLocaleString()}원`;
  const intro = `🎉 경매 낙찰 안내\n\n상품: ${listing.title}\n낙찰가: ${priceText}\n\n거래 일정을 채팅으로 조율해 주세요.\n링크: /used/${listing.id}`;
  await db.message.create({
    data: { roomId, senderId: listing.sellerId, content: intro },
  });
  await db.chatRoom.update({ where: { id: roomId }, data: { updatedAt: new Date() } });
}

export async function placeUsedAuctionBid(listingId: string, amount: number) {
  const user = await requireAuth();
  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  const bidAmount = Math.floor(amount);
  if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
    return { error: "입찰가를 올바르게 입력해 주세요." };
  }
  if (bidAmount > MAX_USED_LISTING_PRICE) {
    return { error: `입찰가는 ${MAX_USED_LISTING_PRICE_LABEL} 이하입니다.` };
  }

  try {
    await finalizeExpiredAuctionIfNeeded(listingId);

    const listing = await db.usedListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.saleType !== "AUCTION") {
      return { error: "경매 상품이 아닙니다." };
    }
    if (listing.sellerId === user.id) return { error: "본인 경매에는 입찰할 수 없습니다." };
    if (!isAuctionLive(listing)) {
      return { error: "마감된 경매입니다." };
    }

    const minBid = minNextBidAmount(listing);
    if (bidAmount < minBid) {
      return { error: `최소 입찰가는 ${minBid.toLocaleString()}원입니다.` };
    }
    if (listing.buyNowPrice != null && bidAmount >= listing.buyNowPrice) {
      return {
        error: `즉시구매가 ${listing.buyNowPrice.toLocaleString()}원입니다. 즉시구매를 이용해 주세요.`,
      };
    }

    const endsAt = listing.auctionEndsAt!;
    const prevBidderId = listing.currentBidderId;
    const extendTo = extendedAuctionEndsAt(
      endsAt,
      listing.antiSnipeMinutes,
      listing.auctionExtensionCount ?? 0
    );

    await db.$transaction(async (tx) => {
      const fresh = await tx.usedListing.findUnique({ where: { id: listingId } });
      if (!fresh || !isAuctionLive(fresh)) {
        throw new Error("CLOSED");
      }
      const minFresh = minNextBidAmount(fresh);
      if (bidAmount < minFresh) throw new Error("LOW_BID");

      await tx.usedAuctionBid.create({
        data: { listingId, bidderId: user.id, amount: bidAmount },
      });
      await tx.usedListing.update({
        where: { id: listingId },
        data: {
          currentBidAmount: bidAmount,
          currentBidderId: user.id,
          bidCount: { increment: 1 },
          auctionState: "LIVE",
          ...(extendTo
            ? {
                auctionEndsAt: extendTo,
                auctionExtensionCount: { increment: 1 },
              }
            : {}),
        },
      });
    });

    const link = `/used/${listingId}`;
    await sendUsedAuctionNotification({
      userId: listing.sellerId,
      type: "bid",
      title: "새 입찰",
      body: `${listing.title} · ${bidAmount.toLocaleString()}원`,
      link,
    });
    if (prevBidderId && prevBidderId !== user.id) {
      await sendUsedAuctionNotification({
        userId: prevBidderId,
        type: "outbid",
        title: "입찰 갱신됨",
        body: `${listing.title} · ${bidAmount.toLocaleString()}원`,
        link,
      });
    }

    revalidatePath(`/used/${listingId}`);
    revalidatePath("/used");
    return { success: true, amount: bidAmount, extended: !!extendTo };
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "CLOSED") return { error: "마감된 경매입니다." };
      if (e.message === "LOW_BID") {
        const listing = await db.usedListing.findUnique({ where: { id: listingId } });
        if (listing) {
          return {
            error: `다른 분이 먼저 입찰했습니다. 최소 ${minNextBidAmount(listing).toLocaleString()}원 이상으로 입찰해 주세요.`,
          };
        }
      }
    }
    console.error("[placeUsedAuctionBid]", e);
    return { error: "입찰에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

export async function buyNowUsedAuction(listingId: string) {
  const user = await requireAuth();
  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  try {
    await finalizeExpiredAuctionIfNeeded(listingId);
    const listing = await db.usedListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.saleType !== "AUCTION") {
      return { error: "경매 상품이 아닙니다." };
    }
    if (listing.sellerId === user.id) return { error: "본인 상품은 구매할 수 없습니다." };
    if (!isAuctionLive(listing)) {
      return { error: "마감된 경매입니다." };
    }
    const buyNow = listing.buyNowPrice;
    if (buyNow == null || buyNow <= 0) {
      return { error: "즉시구매가가 설정되지 않았습니다." };
    }

    await db.$transaction(async (tx) => {
      await tx.usedAuctionBid.create({
        data: { listingId, bidderId: user.id, amount: buyNow },
      });
      await tx.usedListing.update({
        where: { id: listingId },
        data: {
          currentBidAmount: buyNow,
          currentBidderId: user.id,
          bidCount: { increment: 1 },
          auctionState: "ENDED",
          status: "RESERVED",
          auctionEndsAt: new Date(),
        },
      });
    });

    await notifyAuctionWinner(listingId, user.id).catch(() => {});
    const listingTitle = listing.title;
    await sendUsedAuctionNotification({
      userId: listing.sellerId,
      type: "buy_now",
      title: "즉시구매",
      body: `${listingTitle} · ${buyNow.toLocaleString()}원`,
      link: `/used/${listingId}`,
    });
    revalidatePath(`/used/${listingId}`);
    revalidatePath("/used");
    revalidatePath("/used/my");
    return { success: true, amount: buyNow };
  } catch (e) {
    console.error("[buyNowUsedAuction]", e);
    return { error: "즉시구매에 실패했습니다." };
  }
}

export async function getUsedAuctionBids(listingId: string, take = 30) {
  try {
    const rows = await db.usedAuctionBid.findMany({
      where: { listingId },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        bidder: { select: { id: true, username: true, image: true, name: true } },
      },
    });
    return { bids: rows };
  } catch {
    return { bids: [] };
  }
}

export async function getMyUsedAuctionBids() {
  const user = await requireAuth();
  try {
    const bids = await db.usedAuctionBid.findMany({
      where: { bidderId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      distinct: ["listingId"],
      include: {
        listing: {
          include: {
            seller: { select: { username: true } },
          },
        },
      },
    });
    return { bids };
  } catch {
    return { bids: [] };
  }
}

/** 판매자 — 입찰 없을 때만 경매 취소 */
export async function cancelUsedAuction(listingId: string) {
  const user = await requireAuth();
  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== user.id) return { error: "권한이 없습니다." };
  if (listing.saleType !== "AUCTION") return { error: "경매 상품이 아닙니다." };
  if ((listing.bidCount ?? 0) > 0) {
    return { error: "입찰이 있는 경매는 취소할 수 없습니다." };
  }

  await db.usedListing.update({
    where: { id: listingId },
    data: {
      auctionState: "CANCELLED",
      auctionEndsAt: null,
      saleType: "FIXED",
    },
  });
  revalidatePath(`/used/${listingId}`);
  revalidatePath("/used/my");
  return { success: true };
}
