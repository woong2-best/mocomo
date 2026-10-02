import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { isOnDemandPayoutEnabled } from "@/lib/settlement-moco/feature-flags";
import { achievedSettlementRewardTier } from "@/lib/settlement-moco/tier-config";
import { checkCreatorRewardPayoutGate } from "@/lib/settlement-moco/payout-gate";
import { REWARD_BATCH_STATUS } from "@/lib/settlement-moco/payout-status";
import {
  batchStatusForCyclePlan,
  buildCyclePayoutPlan,
  closeSettlementCycleWithoutCashPayout,
  listProcessingSettlementCycles,
  markSettlementCycleFailed,
  markSettlementCyclePaid,
} from "@/lib/settlement-moco/cycle-payout";
import { executeRewardTransfer } from "@/lib/settlement-moco/reward-transfer";

async function notifyRewardGateSkip(userId: string, skipReason: string) {
  await createNotification({
    userId,
    type: "system",
    title: "Reward 정산이 보류되었습니다",
    body: skipReason,
    link: "/wallet",
  }).catch(() => null);
}

async function processOneLockedCycle(cycleId: string): Promise<"processed" | "skipped" | "failed" | "tierSkipped"> {
  const cycle = await db.creatorMocoSettlementCycle.findUnique({
    where: { id: cycleId },
  });
  if (!cycle || cycle.status !== "PROCESSING") return "skipped";

  const achieved = achievedSettlementRewardTier(cycle.lockedMoco);
  if (achieved.requiredMoco <= 0 || achieved.rewardUsd <= 0) {
    await closeSettlementCycleWithoutCashPayout(cycleId, "Reward 등급 미달 — 전액 다음 주기로 이월");
    return "tierSkipped";
  }

  const plan = await buildCyclePayoutPlan(cycleId);
  if (!plan) return "skipped";

  const existingBatch = await db.creatorRewardPayoutBatch.findUnique({
    where: {
      userId_periodYear_periodMonth: {
        userId: cycle.userId,
        periodYear: cycle.periodYear,
        periodMonth: cycle.periodMonth,
      },
    },
  });
  if (existingBatch) {
    if (!cycle.rewardPayoutBatchId) {
      await db.creatorMocoSettlementCycle.update({
        where: { id: cycleId },
        data: { rewardPayoutBatchId: existingBatch.id },
      });
    }
    return "skipped";
  }

  await db.creatorMocoSettlementCycle.update({
    where: { id: cycleId },
    data: {
      deductedMoco: plan.deductedMoco,
      rolloverMoco: plan.rolloverMoco,
    },
  });

  const initialStatus = batchStatusForCyclePlan(plan);

  if (initialStatus === REWARD_BATCH_STATUS.SKIPPED_BELOW_MINIMUM) {
    const batch = await db.creatorRewardPayoutBatch.create({
      data: {
        userId: plan.userId,
        periodYear: cycle.periodYear,
        periodMonth: cycle.periodMonth,
        settlementMocoBefore: plan.earnedBefore,
        achievedRewardTier: plan.achievedLabel,
        deductedMoco: plan.deductedMoco,
        rolloverMoco: plan.rolloverMoco,
        rewardUsd: achieved.rewardUsd,
        grossAmountMinor: plan.amount.grossMinor,
        withholdingMinor: plan.amount.withholdingMinor,
        netAmountMinor: plan.amount.netMinor,
        currency: plan.amount.currency,
        status: REWARD_BATCH_STATUS.SKIPPED_BELOW_MINIMUM,
        skipReason: "최소 지급 금액 미달",
        errorMessage: "최소 지급 금액 미달",
      },
    });
    await markSettlementCyclePaid(cycleId, batch.id, {
      deductedMoco: plan.deductedMoco,
      rolloverMoco: plan.rolloverMoco,
    });
    return "skipped";
  }

  const gate = await checkCreatorRewardPayoutGate(plan.userId);
  const batchStatus = gate.ok
    ? REWARD_BATCH_STATUS.PENDING
    : (gate.skipStatus ?? REWARD_BATCH_STATUS.SKIPPED_UNONBOARDED);

  const batch = await db.creatorRewardPayoutBatch.create({
    data: {
      userId: plan.userId,
      periodYear: cycle.periodYear,
      periodMonth: cycle.periodMonth,
      settlementMocoBefore: plan.earnedBefore,
      achievedRewardTier: plan.achievedLabel,
      deductedMoco: plan.deductedMoco,
      rolloverMoco: plan.rolloverMoco,
      rewardUsd: achieved.rewardUsd,
      grossAmountMinor: plan.amount.grossMinor,
      withholdingMinor: plan.amount.withholdingMinor,
      netAmountMinor: plan.amount.netMinor,
      currency: plan.amount.currency,
      status: batchStatus,
      skipReason: gate.ok ? null : gate.skipReason,
      errorMessage: gate.ok ? null : gate.skipReason,
    },
  });

  await db.creatorMocoSettlementCycle.update({
    where: { id: cycleId },
    data: { rewardPayoutBatchId: batch.id },
  });

  if (!gate.ok || !gate.accountId) {
    await notifyRewardGateSkip(
      plan.userId,
      gate.skipReason ?? "정산 등록이 완료되지 않아 Reward 지급이 보류되었습니다.",
    );
    return "skipped";
  }

  const outcome = await executeRewardTransfer({
    batchId: batch.id,
    userId: plan.userId,
    accountId: gate.accountId,
    netMinor: plan.amount.netMinor,
    currency: plan.amount.currency,
    year: cycle.periodYear,
    month: cycle.periodMonth,
    achievedTier: plan.achievedLabel,
    deductedMoco: plan.deductedMoco,
    rolloverMoco: plan.rolloverMoco,
  });

  if (outcome === "processed") return "processed";
  await markSettlementCycleFailed(cycleId, "Stripe Transfer 실패");
  return "failed";
}

export async function processLockedSettlementCycles(): Promise<{
  processed: number;
  skipped: number;
  failed: number;
  tierSkipped: number;
}> {
  const result = { processed: 0, skipped: 0, failed: 0, tierSkipped: 0 };
  if (isOnDemandPayoutEnabled()) {
    return result;
  }
  const cycles = await listProcessingSettlementCycles();
  for (const { id } of cycles) {
    try {
      const outcome = await processOneLockedCycle(id);
      if (outcome === "processed") result.processed++;
      else if (outcome === "failed") result.failed++;
      else if (outcome === "tierSkipped") result.tierSkipped++;
      else result.skipped++;
    } catch {
      result.failed++;
      await markSettlementCycleFailed(id, "정산 처리 중 오류").catch(() => null);
    }
  }
  return result;
}
