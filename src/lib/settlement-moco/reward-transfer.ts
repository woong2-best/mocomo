import { db } from "@/lib/db";
import { REWARD_BATCH_STATUS } from "@/lib/settlement-moco/payout-status";

/**
 * Queues a manual payout for a reward batch. Does not call Stripe.
 * The cycle stays PROCESSING until an admin marks the payout completed.
 */
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
  void input.accountId;
  void input.year;
  void input.month;
  void input.achievedTier;
  try {
    const existing = await db.creatorPayoutRequest.findUnique({
      where: { rewardBatchId: input.batchId },
      select: { id: true },
    });
    if (!existing && input.netMinor > 0) {
      const method = await db.payoutMethod.findUnique({
        where: { userId: input.userId },
        select: { kind: true, destinationHint: true },
      });
      const usdCents = input.currency === "usd" ? input.netMinor : 0;
      await db.creatorPayoutRequest.create({
        data: {
          userId: input.userId,
          mocoAmount: input.deductedMoco,
          usdCents,
          amountMinor: input.netMinor,
          currency: input.currency,
          status: "PENDING",
          payoutMethodKind: method && method.kind !== "UNSPECIFIED" ? method.kind : "UNSPECIFIED",
          payoutMethodHint: method?.destinationHint ?? "No payout method on file",
          source: "REWARD_BATCH",
          rewardBatchId: input.batchId,
        },
      });
    }

    await db.creatorRewardPayoutBatch.update({
      where: { id: input.batchId },
      data: {
        status: REWARD_BATCH_STATUS.MANUAL_QUEUED,
        errorMessage: null,
        skipReason: "Queued for manual payout. Stripe Connect is not used.",
        ...(input.isRetry ? { retryCount: { increment: 1 }, lastRetryAt: new Date() } : {}),
      },
    });
    return "processed";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not queue manual payout";
    await db.creatorRewardPayoutBatch.update({
      where: { id: input.batchId },
      data: {
        status: REWARD_BATCH_STATUS.FAILED,
        errorMessage: msg.slice(0, 500),
        ...(input.isRetry ? { retryCount: { increment: 1 }, lastRetryAt: new Date() } : {}),
      },
    });
    return "failed";
  }
}
