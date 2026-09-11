/**
 * 경매 입찰 보증금 — MOCO 동결·환불·몰수
 * availableMocoBalance = PlatformWallet.mocoPoints
 * lockedMocoBalance    = PlatformWallet.lockedMocoBalance
 */

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getOrCreatePlatformWallet } from "@/lib/platform/wallet/service";
import { isListingBidHoldEnabled } from "@/lib/used-auction-bid-hold";
import {
  AUCTION_BID_DEPOSIT_MOCO,
  AUCTION_DEPOSIT_SOURCE_FORFEIT,
  AUCTION_DEPOSIT_USD_CENTS_PER_MOCO,
  INSUFFICIENT_DEPOSIT_ERROR,
} from "@/lib/auction-deposit/constants";

type Tx = Prisma.TransactionClient;

export type MocoBalanceSnapshot = {
  availableMocoBalance: number;
  lockedMocoBalance: number;
};

export async function getMocoBalanceSnapshot(userId: string): Promise<MocoBalanceSnapshot> {
  const wallet = await getOrCreatePlatformWallet(userId);
  return {
    availableMocoBalance: wallet.mocoPoints,
    lockedMocoBalance: wallet.lockedMocoBalance,
  };
}

export async function isMocoBidDepositRequired(listing: {
  depositEnabled: boolean;
}): Promise<boolean> {
  return isListingBidHoldEnabled(listing);
}

