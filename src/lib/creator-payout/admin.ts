import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { openPayoutDestination, parseTxReference } from "@/lib/creator-payout/destination";
import { syncEarnedMocoDisplayTier } from "@/lib/settlement-moco/balance";
import { markSettlementCyclePaid } from "@/lib/settlement-moco/cycle-payout";
import { REWARD_BATCH_STATUS } from "@/lib/settlement-moco/payout-status";

const TX_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 10_000,
  timeout: 20_000,
} as const;

async function lockPlatformWalletRow(tx: Prisma.TransactionClient, userId: string) {
  const rows = await tx.$queryRaw<{ id: string; settlementMocoPoints: number }[]>`
    SELECT id, "settlementMocoPoints"
    FROM "PlatformWallet"
    WHERE "userId" = ${userId}
    FOR UPDATE
  `;
  return rows[0] ?? null;
}

export async function listCreatorPayoutAdminQueue() {
  const [requests, taxReviews] = await Promise.all([
    db.creatorPayoutRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        userId: true,
        mocoAmount: true,
        usdCents: true,
        amountMinor: true,
        currency: true,
        source: true,
        payoutMethodKind: true,
        payoutMethodHint: true,
        createdAt: true,
        user: {
          select: {
            username: true,
            creatorTaxInfo: { select: { status: true, taxFormType: true } },
          },
        },
      },
    }),
    db.creatorTaxInfo.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        userId: true,
        taxFormType: true,
        createdAt: true,
        user: { select: { username: true } },
      },
    }),
  ]);

  return {
    requests: requests.map((row) => ({
      id: row.id,
      userId: row.userId,
      username: row.user.username,
      mocoAmount: row.mocoAmount,
      usdCents: row.usdCents,
      amountMinor: row.amountMinor,
      currency: row.currency,
      source: row.source,
      payoutMethodKind: row.payoutMethodKind,
      payoutMethodHint: row.payoutMethodHint,
      taxStatus: row.user.creatorTaxInfo?.status ?? null,
      taxFormType: row.user.creatorTaxInfo?.taxFormType ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
    taxReviews: taxReviews.map((row) => ({
      userId: row.userId,
      username: row.user.username,
      taxFormType: row.taxFormType,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function revealCreatorPayoutDestination(userId: string) {
  const method = await db.payoutMethod.findUnique({ where: { userId } });
  if (!method || method.kind === "UNSPECIFIED") {
    return { error: "No payout destination on file.", status: 404 as const };
  }
  try {
    return { destination: openPayoutDestination(method.destinationCipher) };
  } catch {
    return { error: "Could not read the payout destination.", status: 500 as const };
  }
}

export async function completeCreatorPayoutRequest(input: {
  actorId: string;
  requestId: string;
  txReference: string;
  adminNote?: string;
}) {
  const note = input.adminNote?.trim() ?? "";
  if (note.length > 500) return { error: "Note is too long.", status: 400 as const };
  const txReference = parseTxReference(input.txReference);
  if (!txReference) {
    return {
      error: "Enter the Payoneer, Wise, or bank transaction reference.",
      status: 400 as const,
    };
  }

  const existing = await db.creatorPayoutRequest.findUnique({ where: { id: input.requestId } });
  if (!existing) return { error: "Payout request not found.", status: 404 as const };
  if (existing.userId === input.actorId) {
    return { error: "You cannot approve your own payout.", status: 403 as const };
  }
  if (existing.status !== "PENDING") {
    return { error: "This payout is no longer pending.", status: 409 as const };
  }
  if (existing.source === "ON_DEMAND") {
    const tax = await db.creatorTaxInfo.findUnique({
      where: { userId: existing.userId },
      select: { status: true },
    });
    if (tax?.status !== "VERIFIED") {
      return { error: "The creator tax form is not verified.", status: 409 as const };
    }
  }

  const now = new Date();
  const updated = await db.creatorPayoutRequest.updateMany({
    where: { id: existing.id, status: "PENDING" },
    data: {
      status: "COMPLETED",
      completedAt: now,
      txReference,
      adminNote: note || null,
      processedById: input.actorId,
    },
  });
  if (updated.count !== 1) {
    return { error: "This payout is no longer pending.", status: 409 as const };
  }

  if (existing.withdrawalId) {
    await db.creatorMocoOnDemandWithdrawal
      .update({
        where: { id: existing.withdrawalId },
        data: { status: REWARD_BATCH_STATUS.COMPLETED, completedAt: now },
      })
      .catch(() => null);
  }

  if (existing.source === "ON_DEMAND") {
    const cents = existing.currency === "usd" ? existing.amountMinor : existing.usdCents;
    await db.creatorBalance
      .update({
        where: { creatorId: existing.userId },
        data: { withdrawnCents: { increment: Math.max(0, cents) } },
      })
      .catch(() => null);
  }

  if (existing.rewardBatchId) {
    const batch = await db.creatorRewardPayoutBatch.update({
      where: { id: existing.rewardBatchId },
      data: {
        status: REWARD_BATCH_STATUS.COMPLETED,
        completedAt: now,
        errorMessage: null,
      },
    });
    const cycle = await db.creatorMocoSettlementCycle.findFirst({
      where: { rewardPayoutBatchId: batch.id, status: "PROCESSING" },
      select: { id: true },
    });
    if (cycle) {
      await markSettlementCyclePaid(cycle.id, batch.id, {
        deductedMoco: batch.deductedMoco,
        rolloverMoco: batch.rolloverMoco,
      });
    }
  }

  if (existing.giftBatchId) {
    await db.creatorPayoutBatch
      .update({
        where: { id: existing.giftBatchId },
        data: { status: "completed" },
      })
      .catch(() => null);
  }

  return { ok: true as const };
}

export async function rejectCreatorPayoutRequest(input: {
  actorId: string;
  requestId: string;
  adminNote: string;
}) {
  const note = input.adminNote.trim();
  if (note.length < 3 || note.length > 500) {
    return { error: "Add a short rejection reason.", status: 400 as const };
  }
  const existing = await db.creatorPayoutRequest.findUnique({ where: { id: input.requestId } });
  if (!existing) return { error: "Payout request not found.", status: 404 as const };
  if (existing.userId === input.actorId) {
    return { error: "You cannot reject your own payout.", status: 403 as const };
  }
  if (existing.status !== "PENDING") {
    return { error: "This payout is no longer pending.", status: 409 as const };
  }

  if (existing.source !== "ON_DEMAND") {
    const updated = await db.creatorPayoutRequest.updateMany({
      where: { id: existing.id, status: "PENDING" },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        adminNote: note,
        processedById: input.actorId,
      },
    });
    if (updated.count !== 1) return { error: "This payout is no longer pending.", status: 409 as const };
    if (existing.rewardBatchId) {
      await db.creatorRewardPayoutBatch
        .update({
          where: { id: existing.rewardBatchId },
          data: { status: "REJECTED", errorMessage: note },
        })
        .catch(() => null);
    }
    return {
      ok: true as const,
      restored: false,
      notice: "Rejected. Locked monthly or legacy balances were not returned automatically.",
    };
  }

  try {
    await db.$transaction(async (tx) => {
      const updated = await tx.creatorPayoutRequest.updateMany({
        where: { id: existing.id, status: "PENDING" },
        data: {
          status: "REJECTED",
          rejectedAt: new Date(),
          adminNote: note,
          processedById: input.actorId,
        },
      });
      if (updated.count !== 1) throw new Error("CONFLICT");

      const locked = await lockPlatformWalletRow(tx, existing.userId);
      if (locked) {
        const restored = await tx.platformWallet.update({
          where: { id: locked.id },
          data: { settlementMocoPoints: { increment: existing.mocoAmount } },
        });
        await tx.platformWalletLedger.create({
          data: {
            walletId: locked.id,
            bucket: "SETTLEMENT_MOCO",
            delta: existing.mocoAmount,
            balanceAfter: restored.settlementMocoPoints,
            reason: "Manual payout request rejected",
            referenceType: "creator_payout_request_reversal",
            referenceId: existing.id,
          },
        });
        await syncEarnedMocoDisplayTier(existing.userId, restored.settlementMocoPoints, tx);
      }

      if (existing.withdrawalId) {
        await tx.creatorMocoOnDemandWithdrawal.update({
          where: { id: existing.withdrawalId },
          data: { status: "REJECTED", errorMessage: note },
        });
      }
    }, TX_OPTIONS);
  } catch (e) {
    if (e instanceof Error && e.message === "CONFLICT") {
      return { error: "This payout is no longer pending.", status: 409 as const };
    }
    throw e;
  }

  return { ok: true as const, restored: true };
}

export async function reviewCreatorTaxForm(input: {
  actorId: string;
  userId: string;
  decision: "VERIFIED" | "REJECTED";
  rejectionNote?: string;
}) {
  if (input.actorId === input.userId) {
    return { error: "You cannot review your own tax form.", status: 403 as const };
  }
  const note = input.rejectionNote?.trim() ?? "";
  if (input.decision === "REJECTED" && (note.length < 3 || note.length > 500)) {
    return { error: "Add a rejection reason.", status: 400 as const };
  }
  const row = await db.creatorTaxInfo.findUnique({ where: { userId: input.userId }, select: { id: true } });
  if (!row) return { error: "Tax form not found.", status: 404 as const };
  await db.creatorTaxInfo.update({
    where: { userId: input.userId },
    data: {
      status: input.decision,
      rejectionNote: input.decision === "REJECTED" ? note : null,
      reviewedById: input.actorId,
      reviewedAt: new Date(),
    },
  });
  return { ok: true as const };
}
