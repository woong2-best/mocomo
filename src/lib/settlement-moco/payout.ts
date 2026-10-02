import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { checkCreatorRewardPayoutGate } from "@/lib/settlement-moco/payout-gate";
import {
  MAX_REWARD_TRANSFER_RETRIES,
  REWARD_BATCH_STATUS,
  REWARD_RETRYABLE_STATUSES,
} from "@/lib/settlement-moco/payout-status";
import { deprecateOpenSettlementCyclesForOnDemand } from "@/lib/settlement-moco/cycle-deprecation";
import { lockAllCreatorSettlementCycles } from "@/lib/settlement-moco/cycle-lock";
import { isMocoSettlementLockDay } from "@/lib/settlement-moco/cycle-period";
import { processLockedSettlementCycles } from "@/lib/settlement-moco/cycle-run";
import { isOnDemandPayoutEnabled } from "@/lib/settlement-moco/feature-flags";
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
    title: "Reward 정산이 보류되었습니다",
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

export type RunMocoSettlementOptions = {
  now?: Date;
  /** 관리자 — 25일이 아니어도 Lock 실행 */
  forceLock?: boolean;
  /** Lock 생략, PROCESSING 건만 지급 */
  payoutOnly?: boolean;
};

/**
 * 매월 25일(KST) — 전월 earned MOCO Lock → Reward Transfer.
 * Lock 이후 적립분은 settlementMocoPoints(Available)에만 쌓여 다음 25일 주기에 포함.
 */
export async function processMonthlySettlementCron(
  now = new Date(),
  opts?: RunMocoSettlementOptions,
): Promise<MonthlySettlementResult> {
  const result: MonthlySettlementResult = {
    processed: 0,
    skipped: 0,
    failed: 0,
    tierSkipped: 0,
    retried: 0,
    locked: 0,
    lockSkippedDuplicate: 0,
    lockSkippedZero: 0,
    lockFailed: 0,
    onDemandMode: isOnDemandPayoutEnabled(),
    deprecatedCyclesReleased: 0,
  };

  if (isOnDemandPayoutEnabled()) {
    const released = await deprecateOpenSettlementCyclesForOnDemand();
    result.deprecatedCyclesReleased = released.released;
    const held = await reprocessHeldRewardBatches();
    result.retried = held.retried;
    result.processed += held.processed;
    result.failed += held.failed;
    result.skipped += held.skipped;
    return result;
  }

  const held = await reprocessHeldRewardBatches();
  result.retried = held.retried;
  result.processed += held.processed;
  result.failed += held.failed;
  result.skipped += held.skipped;

  if (!opts?.payoutOnly && isMocoSettlementLockDay(now, opts?.forceLock)) {
    const lockSummary = await lockAllCreatorSettlementCycles(now);
    result.locked = lockSummary.locked;
    result.lockSkippedDuplicate = lockSummary.skippedDuplicate;
    result.lockSkippedZero = lockSummary.skippedZero;
    result.lockFailed = lockSummary.failed;
  }

  const payout = await processLockedSettlementCycles();
  result.processed += payout.processed;
  result.skipped += payout.skipped;
  result.failed += payout.failed;
  result.tierSkipped += payout.tierSkipped;

  return result;
}

/** @deprecated processMonthlySettlementCron 사용 */
export async function processMonthlyRewardPayouts(now = new Date()) {
  const r = await processMonthlySettlementCron(now);
  return { processed: r.processed, skipped: r.skipped, failed: r.failed };
}
