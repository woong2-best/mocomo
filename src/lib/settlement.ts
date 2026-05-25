import { db } from "@/lib/db";
import type { LedgerEntryType, Prisma } from "@prisma/client";
import { calcPlatformFee } from "@/lib/utils";

export const MIN_PAYOUT_KRW = Number(process.env.MIN_PAYOUT_KRW ?? 10_000);
export const PLATFORM_FEE_RATE = 0.1;

export async function ensureWallet(userId: string) {
  return db.wallet.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

async function appendLedger(
  tx: Prisma.TransactionClient,
  data: {
    userId?: string | null;
    type: LedgerEntryType;
    amount: number;
    balanceAfter?: number | null;
    referenceType?: string;
    referenceId?: string;
    paymentIntentId?: string;
    memo?: string;
  }
) {
  return tx.ledgerEntry.create({ data });
}

/** 판매자/크리에이터 지갑 적립 */
export async function creditSellerEarning(
  userId: string,
  amount: number,
  opts: {
    referenceType: string;
    referenceId: string;
    paymentIntentId?: string;
    memo?: string;
  }
) {
  if (amount <= 0) return;
  await db.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId },
      create: { userId, availableBalance: amount, totalEarned: amount },
      update: {
        availableBalance: { increment: amount },
        totalEarned: { increment: amount },
      },
    });
    await appendLedger(tx, {
      userId,
      type: "SELLER_EARNING",
      amount,
      balanceAfter: wallet.availableBalance,
      ...opts,
    });
  });
}

/** 플랫폼 수수료·프리미엄·등록비 등 운영 수익 (장부만, 실입금은 토스 정산) */
export async function recordPlatformFee(
  amount: number,
  opts: {
    referenceType: string;
    referenceId: string;
    paymentIntentId?: string;
    memo?: string;
  }
) {
  if (amount <= 0) return;
  await db.ledgerEntry.create({
    data: {
      userId: null,
      type: "PLATFORM_FEE",
      amount,
      referenceType: opts.referenceType,
      referenceId: opts.referenceId,
      paymentIntentId: opts.paymentIntentId,
      memo: opts.memo,
    },
  });
}

/** 결제 총액 감사 로그 */
export async function recordPaymentGross(
  amount: number,
  paymentIntentId: string,
  memo: string
) {
  await db.ledgerEntry.create({
    data: {
      userId: null,
      type: "PAYMENT_GROSS",
      amount,
      paymentIntentId,
      referenceType: "payment_intent",
      referenceId: paymentIntentId,
      memo,
    },
  });
}

export function splitPlatformFee(gross: number) {
  const platformFee = calcPlatformFee(gross, PLATFORM_FEE_RATE);
  const sellerAmount = gross - platformFee;
  return { platformFee, sellerAmount };
}

export async function getWalletSummary(userId: string) {
  try {
    const wallet = await db.wallet.findUnique({ where: { userId } });
    const bank = await db.bankAccount.findUnique({ where: { userId } });
    const pendingPayout = await db.payoutRequest.aggregate({
      where: { userId, status: { in: ["PENDING", "APPROVED"] } },
      _sum: { amount: true },
    });
    const recent = await db.ledgerEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return {
      availableBalance: wallet?.availableBalance ?? 0,
      totalEarned: wallet?.totalEarned ?? 0,
      totalWithdrawn: wallet?.totalWithdrawn ?? 0,
      pendingPayout: pendingPayout._sum.amount ?? 0,
      bank,
      recent,
    };
  } catch {
    return {
      availableBalance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      pendingPayout: 0,
      bank: null,
      recent: [],
    };
  }
}

export async function getPlatformFinanceStats() {
  try {
    const [platformFees, gross, pendingPayouts, paidIntents] = await Promise.all([
      db.ledgerEntry.aggregate({
        where: { type: "PLATFORM_FEE" },
        _sum: { amount: true },
      }),
      db.ledgerEntry.aggregate({
        where: { type: "PAYMENT_GROSS" },
        _sum: { amount: true },
      }),
      db.payoutRequest.aggregate({
        where: { status: { in: ["PENDING", "APPROVED"] } },
        _sum: { amount: true },
        _count: true,
      }),
      db.paymentIntent.count({ where: { status: "PAID" } }),
    ]);
    const sellerLiabilities = await db.wallet.aggregate({ _sum: { availableBalance: true } });
    return {
      totalGross: gross._sum.amount ?? 0,
      platformRevenue: platformFees._sum.amount ?? 0,
      sellerBalances: sellerLiabilities._sum.availableBalance ?? 0,
      pendingPayoutAmount: pendingPayouts._sum.amount ?? 0,
      pendingPayoutCount: pendingPayouts._count,
      paidPaymentCount: paidIntents,
    };
  } catch {
    return {
      totalGross: 0,
      platformRevenue: 0,
      sellerBalances: 0,
      pendingPayoutAmount: 0,
      pendingPayoutCount: 0,
      paidPaymentCount: 0,
    };
  }
}
