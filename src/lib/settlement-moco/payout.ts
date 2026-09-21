import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { createNotification } from "@/lib/notifications";
import {
  MIN_REWARD_PAYOUT_KRW,
  MIN_REWARD_PAYOUT_USD_CENTS,
} from "@/lib/settlement-moco/constants";
import { debitSettlementMocoForReward } from "@/lib/settlement-moco/economy";
import { achievedSettlementRewardTier } from "@/lib/settlement-moco/tier-config";
import { calcTierRewardAmount } from "@/lib/settlement-moco/tax";
import { checkCreatorRewardPayoutGate } from "@/lib/settlement-moco/payout-gate";
import {
  MAX_REWARD_TRANSFER_RETRIES,
  REWARD_BATCH_STATUS,
  REWARD_RETRYABLE_STATUSES,
} from "@/lib/settlement-moco/payout-status";

export type MonthlySettlementResult = {
  processed: number;
  skipped: number;
  failed: number;
  tierSkipped: number;
  retried: number;
};

type RewardAmountBreakdown = ReturnType<typeof calcTierRewardAmount>;

function currentMonthPeriod(now = new Date()) {
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

function meetsMinimum(amount: RewardAmountBreakdown): boolean {
  if (amount.currency === "krw") return amount.netMinor >= MIN_REWARD_PAYOUT_KRW;
  if (amount.currency === "usd") return amount.netMinor >= MIN_REWARD_PAYOUT_USD_CENTS;
  return amount.netMinor >= 100;
}

async function notifyRewardGateSkip(userId: string, skipReason: string) {
  await createNotification({
    userId,
    type: "system",
    title: "Reward 정산이 보류되었습니다",
    body: skipReason,
    link: "/wallet",
  }).catch(() => null);
}

async function executeRewardTransfer(input: {
  batchId: string;
  userId: string;
  accountId: string;
  netMinor: number;
  currency: string;
  year: number;
  month: number;
  achievedTier: string;
  deductedMoco: number;
  rolloverMoco: number;
  isRetry?: boolean;
}): Promise<"processed" | "failed"> {
  const stripe = getStripe();
  try {
    const transfer = await stripe.transfers.create({
      amount: input.netMinor,
      currency: input.currency,
      destination: input.accountId,
      metadata: {
        mocomoUserId: input.userId,
        rewardBatchId: input.batchId,
        period: `${input.year}-${String(input.month).padStart(2, "0")}`,
        type: "creator_reward",
        achievedTier: input.achievedTier,
        deductedMoco: String(input.deductedMoco),
        rolloverMoco: String(input.rolloverMoco),
      },
    });

    await db.creatorRewardPayoutBatch.update({
      where: { id: input.batchId },
      data: {
        status: REWARD_BATCH_STATUS.COMPLETED,
        stripeTransferId: transfer.id,
        completedAt: new Date(),
        errorMessage: null,
        skipReason: null,
        ...(input.isRetry
          ? { retryCount: { increment: 1 }, lastRetryAt: new Date() }
          : {}),
      },
    });
    return "processed";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Transfer failed";
    await db.creatorRewardPayoutBatch.update({
      where: { id: input.batchId },
      data: {
        status: REWARD_BATCH_STATUS.FAILED,
        errorMessage: msg,
        ...(input.isRetry
          ? { retryCount: { increment: 1 }, lastRetryAt: new Date() }
          : {}),
      },
    });
    return "failed";
  }
}

/**
 * 온보딩/세무 미비·Transfer 실패로 보류된 배치를 Transfer만 재시도
 * (earned MOCO는 최초 배치 생성 시 이미 차감됨)
 */
export async function reprocessHeldRewardBatches(opts?: {
  userId?: string;
  limit?: number;
}): Promise<{ retried: number; processed: number; failed: number; skipped: number }> {
  const result = { retried: 0, processed: 0, failed: 0, skipped: 0 };
  const batches = await db.creatorRewardPayoutBatch.findMany({
    where: {
      status: { in: [...REWARD_RETRYABLE_STATUSES] },
      stripeTransferId: null,
      netAmountMinor: { gt: 0 },
      ...(opts?.userId ? { userId: opts.userId } : {}),
      retryCount: { lt: MAX_REWARD_TRANSFER_RETRIES },
    },
    orderBy: { createdAt: "asc" },
    take: opts?.limit ?? 200,
  });

  for (const batch of batches) {
    result.retried++;
    const gate = await checkCreatorRewardPayoutGate(batch.userId);
    if (!gate.ok || !gate.accountId) {
      result.skipped++;
      await db.creatorRewardPayoutBatch.update({
        where: { id: batch.id },
        data: {
          status: gate.skipStatus ?? REWARD_BATCH_STATUS.SKIPPED_UNONBOARDED,
          skipReason: gate.skipReason,
          errorMessage: gate.skipReason,
          lastRetryAt: new Date(),
        },
      });
      continue;
    }

    const outcome = await executeRewardTransfer({
      batchId: batch.id,
      userId: batch.userId,
      accountId: gate.accountId,
      netMinor: batch.netAmountMinor,
      currency: batch.currency,
      year: batch.periodYear,
      month: batch.periodMonth,
      achievedTier: batch.achievedRewardTier ?? batch.achievedTier,
      deductedMoco: batch.deductedMoco,
      rolloverMoco: batch.rolloverMoco,
      isRetry: true,
    });
    if (outcome === "processed") result.processed++;
    else result.failed++;
  }

  return result;
}

export async function reprocessHeldRewardBatchesForUser(userId: string) {
  return reprocessHeldRewardBatches({ userId, limit: 24 });
}

/**
 * MonthlySettlementCron — 매월 1일 실행
 * 1) 보류 배치 재처리 → 2) earnedMoco 등급 산정 → requiredMoco 차감 → Reward Transfer
 */
export async function processMonthlySettlementCron(
  now = new Date()
): Promise<MonthlySettlementResult> {
  const { year, month } = currentMonthPeriod(now);
  const result: MonthlySettlementResult = {
    processed: 0,
    skipped: 0,
    failed: 0,
    tierSkipped: 0,
    retried: 0,
  };

  const held = await reprocessHeldRewardBatches();
  result.retried = held.retried;
  result.processed += held.processed;
  result.failed += held.failed;
  result.skipped += held.skipped;

  const wallets = await db.platformWallet.findMany({
    where: { settlementMocoPoints: { gt: 0 } },
    select: {
      userId: true,
      settlementMocoPoints: true,
      user: {
        select: {
          countryCode: true,
          creatorSettlementProfile: {
            select: { countryCode: true },
          },
        },
      },
    },
  });

  for (const wallet of wallets) {
    const existing = await db.creatorRewardPayoutBatch.findUnique({
      where: {
        userId_periodYear_periodMonth: {
          userId: wallet.userId,
          periodYear: year,
          periodMonth: month,
        },
      },
    });
    if (existing) {
      result.skipped++;
      continue;
    }

    const earnedBefore = wallet.settlementMocoPoints;
    const achieved = achievedSettlementRewardTier(earnedBefore);

    if (achieved.requiredMoco <= 0 || achieved.rewardUsd <= 0) {
      result.tierSkipped++;
      continue;
    }

    const profile = wallet.user.creatorSettlementProfile;
    const countryCode = profile?.countryCode ?? wallet.user.countryCode ?? "US";
    const amount = calcTierRewardAmount({
      rewardUsd: achieved.rewardUsd,
      countryCode,
    });
    const rolloverMoco = earnedBefore - achieved.requiredMoco;

    if (!meetsMinimum(amount) || amount.netMinor <= 0) {
      const batch = await db.creatorRewardPayoutBatch.create({
        data: {
          userId: wallet.userId,
          periodYear: year,
          periodMonth: month,
          settlementMocoBefore: earnedBefore,
          achievedRewardTier: achieved.label,
          deductedMoco: achieved.requiredMoco,
          rolloverMoco,
          rewardUsd: achieved.rewardUsd,
          grossAmountMinor: amount.grossMinor,
          withholdingMinor: amount.withholdingMinor,
          netAmountMinor: amount.netMinor,
          currency: amount.currency,
          status: REWARD_BATCH_STATUS.SKIPPED_BELOW_MINIMUM,
          skipReason: "최소 지급 금액 미달",
          errorMessage: "최소 지급 금액 미달",
        },
      });
      await debitSettlementMocoForReward({
        userId: wallet.userId,
        deductAmount: achieved.requiredMoco,
        batchId: batch.id,
      });
      result.skipped++;
      continue;
    }

    const gate = await checkCreatorRewardPayoutGate(wallet.userId);
    const initialStatus = gate.ok
      ? REWARD_BATCH_STATUS.PENDING
      : (gate.skipStatus ?? REWARD_BATCH_STATUS.SKIPPED_UNONBOARDED);

    const batch = await db.creatorRewardPayoutBatch.create({
      data: {
        userId: wallet.userId,
        periodYear: year,
        periodMonth: month,
        settlementMocoBefore: earnedBefore,
        achievedRewardTier: achieved.label,
        deductedMoco: achieved.requiredMoco,
        rolloverMoco,
        rewardUsd: achieved.rewardUsd,
        grossAmountMinor: amount.grossMinor,
        withholdingMinor: amount.withholdingMinor,
        netAmountMinor: amount.netMinor,
        currency: amount.currency,
        status: initialStatus,
        skipReason: gate.ok ? null : gate.skipReason,
        errorMessage: gate.ok ? null : gate.skipReason,
      },
    });

    await debitSettlementMocoForReward({
      userId: wallet.userId,
      deductAmount: achieved.requiredMoco,
      batchId: batch.id,
    });

    if (!gate.ok || !gate.accountId) {
      result.skipped++;
      await notifyRewardGateSkip(
        wallet.userId,
        gate.skipReason ?? "정산 등록이 완료되지 않아 Reward 지급이 보류되었습니다."
      );
      continue;
    }

    const outcome = await executeRewardTransfer({
      batchId: batch.id,
      userId: wallet.userId,
      accountId: gate.accountId,
      netMinor: amount.netMinor,
      currency: amount.currency,
      year,
      month,
      achievedTier: achieved.label,
      deductedMoco: achieved.requiredMoco,
      rolloverMoco,
    });
    if (outcome === "processed") result.processed++;
    else result.failed++;
  }

  return result;
}

/** @deprecated processMonthlySettlementCron 사용 */
export async function processMonthlyRewardPayouts(now = new Date()) {
  const r = await processMonthlySettlementCron(now);
  return { processed: r.processed, skipped: r.skipped, failed: r.failed };
}