async function appendDepositLedger(
  tx: Tx,
  input: {
    walletId: string;
    bucket: "MOCO_POINTS" | "MOCO_LOCKED";
    delta: number;
    balanceAfter: number;
    reason: string;
    referenceType: string;
    referenceId: string;
    metadata?: Record<string, unknown>;
  }
) {
  await tx.platformWalletLedger.create({
    data: {
      walletId: input.walletId,
      bucket: input.bucket,
      delta: input.delta,
      balanceAfter: input.balanceAfter,
      reason: input.reason,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

/** 트랜잭션 내부 환원 — 동일 listing 재입찰 시 이중 동결 방지 */
async function refundLockedDepositInTransaction(tx: Tx, depositId: string, note: string) {
  const deposit = await tx.auctionDeposit.findUnique({ where: { id: depositId } });
  if (!deposit || deposit.status !== "LOCKED") return;

  const statusUpdated = await tx.auctionDeposit.updateMany({
    where: { id: depositId, status: "LOCKED" },
    data: { status: "REFUNDED", resolvedAt: new Date(), resolutionNote: note },
  });
  if (statusUpdated.count === 0) return;

  const wallet = await tx.platformWallet.findUnique({ where: { userId: deposit.userId } });
  if (!wallet) return;

  await tx.platformWallet.updateMany({
    where: { id: wallet.id, lockedMocoBalance: { gte: deposit.amountMoco } },
    data: {
      lockedMocoBalance: { decrement: deposit.amountMoco },
      mocoPoints: { increment: deposit.amountMoco },
    },
  });
}

/** 입찰 트랜잭션 내부 — available → locked 이동 + AuctionDeposit(LOCKED) 생성 */
export async function lockBidDepositInTransaction(
  tx: Tx,
  input: {
    userId: string;
    listingId: string;
    bidId: string;
    amountMoco?: number;
  }
): Promise<void> {
  const amountMoco = input.amountMoco ?? AUCTION_BID_DEPOSIT_MOCO;

  const priorLocked = await tx.auctionDeposit.findFirst({
    where: { userId: input.userId, listingId: input.listingId, status: "LOCKED" },
    select: { id: true },
  });
  if (priorLocked) {
    await refundLockedDepositInTransaction(tx, priorLocked.id, "rebidding_same_listing");
  }

  const wallet =
    (await tx.platformWallet.findUnique({ where: { userId: input.userId } })) ??
    (await tx.platformWallet.create({ data: { userId: input.userId } }));

  const moved = await tx.platformWallet.updateMany({
    where: {
      id: wallet.id,
      mocoPoints: { gte: amountMoco },
    },
    data: {
      mocoPoints: { decrement: amountMoco },
      lockedMocoBalance: { increment: amountMoco },
    },
  });
  if (moved.count === 0) throw new Error("INSUFFICIENT_DEPOSIT");

  const updated = await tx.platformWallet.findUniqueOrThrow({ where: { id: wallet.id } });

  await tx.auctionDeposit.create({
    data: {
      userId: input.userId,
      listingId: input.listingId,
      bidId: input.bidId,
      amountMoco,
      status: "LOCKED",
    },
  });

  const lockRef = `auction_deposit_lock:${input.bidId}`;
  await appendDepositLedger(tx, {
    walletId: wallet.id,
    bucket: "MOCO_POINTS",
    delta: -amountMoco,
    balanceAfter: updated.mocoPoints,
    reason: "경매 입찰 보증금 동결",
    referenceType: "auction_deposit_lock",
    referenceId: lockRef,
    metadata: { listingId: input.listingId, bidId: input.bidId },
  });
  await appendDepositLedger(tx, {
    walletId: wallet.id,
    bucket: "MOCO_LOCKED",
    delta: amountMoco,
    balanceAfter: updated.lockedMocoBalance,
    reason: "경매 입찰 보증금 동결",
    referenceType: "auction_deposit_lock",
    referenceId: lockRef,
    metadata: { listingId: input.listingId, bidId: input.bidId },
  });
}

/** LOCKED → REFUNDED — locked → available 환원 (멱등) */
export async function refundAuctionDeposit(
  depositId: string,
  note?: string
): Promise<{ refunded: boolean }> {
  return db.$transaction(async (tx) => {
    const deposit = await tx.auctionDeposit.findUnique({ where: { id: depositId } });
    if (!deposit || deposit.status !== "LOCKED") return { refunded: false };

    const statusUpdated = await tx.auctionDeposit.updateMany({
      where: { id: depositId, status: "LOCKED" },
      data: {
        status: "REFUNDED",
        resolvedAt: new Date(),
        resolutionNote: note ?? null,
      },
    });
    if (statusUpdated.count === 0) return { refunded: false };

    const wallet = await tx.platformWallet.findUnique({ where: { userId: deposit.userId } });
    if (!wallet) return { refunded: false };

    const balanceUpdated = await tx.platformWallet.updateMany({
      where: {
        id: wallet.id,
        lockedMocoBalance: { gte: deposit.amountMoco },
      },
      data: {
        lockedMocoBalance: { decrement: deposit.amountMoco },
        mocoPoints: { increment: deposit.amountMoco },
      },
    });
    if (balanceUpdated.count === 0) {
      throw new Error("REFUND_BALANCE_MISMATCH");
    }

    const updated = await tx.platformWallet.findUniqueOrThrow({ where: { id: wallet.id } });
    const refundRef = `auction_deposit_refund:${depositId}`;

    await appendDepositLedger(tx, {
      walletId: wallet.id,
      bucket: "MOCO_LOCKED",
      delta: -deposit.amountMoco,
      balanceAfter: updated.lockedMocoBalance,
      reason: "경매 입찰 보증금 환원",
      referenceType: "auction_deposit_refund",
      referenceId: refundRef,
      metadata: { listingId: deposit.listingId, depositId },
    });
    await appendDepositLedger(tx, {
      walletId: wallet.id,
      bucket: "MOCO_POINTS",
      delta: deposit.amountMoco,
      balanceAfter: updated.mocoPoints,
      reason: "경매 입찰 보증금 환원",
      referenceType: "auction_deposit_refund",
      referenceId: refundRef,
      metadata: { listingId: deposit.listingId, depositId },
    });

    return { refunded: true };
  });
}

/** listing + bidder 기준 활성(LOCKED) 보증금 환원 */
export async function refundActiveDepositForBidder(
  listingId: string,
  bidderId: string,
  note?: string
): Promise<void> {
  const deposit = await db.auctionDeposit.findFirst({
    where: { listingId, userId: bidderId, status: "LOCKED" },
    orderBy: { lockedAt: "desc" },
    select: { id: true },
  });
  if (!deposit) return;
  await refundAuctionDeposit(deposit.id, note);
}

/** 경매 종료 — 낙찰자 제외 전원 환원 */
/** 경매 종료 시 — 낙찰자 제외 비낙찰자 보증금 환원 (Stripe hold void 와 동일 타이밍) */
export async function onAuctionEndedReleaseDeposits(
  listingId: string,
  winnerId: string | null
): Promise<number> {
  return releaseAllListingDepositsExcept(
    listingId,
    winnerId,
    winnerId ? "auction_ended_non_winner" : "auction_unsold"
  );
}

export async function releaseAllListingDepositsExcept(
  listingId: string,
  exceptUserId?: string | null,
  note?: string
): Promise<number> {
  const deposits = await db.auctionDeposit.findMany({
    where: {
      listingId,
      status: "LOCKED",
      ...(exceptUserId ? { userId: { not: exceptUserId } } : {}),
    },
    select: { id: true },
  });
  let count = 0;
  for (const d of deposits) {
    const result = await refundAuctionDeposit(d.id, note);
    if (result.refunded) count += 1;
  }
  return count;
}

/** 낙찰자 결제 완료 시 보증금 환원 */
export async function refundWinnerDepositOnPaymentComplete(
  listingId: string,
  winnerId: string
): Promise<void> {
  await refundActiveDepositForBidder(listingId, winnerId, "payment_completed");
}

/**
 * 노쇼·결제 거부 — LOCKED → FORFEITED
 * - 몰수 MOCO → PlatformPenaltyRevenue (판매자 직접 이전 금지)
 * - 판매자 → SellerHarmScore (1 MOCO = 1 스코어, 현금 인출 불가)
 */
export async function forfeitWinnerDeposit(input: {
  listingId: string;
  winnerId: string;
  sellerId: string;
  note?: string;
}): Promise<{ forfeited: boolean }> {
  return db.$transaction(async (tx) => {
    const deposit = await tx.auctionDeposit.findFirst({
      where: {
        listingId: input.listingId,
        userId: input.winnerId,
        status: "LOCKED",
      },
      orderBy: { lockedAt: "desc" },
    });
    if (!deposit) return { forfeited: false };

    const statusUpdated = await tx.auctionDeposit.updateMany({
      where: { id: deposit.id, status: "LOCKED" },
      data: {
        status: "FORFEITED",
        resolvedAt: new Date(),
        resolutionNote: input.note ?? "payment_timeout",
      },
    });
    if (statusUpdated.count === 0) return { forfeited: false };

    const wallet = await tx.platformWallet.findUnique({ where: { userId: deposit.userId } });
    if (!wallet) return { forfeited: false };

    const balanceUpdated = await tx.platformWallet.updateMany({
      where: {
        id: wallet.id,
        lockedMocoBalance: { gte: deposit.amountMoco },
      },
      data: {
        lockedMocoBalance: { decrement: deposit.amountMoco },
      },
    });
    if (balanceUpdated.count === 0) {
      throw new Error("FORFEIT_BALANCE_MISMATCH");
    }

    const updated = await tx.platformWallet.findUniqueOrThrow({ where: { id: wallet.id } });
    const forfeitRef = `auction_deposit_forfeit:${deposit.id}`;

    await appendDepositLedger(tx, {
      walletId: wallet.id,
      bucket: "MOCO_LOCKED",
      delta: -deposit.amountMoco,
      balanceAfter: updated.lockedMocoBalance,
      reason: "경매 입찰 보증금 몰수",
      referenceType: "auction_deposit_forfeit",
      referenceId: forfeitRef,
      metadata: { listingId: input.listingId, depositId: deposit.id },
    });

    const existingPenalty = await tx.platformPenaltyRevenue.findUnique({
      where: { sourceId: deposit.id },
    });
    if (!existingPenalty) {
      await tx.platformPenaltyRevenue.create({
        data: {
          amountMoco: deposit.amountMoco,
          usdValueCents: deposit.amountMoco * AUCTION_DEPOSIT_USD_CENTS_PER_MOCO,
          sourceType: AUCTION_DEPOSIT_SOURCE_FORFEIT,
          sourceId: deposit.id,
          listingId: input.listingId,
          forfeitingUserId: input.winnerId,
        },
      });
    }

    const harmKey = {
      sourceType: AUCTION_DEPOSIT_SOURCE_FORFEIT,
      sourceId: deposit.id,
      sellerId: input.sellerId,
    };
    const existingHarm = await tx.sellerHarmScore.findUnique({
      where: { sourceType_sourceId_sellerId: harmKey },
    });
    if (!existingHarm) {
      await tx.sellerHarmScore.create({
        data: {
          sellerId: input.sellerId,
          amountMoco: deposit.amountMoco,
          sourceType: AUCTION_DEPOSIT_SOURCE_FORFEIT,
          sourceId: deposit.id,
          listingId: input.listingId,
          buyerId: input.winnerId,
        },
      });
    }

    return { forfeited: true };
  });
}

export async function getSellerHarmScoreTotal(sellerId: string): Promise<number> {
  const agg = await db.sellerHarmScore.aggregate({
    where: { sellerId },
    _sum: { amountMoco: true },
  });
  return agg._sum.amountMoco ?? 0;
}

export function mapDepositError(error: unknown): string | null {
  if (error instanceof Error && error.message === "INSUFFICIENT_DEPOSIT") {
    return INSUFFICIENT_DEPOSIT_ERROR;
  }
  return null;
}
