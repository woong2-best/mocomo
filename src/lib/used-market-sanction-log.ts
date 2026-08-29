import { db } from "@/lib/db";
import { USED_MARKET_BAN_MESSAGE } from "@/lib/used-market-access";
import { usedMarketSanctionRetainUntil } from "@/lib/used-auction-legal";

export async function recordAuctionPaymentTimeoutSanction(
  userId: string,
  listingId: string
): Promise<string | null> {
  try {
    const listing = await db.usedListing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        title: true,
        auctionEndsAt: true,
        paymentDueAt: true,
        currentBidAmount: true,
        price: true,
        winningBidderId: true,
      },
    });
    if (!listing) return null;

    const userBid = await db.usedAuctionBid.findFirst({
      where: { listingId, bidderId: userId },
      orderBy: [{ amount: "desc" }, { createdAt: "desc" }],
      select: {
        amount: true,
        createdAt: true,
        termsAcceptedAt: true,
      },
    });

    const now = new Date();
    const winningBidAmount = listing.currentBidAmount ?? listing.price;
    const reasonDetail = [
      USED_MARKET_BAN_MESSAGE,
      "",
      `상품: ${listing.title}`,
      `경매 마감: ${listing.auctionEndsAt?.toISOString() ?? "—"}`,
      `결제 기한: ${listing.paymentDueAt?.toISOString() ?? "—"}`,
      `제재 적용: ${now.toISOString()}`,
      `낙찰가: ${winningBidAmount}`,
      userBid
        ? `해당 이용자 최고 입찰: ${userBid.amount} (${userBid.createdAt.toISOString()})`
        : "해당 이용자 입찰 기록 없음",
      userBid?.termsAcceptedAt
        ? `입찰 동의 시각: ${userBid.termsAcceptedAt.toISOString()}`
        : "입찰 동의 시각: 기록 없음",
    ].join("\n");

    const log = await db.usedMarketSanctionLog.create({
      data: {
        userId,
        listingId,
        reason: "AUCTION_PAYMENT_TIMEOUT",
        reasonDetail,
        auctionEndsAt: listing.auctionEndsAt,
        paymentDueAt: listing.paymentDueAt,
        sanctionedAt: now,
        winningBidAmount,
        userHighestBidAt: userBid?.createdAt ?? null,
        userHighestBidAmount: userBid?.amount ?? null,
        bidTermsAcceptedAt: userBid?.termsAcceptedAt ?? null,
        retainUntil: usedMarketSanctionRetainUntil(now.getTime()),
      },
      select: { id: true },
    });

    return log.id;
  } catch (e) {
    console.error("[recordAuctionPaymentTimeoutSanction]", e);
    return null;
  }
}
