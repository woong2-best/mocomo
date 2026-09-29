import type { Prisma } from "@prisma/client";
import { MocoSettlementCycleStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { syncEarnedMocoDisplayTier } from "@/lib/settlement-moco/balance";
import { creditSettlementMocoInTx } from "@/lib/settlement-moco/economy";
import {
  MIN_REWARD_PAYOUT_KRW,
  MIN_REWARD_PAYOUT_USD_CENTS,
} from "@/lib/settlement-moco/constants";
import { achievedSettlementRewardTier } from "@/lib/settlement-moco/tier-config";
import { calcTierRewardAmount } from "@/lib/settlement-moco/tax";
import { checkCreatorRewardPayoutGate } from "@/lib/settlement-moco/payout-gate";
import { REWARD_BATCH_STATUS } from "@/lib/settlement-moco/payout-status";

type RewardAmountBreakdown = ReturnType<typeof calcTierRewardAmount>;

function meetsMinimum(amount: RewardAmountBreakdown): boolean {
  if (amount.currency === "krw") return amount.netMinor >= MIN_REWARD_PAYOUT_KRW;
  if (amount.currency === "usd") return amount.netMinor >= MIN_REWARD_PAYOUT_USD_CENTS;
  return amount.netMinor >= 100;
}

/** Lock 주기 완료 — rollover 만 Available 로 복귀 (이번 25일 주기 종료) */
export async function creditCycleRolloverInTx(
  tx: Prisma.TransactionClient,
  input: { userId: string; cycleId: string; rolloverMoco: number },
) {
  if (input.rolloverMoco <= 0) return;
  await creditSettlementMocoInTx(tx, {
    userId: input.userId,
    amount: input.rolloverMoco,
    reason: "월간 정산 이월 (다음 주기 Available)",
    referenceType: "moco_settlement_cycle_rollover",
    referenceId: input.cycleId,
  });
}

export async function markSettlementCyclePaid(
  cycleId: string,
  batchId: string,
  input: { deductedMoco: number; rolloverMoco: number },
) {
  await db.$transaction(async (tx) => {
    const cycle = await tx.creatorMocoSettlementCycle.findUniqueOrThrow({
      where: { id: cycleId },
    });
    if (cycle.status !== MocoSettlementCycleStatus.PROCESSING) return;

    await tx.creatorMocoSettlementCycle.update({
      where: { id: cycleId },
      data: {
        status: MocoSettlementCycleStatus.PAID,
        paidAt: new Date(),
        rewardPayoutBatchId: batchId,
        deductedMoco: input.deductedMoco,
        rolloverMoco: input.rolloverMoco,
        errorMessage: null,
      },
    });

    await creditCycleRolloverInTx(tx, {
      userId: cycle.userId,
      cycleId,
      rolloverMoco: input.rolloverMoco,
    });
  });
}

/** Transfer 실패 등 — Lock 금액 전량 Available 로 반환 */
export async function returnSettlementCycleToAvailable(
  cycleId: string,
  errorMessage: string,
) {
  await db.$transaction(async (tx) => {
    const cycle = await tx.creatorMocoSettlementCycle.findUniqueOrThrow({
      where: { id: cycleId },
    });
    if (
      cycle.status !== MocoSettlementCycleStatus.PROCESSING &&
      cycle.status !== MocoSettlementCycleStatus.FAILED
    ) {
      return;
    }
    if (cycle.status === MocoSettlementCycleStatus.RETURNED) return;

    const returnMoco = cycle.lockedMoco - cycle.deductedMoco;
    if (returnMoco > 0) {
      await creditSettlementMocoInTx(tx, {
        userId: cycle.userId,
        amount: returnMoco,
        reason: "정산 실패 반환 (Processing → Available)",
        referenceType: "moco_settlement_cycle_return",
        referenceId: cycle.id,
      });
    }

    await tx.creatorMocoSettlementCycle.update({
      where: { id: cycleId },
      data: {
        status: MocoSettlementCycleStatus.RETURNED,
        returnedAt: new Date(),
        failedAt: cycle.failedAt ?? new Date(),
        errorMessage,
      },
    });
  });
}

export async function markSettlementCycleFailed(cycleId: string, errorMessage: string) {
  await db.creatorMocoSettlementCycle.updateMany({
    where: {
      id: cycleId,
      status: MocoSettlementCycleStatus.PROCESSING,
    },
    data: {
      status: MocoSettlementCycleStatus.FAILED,
      failedAt: new Date(),
      errorMessage,
    },
  });
}

export type CyclePayoutPlan = {
  cycleId: string;
  userId: string;
  earnedBefore: number;
  deductedMoco: number;
  rolloverMoco: number;
  achievedLabel: string;
  amount: RewardAmountBreakdown;
};

/** PROCESSING Lock 건 — Reward 배치 생성용 (wallet 잔액 사용 안 함) */
export async function buildCyclePayoutPlan(cycleId: string): Promise<CyclePayoutPlan | null> {
  const cycle = await db.creatorMocoSettlementCycle.findUnique({
    where: { id: cycleId },
    include: {
      user: {
        select: {
          countryCode: true,
          creatorSettlementProfile: { select: { countryCode: true } },
        },
      },
    },
  });
  if (!cycle || cycle.status !== MocoSettlementCycleStatus.PROCESSING) return null;
  if (cycle.rewardPayoutBatchId) return null;

  const earnedBefore = cycle.lockedMoco;
  const achieved = achievedSettlementRewardTier(earnedBefore);
  const deductedMoco = Math.min(earnedBefore, Math.max(0, achieved.requiredMoco));
  const rolloverMoco = earnedBefore - deductedMoco;

  const profile = cycle.user.creatorSettlementProfile;
  const countryCode = profile?.countryCode ?? cycle.user.countryCode ?? "US";
  const amount = calcTierRewardAmount({
    rewardUsd: achieved.rewardUsd,
    countryCode,
  });

  return {
    cycleId: cycle.id,
    userId: cycle.userId,
    earnedBefore,
    deductedMoco,
    rolloverMoco,
    achievedLabel: achieved.label,
    amount,
  };
}

export async function listProcessingSettlementCycles(limit = 500) {
  return db.creatorMocoSettlementCycle.findMany({
    where: { status: MocoSettlementCycleStatus.PROCESSING },
    orderBy: { lockedAt: "asc" },
    take: limit,
    select: { id: true },
  });
}

export function batchStatusForCyclePlan(plan: CyclePayoutPlan): string {
  if (plan.achievedLabel && plan.deductedMoco <= 0) {
    return REWARD_BATCH_STATUS.SKIPPED;
  }
  if (!meetsMinimum(plan.amount) || plan.amount.netMinor <= 0) {
    return REWARD_BATCH_STATUS.SKIPPED_BELOW_MINIMUM;
  }
  return REWARD_BATCH_STATUS.PENDING;
}

/** 현금 지급 없이 Lock 주기 종료 — 전액 다음 Available 주기로 이월 */
export async function closeSettlementCycleWithoutCashPayout(cycleId: string, note: string) {
  await db.$transaction(async (tx) => {
    const cycle = await tx.creatorMocoSettlementCycle.findUniqueOrThrow({
      where: { id: cycleId },
    });
    if (cycle.status !== MocoSettlementCycleStatus.PROCESSING) return;

    await creditCycleRolloverInTx(tx, {
      userId: cycle.userId,
      cycleId,
      rolloverMoco: cycle.lockedMoco,
    });

    await tx.creatorMocoSettlementCycle.update({
      where: { id: cycleId },
      data: {
        status: MocoSettlementCycleStatus.PAID,
        paidAt: new Date(),
        deductedMoco: 0,
        rolloverMoco: cycle.lockedMoco,
        errorMessage: note,
      },
    });
  });
}
