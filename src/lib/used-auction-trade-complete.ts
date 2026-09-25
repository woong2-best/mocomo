import { db } from "@/lib/db";
import { isAuctionLive } from "@/lib/used-auction";
import { refundActiveDepositForBidder } from "@/lib/auction-deposit";
import { finalizeUsedListingSold } from "@/lib/subculture-commerce/sale-records";

/** 판매자·낙찰자가 각각 거래 완료를 누르면, 둘 다 확인된 뒤 보증금 2 MOCO를 돌려준다. */
export async function confirmAuctionTradeComplete(userId: string, listingId: string) {
  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.saleType !== "AUCTION") {
    return { error: "경매 상품이 아닙니다." as const };
  }
  if (listing.status === "SOLD" || (listing.sellerTradeConfirmedAt && listing.buyerTradeConfirmedAt)) {
    return {
      success: true as const,
      completed: true,
      sellerConfirmed: true,
      buyerConfirmed: true,
    };
  }
  if (isAuctionLive(listing)) {
    return { error: "경매가 끝난 뒤에 거래 완료를 누를 수 있습니다." as const };
  }

  const winnerId = listing.winningBidderId ?? listing.currentBidderId;
  if (!winnerId) {
    return { error: "낙찰자가 없어 거래 완료를 할 수 없습니다." as const };
  }

  const isSeller = listing.sellerId === userId;
  const isWinner = winnerId === userId;
  if (!isSeller && !isWinner) {
    return { error: "판매자와 낙찰자만 거래 완료를 누를 수 있습니다." as const };
  }

  const now = new Date();
  const updated = await db.usedListing.update({
    where: { id: listingId },
    data: isSeller
      ? { sellerTradeConfirmedAt: listing.sellerTradeConfirmedAt ?? now }
      : { buyerTradeConfirmedAt: listing.buyerTradeConfirmedAt ?? now },
  });

  const sellerConfirmed = !!updated.sellerTradeConfirmedAt;
  const buyerConfirmed = !!updated.buyerTradeConfirmedAt;
  if (!sellerConfirmed || !buyerConfirmed) {
    return { success: true as const, completed: false, sellerConfirmed, buyerConfirmed };
  }

  const marked = await db.usedListing.updateMany({
    where: {
      id: listingId,
      status: { not: "SOLD" },
      sellerTradeConfirmedAt: { not: null },
      buyerTradeConfirmedAt: { not: null },
    },
    data: { status: "SOLD" },
  });

  if (marked.count > 0) {
    await refundActiveDepositForBidder(listingId, winnerId, "trade_completed");
    await refundActiveDepositForBidder(listingId, listing.sellerId, "trade_completed");
    void finalizeUsedListingSold(listingId).catch(() => undefined);
  }

  return { success: true as const, completed: true, sellerConfirmed: true, buyerConfirmed: true };
}
