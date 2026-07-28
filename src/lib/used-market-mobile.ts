import { db } from "@/lib/db";
import { assertUsedMarketAccess } from "@/lib/used-market-access";
import { assertUsedAdultForRestricted } from "@/lib/used-youth-protection";
import {
  extendedAuctionEndsAt,
  isAuctionLive,
  minNextBidAmount,
} from "@/lib/used-auction";
import { MAX_USED_LISTING_PRICE, MAX_USED_LISTING_PRICE_LABEL } from "@/lib/used-market";
import { finalizeExpiredAuctionIfNeeded } from "@/actions/used-auction";
import { sendUsedAuctionNotification } from "@/lib/used-auction-notify";
import { getOrCreateDmForUser, sendMobileDmMessage } from "@/lib/chat-dm-service";

const usedMarketUserSelect = {
  id: true,
  countryCode: true,
  phoneVerified: true,
  usedMarketBannedAt: true,
  adultVerifiedAt: true,
} as const;

async function loadUsedMarketUser(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: usedMarketUserSelect,
  });
}

export async function toggleMobileUsedFavorite(userId: string, listingId: string) {
  const existing = await db.usedFavorite.findUnique({
    where: { userId_listingId: { userId, listingId } },
  });
  if (existing) {
    await db.usedFavorite.delete({ where: { id: existing.id } });
    return { favorited: false as const };
  }
  await db.usedFavorite.create({ data: { userId, listingId } });
  return { favorited: true as const };
}

export async function startMobileUsedTradeChat(userId: string, listingId: string) {
  const user = await loadUsedMarketUser(userId);
  if (!user) return { error: "로그인이 필요합니다." as const };

  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    include: { seller: { select: { id: true, username: true } } },
  });
  if (!listing) return { error: "게시글을 찾을 수 없습니다." as const };
  if (listing.sellerId === userId) return { error: "본인 글에는 채팅할 수 없습니다." as const };
  if (listing.status === "SOLD") return { error: "이미 거래 완료된 상품입니다." as const };
  if (
    listing.saleType === "AUCTION" &&
    listing.auctionEndsAt &&
    listing.auctionEndsAt.getTime() > Date.now() &&
    listing.auctionState !== "ENDED"
  ) {
    return { error: "경매 진행 중에는 채팅 대신 입찰을 이용해 주세요." as const };
  }

  const adultErr = assertUsedAdultForRestricted(user, listing.restrictedKind ?? "NONE");
  if (adultErr) return { error: adultErr, needsAdultVerify: true as const };

  const dm = await getOrCreateDmForUser(userId, listing.sellerId);
  if ("error" in dm && dm.error) {
    return { error: dm.error, requiredTier: "requiredTier" in dm ? dm.requiredTier : undefined };
  }
  if (!("roomId" in dm) || !dm.roomId) return { error: "채팅방을 열 수 없습니다." as const };

  try {
    await db.usedListingChat.upsert({
      where: { listingId_buyerId: { listingId, buyerId: userId } },
      create: { listingId, roomId: dm.roomId, buyerId: userId },
      update: { roomId: dm.roomId },
    });
  } catch {
    /* optional table */
  }

  const priceText = listing.price === 0 ? "나눔" : `${listing.price.toLocaleString()}원`;
  const intro = `안녕하세요! 중고거래 문의합니다.\n\n상품: ${listing.title}\n가격: ${priceText}\n링크: /used/${listing.id}`;
  await sendMobileDmMessage(userId, { roomId: dm.roomId, content: intro }).catch(() => undefined);

  return { roomId: dm.roomId };
}

export async function placeMobileUsedAuctionBid(userId: string, listingId: string, amount: number) {
  const user = await loadUsedMarketUser(userId);
  if (!user) return { error: "로그인이 필요합니다." as const };

  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  const bidAmount = Math.floor(amount);
  if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
    return { error: "입찰가를 올바르게 입력해 주세요." as const };
  }
  if (bidAmount > MAX_USED_LISTING_PRICE) {
    return { error: `입찰가는 ${MAX_USED_LISTING_PRICE_LABEL} 이하입니다.` as const };
  }

  try {
    await finalizeExpiredAuctionIfNeeded(listingId);

    const listing = await db.usedListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.saleType !== "AUCTION") {
      return { error: "경매 상품이 아닙니다." as const };
    }
    if (listing.sellerId === userId) return { error: "본인 경매에는 입찰할 수 없습니다." as const };
    if (!isAuctionLive(listing)) {
      return { error: "마감된 경매입니다." as const };
    }
    const adultErr = assertUsedAdultForRestricted(user, listing.restrictedKind ?? "NONE");
    if (adultErr) return { error: adultErr, needsAdultVerify: true as const };

    const minBid = minNextBidAmount(listing);
    if (bidAmount < minBid) {
      return { error: `최소 입찰가는 ${minBid.toLocaleString()}원입니다.` as const };
    }
    if (listing.buyNowPrice != null && bidAmount >= listing.buyNowPrice) {
      return {
        error: `즉시구매가 ${listing.buyNowPrice.toLocaleString()}원입니다. 즉시구매를 이용해 주세요.` as const,
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
        data: { listingId, bidderId: userId, amount: bidAmount },
      });
      await tx.usedListing.update({
        where: { id: listingId },
        data: {
          currentBidAmount: bidAmount,
          currentBidderId: userId,
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
      actorId: userId,
    });
    if (prevBidderId && prevBidderId !== userId) {
      await sendUsedAuctionNotification({
        userId: prevBidderId,
        type: "outbid",
        title: "입찰 갱신됨",
        body: `${listing.title} · ${bidAmount.toLocaleString()}원`,
        link,
        actorId: userId,
      });
    }

    return { success: true as const, amount: bidAmount, extended: !!extendTo };
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "CLOSED") return { error: "마감된 경매입니다." as const };
      if (e.message === "LOW_BID") {
        const listing = await db.usedListing.findUnique({ where: { id: listingId } });
        if (listing) {
          return {
            error: `다른 분이 먼저 입찰했습니다. 최소 ${minNextBidAmount(listing).toLocaleString()}원 이상으로 입찰해 주세요.` as const,
          };
        }
      }
    }
    console.error("[placeMobileUsedAuctionBid]", e);
    return { error: "입찰에 실패했습니다. 잠시 후 다시 시도해 주세요." as const };
  }
}
