import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import {
  MAX_REWARD_TRANSFER_RETRIES,
  REWARD_RETRYABLE_STATUSES,
} from "@/lib/settlement-moco/payout-status";
import { executeRewardTransfer } from "@/lib/settlement-moco/reward-transfer";

export { executeRewardTransfer } from "@/lib/settlement-moco/reward-transfer";

export type MonthlySettlementResult = {
  processed: number;
  skipped: number;
  failed: number;
  tierSkipped: number;
  retried: number;
  locked: number;
  lockSkippedDuplicate: number;
  lockSkippedZero: number;
  lockFailed: number;
  onDemandMode: boolean;
  deprecatedCyclesReleased: number;
};

export async function notifyRewardGateSkip(userId: string, skipReason: string) {
  await createNotification({
    userId,
    type: "system",
    title: "Reward settlement is on hold",
    body: skipReason,
    link: "/wallet",
  }).catch(() => null);
}

/**
 * 온보딩/세무 미비·Transfer 실패로 보류된 배치를 Transfer만 재시도
 * (Lock 주기는 PROCESSING 유지 — 성공 시 Paid + 이월)
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
    const outcome = await executeRewardTransfer({
      batchId: batch.id,
      userId: batch.userId,
      accountId: "manual",
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

export type RunMocoSettlementOptions = {
  now?: Date;
  /** 관리자 — 25일이 아니어도 Lock 실행 */
  forceLock?: boolean;
  /** Lock 생략, PROCESSING 건만 지급 */
  payoutOnly?: boolean;
};

/**
 * Monthly settlement cycles are retired.
 * Creators cash out the Reward tier they have reached from the wallet.
 * This no longer locks balances or queues payouts.
 */
export async function processMonthlySettlementCron(
  _now = new Date(),
  _opts?: RunMocoSettlementOptions,
): Promise<MonthlySettlementResult> {
  return {
    processed: 0,
    skipped: 0,
    failed: 0,
    tierSkipped: 0,
    retried: 0,
    locked: 0,
    lockSkippedDuplicate: 0,
    lockSkippedZero: 0,
    lockFailed: 0,
    onDemandMode: true,
    deprecatedCyclesReleased: 0,
  };
}

/** @deprecated processMonthlySettlementCron 사용 */
export async function processMonthlyRewardPayouts(now = new Date()) {
  const r = await processMonthlySettlementCron(now);
  return { processed: r.processed, skipped: r.skipped, failed: r.failed };
}
