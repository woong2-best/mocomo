import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import {
  AUCTION_BID_DEPOSIT_MOCO,
  AUCTION_BID_DEPOSIT_USD,
  AUCTION_MIN_WALLET_MOCO,
  AUCTION_MOCO_USD_VALUE,
  canParticipateInAuction,
  getMocoBalanceSnapshot,
  getSellerHarmScoreTotal,
} from "@/lib/auction-deposit";

/** GET — 모바일 경매 보증금 잔액·활성 동결 상태 */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-auction-deposit", 60);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const userId = auth.user.id;
  const listingId = req.nextUrl.searchParams.get("listingId")?.trim();

  const [balance, harmScoreTotal, activeDeposits, listingDeposit] = await Promise.all([
    getMocoBalanceSnapshot(userId),
    getSellerHarmScoreTotal(userId),
    db.auctionDeposit.findMany({
      where: { userId, status: "LOCKED" },
      orderBy: { lockedAt: "desc" },
      take: 20,
      select: {
        id: true,
        listingId: true,
        amountMoco: true,
        status: true,
        lockedAt: true,
        listing: { select: { title: true } },
      },
    }),
    listingId
      ? db.auctionDeposit.findFirst({
          where: { userId, listingId, status: "LOCKED" },
          select: { id: true, amountMoco: true, lockedAt: true, status: true },
        })
      : Promise.resolve(null),
  ]);

  return NextResponse.json({
    depositRequiredMoco: AUCTION_BID_DEPOSIT_MOCO,
    depositRequiredUsd: AUCTION_BID_DEPOSIT_USD,
    minWalletMoco: AUCTION_MIN_WALLET_MOCO,
    canParticipate: canParticipateInAuction(balance),
    mocoUsdValue: AUCTION_MOCO_USD_VALUE,
    availableMocoBalance: balance.availableMocoBalance,
    lockedMocoBalance: balance.lockedMocoBalance,
    sellerHarmScoreTotal: harmScoreTotal,
    activeDeposits: activeDeposits.map((d) => ({
      id: d.id,
      listingId: d.listingId,
      listingTitle: d.listing.title,
      amountMoco: d.amountMoco,
      status: d.status,
      lockedAt: d.lockedAt.toISOString(),
    })),
    listingDeposit: listingDeposit
      ? {
          id: listingDeposit.id,
          amountMoco: listingDeposit.amountMoco,
          status: listingDeposit.status,
          lockedAt: listingDeposit.lockedAt.toISOString(),
        }
      : null,
  });
}
