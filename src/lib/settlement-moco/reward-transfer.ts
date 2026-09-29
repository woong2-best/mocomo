import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { markSettlementCyclePaid } from "@/lib/settlement-moco/cycle-payout";
import { REWARD_BATCH_STATUS } from "@/lib/settlement-moco/payout-status";

async function completeCycleIfLinked(batchId: string) {
  const batch = await db.creatorRewardPayoutBatch.findUnique({
    where: { id: batchId },
    select: { deductedMoco: true, rolloverMoco: true },
  });
  const cycle = await db.creatorMocoSettlementCycle.findFirst({
    where: { rewardPayoutBatchId: batchId, status: "PROCESSING" },
    select: { id: true },
  });
  if (!cycle || !batch) return;
  await markSettlementCyclePaid(cycle.id, batchId, {
    deductedMoco: batch.deductedMoco,
    rolloverMoco: batch.rolloverMoco,
  });
}

export async function executeRewardTransfer(input: {
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
    await completeCycleIfLinked(input.batchId);
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
