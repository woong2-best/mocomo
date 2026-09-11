import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import {
  AUCTION_BID_DEPOSIT_MOCO,
  AUCTION_BID_DEPOSIT_USD,
  AUCTION_MOCO_USD_VALUE,
  getMocoBalanceSnapshot,
  getSellerHarmScoreTotal,
} from "@/lib/auction-deposit";

/** GET — 경매 보증금 잔액·활성 동결·피해 스코어 */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "auction-deposit-status", 60);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
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
