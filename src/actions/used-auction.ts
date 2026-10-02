"use server";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  isAuctionLive,
  reserveMet,
} from "@/lib/used-auction";
import { notifyAuctionLosers, notifyAuctionWatchers, sendUsedAuctionNotification } from "@/lib/used-auction-notify";
import { formatUsedPrice, normalizeUsedCurrency } from "@/lib/used-market";
import { assertUsedMarketAccess } from "@/lib/used-market-access";
import { assertUsedMarketTradeAccess } from "@/lib/used-market-locale-scope";
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
import { USED_AUCTION_RETIRED, USED_AUCTION_RETIRED_MSG } from "@/lib/retired-product-features";

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
          title: "actions.s9b5b2l",
          body: captureCheck.error,
          link: `/market/${listingId}`,
        });
        await notifyAuctionLosers({
          listingId,
          sellerId: listing.sellerId,
          winnerId: null,
          title: "actions.s1nlj8jt",
          body: t("actions.s3i00dq", { v0: listing.title }),
        });
        revalidatePath(`/market/${listingId}`);
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
      await notifyAuctionLosers({
        listingId,
        sellerId: listing.sellerId,
        winnerId,
        title: "actions.s1nlj8jt",
        body: t("actions.s1ttal0p", { v0: listing.title }),
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
        title: listing.bidCount > 0 ? "actions.s1nlj8jt" : "actions.s13pvn06",
        body: listing.title,
        link: `/market/${listingId}`,
      });
      if (listing.bidCount > 0) {
        await notifyAuctionLosers({
          listingId,
          sellerId: listing.sellerId,
          winnerId: null,
          title: "actions.s1nlj8jt",
          body: t("actions.s1g82v1c", { v0: listing.title }),
        });
      }
    }
    revalidatePath(`/market/${listingId}`);
    revalidatePath("/market");
    revalidatePath("/market/my");
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
  if (USED_AUCTION_RETIRED) return { error: USED_AUCTION_RETIRED_MSG };
  const user = await requireAuth();
  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  try {
    await finalizeExpiredAuctionIfNeeded(listingId);

    const listing = await db.usedListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.saleType !== "AUCTION") {
      return { error: "actions.s13bzg0h" };
    }
    const tradeErr = await assertUsedMarketTradeAccess({
      userId: user.id,
      buyerCountry: user.countryCode,
      listing,
    });
    if (tradeErr) return { error: tradeErr };
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

    const link = `/market/${listingId}`;
    const priceLabel = formatUsedPrice(result.amount, listing.currency);
    await sendUsedAuctionNotification({
      userId: listing.sellerId,
      type: "bid",
      title: "actions.socc6g3",
      body: `${listing.title} · ${priceLabel}`,
      link,
      actorId: user.id,
    });

    const prevBidderId = listing.currentBidderId;
    if (prevBidderId && prevBidderId !== user.id) {
      await sendUsedAuctionNotification({
        userId: prevBidderId,
        type: "outbid",
        title: "actions.s1cfgi5t",
        body: t("actions.s1sx1i50", { v0: listing.title, v1: priceLabel }),
        link,
        actorId: user.id,
      });
    }

    if (result.extended) {
      await notifyAuctionWatchers({
        listingId,
        sellerId: listing.sellerId,
        type: "extended",
        title: "actions.sfl40z8",
        body: t("actions.sg6zl9o", { v0: listing.title }),
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
        revalidatePath(`/market/${listingId}`);
        revalidatePath("/market");
        revalidatePath(`/market/orders/${activated.orderId}`);
        return {
          success: true,
          amount: result.amount,
          extended: result.extended,
          orderId: activated.orderId,
        };
      }
    }

    revalidatePath(`/market/${listingId}`);
    revalidatePath("/market");
    return { success: true, amount: result.amount, extended: result.extended };
  } catch (e) {
    console.error("[placeUsedAuctionBid]", e);
    return { error: "actions.sp4jlrg" };
  }
}

export async function buyNowUsedAuction(listingId: string, termsAccepted?: boolean) {
  const user = await requireAuth();
  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  if (!termsAccepted) {
    return { error: "actions.s1abxyv8" };
  }

  try {
    await finalizeExpiredAuctionIfNeeded(listingId);
    const listing = await db.usedListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.saleType !== "AUCTION") {
      return { error: "actions.s13bzg0h" };
    }
    if (listing.sellerId === user.id) return { error: "actions.suz2ksc" };
    const tradeErr = await assertUsedMarketTradeAccess({
      userId: user.id,
      buyerCountry: user.countryCode,
      listing,
    });
    if (tradeErr) return { error: tradeErr };
    if (!isAuctionLive(listing)) {
      return { error: "actions.s1n2ycjk" };
    }
    const adultErr = assertUsedAdultForRestricted(
      user,
      listing.restrictedKind ?? "NONE"
    );
    if (adultErr) return { error: adultErr, needsAdultVerify: true as const };

    const buyNow = listing.buyNowPrice;
    if (buyNow == null || buyNow <= 0) {
      return { error: "actions.s7l4arh" };
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
    await notifyAuctionLosers({
      listingId,
      sellerId: listing.sellerId,
      winnerId: user.id,
      title: "actions.stggiz5",
      body: t("actions.sselpvu", { v0: listing.title }),
    });
    revalidatePath(`/market/${listingId}`);
    revalidatePath("/market");
    revalidatePath("/market/my");
    return { success: true, amount: buyNow };
  } catch (e) {
    console.error("[buyNowUsedAuction]", e);
    return { error: "actions.s1r7pyee" };
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
  if (!listing || listing.sellerId !== user.id) return { error: "actions.st3onev" };
  if (listing.saleType !== "AUCTION") return { error: "actions.s13bzg0h" };
  if ((listing.bidCount ?? 0) > 0) {
    return { error: "actions.s1u7cgav" };
  }

  await db.usedListing.update({
    where: { id: listingId },
    data: {
      auctionState: "CANCELLED",
      auctionEndsAt: null,
      saleType: "FIXED",
    },
  });
  revalidatePath(`/market/${listingId}`);
  revalidatePath("/market/my");
  return { success: true };
}
