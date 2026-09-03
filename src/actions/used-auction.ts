"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  isAuctionLive,
  reserveMet,
} from "@/lib/used-auction";
import { sendUsedAuctionNotification } from "@/lib/used-auction-notify";
import { formatUsedPrice, normalizeUsedCurrency } from "@/lib/used-market";
import { assertUsedMarketAccess } from "@/lib/used-market-access";
import { assertUsedAdultForRestricted } from "@/lib/used-youth-protection";
import {
  getUsedAuctionConfig,
  runAuctionLifecycleBatch,
} from "@/lib/used-auction-lifecycle";
import { executeUsedAuctionBid } from "@/lib/used-auction-bid-core";
import {
  onAuctionEndedVoidHolds,
  validateWinningBidCapturable,
} from "@/lib/used-auction-bid-hold";
import { finalizeUsedAuctionWinner, activateUsedAuctionStripeOrder } from "@/lib/used-auction-marketplace-order";

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
      const amount = finalBid ?? listing.price;
      const captureCheck = validateWinningBidCapturable(
        amount,
        normalizeUsedCurrency(listing.currency)
      );
      if (captureCheck) {
        await db.usedListing.update({
          where: { id: listingId },
          data: { auctionState: "ENDED", status: "SELLING" },
        });
        await onAuctionEndedVoidHolds(listingId, null);
        await sendUsedAuctionNotification({
          userId: listing.sellerId,
          type: "ended",
          title: "경매 유찰 (낙찰가 미달)",
          body: captureCheck.error,
          link: `/used/${listingId}`,
        });
        revalidatePath(`/used/${listingId}`);
        return;
      }

      const config = await getUsedAuctionConfig();
      await finalizeUsedAuctionWinner({
        listingId,
        winnerId,
        amount,
        title: listing.title,
        currency: listing.currency,
        paymentDeadlineHours: config.paymentDeadlineHours,
      });
    } else {
      await onAuctionEndedVoidHolds(listingId, null);
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

/** 크론·배치 — 만료된 경매 일괄 마감 + 결제·협상 타임아웃 */
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
    const lifecycle = await runAuctionLifecycleBatch(take);
    return { processed: rows.length, ...lifecycle };
  } catch {
    return { processed: 0, paymentTimeouts: 0, negotiationTimeouts: 0, reminders: 0 };
  }
}

export async function placeUsedAuctionBid(
  listingId: string,
  amount: number,
  termsAccepted?: boolean,
  opts?: { paymentIntentDbId?: string | null }
) {
  const user = await requireAuth();
  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  try {
    await finalizeExpiredAuctionIfNeeded(listingId);

    const listing = await db.usedListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.saleType !== "AUCTION") {
      return { error: "경매 상품이 아닙니다." };
    }
    const adultErr = assertUsedAdultForRestricted(
      user,
      listing.restrictedKind ?? "NONE"
    );
    if (adultErr) return { error: adultErr, needsAdultVerify: true as const };

    const result = await executeUsedAuctionBid({
      userId: user.id,
      listingId,
      bidAmount: amount,
      termsAccepted: termsAccepted === true,
      paymentIntentDbId: opts?.paymentIntentDbId,
    });

    if ("error" in result) {
      return result;
    }

    const link = `/used/${listingId}`;
    await sendUsedAuctionNotification({
      userId: listing.sellerId,
      type: "bid",
      title: "새 입찰",
      body: `${listing.title} · ${formatUsedPrice(result.amount, listing.currency)}`,
      link,
      actorId: user.id,
    });

    const prevBidderId = listing.currentBidderId;
    if (prevBidderId && prevBidderId !== user.id) {
      await sendUsedAuctionNotification({
        userId: prevBidderId,
        type: "outbid",
        title: "입찰 갱신됨",
        body: `${listing.title} · ${formatUsedPrice(result.amount, listing.currency)}`,
        link,
        actorId: user.id,
      });
    }

    const freshListing = await db.usedListing.findUnique({ where: { id: listingId } });
    if (
      freshListing?.auctionState === "TRANSFERRED_TO_NEXT_BIDDER" &&
      freshListing.winningBidderId === user.id &&
      !freshListing.marketplaceOrderId &&
      opts?.paymentIntentDbId
    ) {
      const activated = await activateUsedAuctionStripeOrder(listingId, user.id);
      if ("ok" in activated && activated.ok) {
        revalidatePath(`/used/${listingId}`);
        revalidatePath("/used");
        revalidatePath(`/market/orders/${activated.orderId}`);
        return {
          success: true,
          amount: result.amount,
          extended: result.extended,
          orderId: activated.orderId,
        };
      }
    }

    revalidatePath(`/used/${listingId}`);
    revalidatePath("/used");
    return { success: true, amount: result.amount, extended: result.extended };
  } catch (e) {
    console.error("[placeUsedAuctionBid]", e);
    return { error: "입찰에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

export async function buyNowUsedAuction(listingId: string, termsAccepted?: boolean) {
  const user = await requireAuth();
  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  if (!termsAccepted) {
    return { error: "즉시구매 전 결제 의무 및 이용 제한 안내에 동의해 주세요." };
  }

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
    const adultErr = assertUsedAdultForRestricted(
      user,
      listing.restrictedKind ?? "NONE"
    );
    if (adultErr) return { error: adultErr, needsAdultVerify: true as const };

    const buyNow = listing.buyNowPrice;
    if (buyNow == null || buyNow <= 0) {
      return { error: "즉시구매가가 설정되지 않았습니다." };
    }

    await db.$transaction(async (tx) => {
      await tx.usedAuctionBid.create({
        data: {
          listingId,
          bidderId: user.id,
          amount: buyNow,
          termsAcceptedAt: new Date(),
        },
      });
      await tx.usedListing.update({
        where: { id: listingId },
        data: {
          currentBidAmount: buyNow,
          currentBidderId: user.id,
          bidCount: { increment: 1 },
          auctionState: "ENDED",
          auctionEndsAt: new Date(),
        },
      });
    });

    const config = await getUsedAuctionConfig();
    await onAuctionEndedVoidHolds(listingId, user.id);
    await finalizeUsedAuctionWinner({
      listingId,
      winnerId: user.id,
      amount: buyNow,
      title: listing.title,
      currency: listing.currency,
      paymentDeadlineHours: config.paymentDeadlineHours,
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

export async function getMyUsedAuctionBids(userId: string) {
  try {
    const bids = await db.usedAuctionBid.findMany({
      where: { bidderId: userId },
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
