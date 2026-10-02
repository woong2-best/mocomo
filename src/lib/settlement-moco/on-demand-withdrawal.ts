import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { syncEarnedMocoDisplayTier } from "@/lib/settlement-moco/balance";
import { quoteOnDemandWithdrawal } from "@/lib/settlement-moco/dynamic-tier-engine";
import { checkCreatorRewardPayoutGate } from "@/lib/settlement-moco/payout-gate";
import { REWARD_BATCH_STATUS } from "@/lib/settlement-moco/payout-status";
import type { OnDemandWithdrawalQuoteResult } from "@/lib/settlement-moco/dynamic-tier-engine";

const TX_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 10_000,
  timeout: 30_000,
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

export async function getOnDemandWithdrawalQuoteForUser(
  userId: string,
  withdrawMoco: number,
): Promise<OnDemandWithdrawalQuoteResult> {
  const [wallet, profile, user] = await Promise.all([
    db.platformWallet.findUnique({
      where: { userId },
      select: { settlementMocoPoints: true },
    }),
    db.creatorSettlementProfile.findUnique({
      where: { userId },
      select: { countryCode: true },
    }),
    db.user.findUnique({ where: { id: userId }, select: { countryCode: true } }),
  ]);

  const countryCode = profile?.countryCode ?? user?.countryCode ?? "US";
  return quoteOnDemandWithdrawal({
    balanceBeforeMoco: wallet?.settlementMocoPoints ?? 0,
    withdrawMoco,
    countryCode,
  });
}

export type ExecuteOnDemandWithdrawalResult =
  | { ok: true; withdrawalId: string; stripeTransferId: string }
  | { ok: false; code: string; message: string; status: number };

export type ExecuteOnDemandWithdrawalOptions = {
  idempotencyKey?: string;
};

/**
 * Real-time on-demand payout: debit settlement MOCO, Stripe Connect transfer (net after platform margin).
 * Stripe payout/transfer fees apply on the connected account (pass-through).
 */
export async function executeOnDemandWithdrawal(
  userId: string,
  withdrawMoco: number,
  opts?: ExecuteOnDemandWithdrawalOptions,
): Promise<ExecuteOnDemandWithdrawalResult> {
  const idempotencyKey = opts?.idempotencyKey?.trim();

  if (idempotencyKey) {
    const existing = await db.creatorMocoOnDemandWithdrawal.findUnique({
      where: { idempotencyKey },
      select: {
        id: true,
        userId: true,
        status: true,
        stripeTransferId: true,
      },
    });
    if (existing) {
      if (existing.userId !== userId) {
        return {
          ok: false,
          code: "IDEMPOTENCY_KEY_CONFLICT",
          message: "Idempotency key already used.",
          status: 409,
        };
      }
      if (existing.status === REWARD_BATCH_STATUS.COMPLETED && existing.stripeTransferId) {
        return {
          ok: true,
          withdrawalId: existing.id,
          stripeTransferId: existing.stripeTransferId,
        };
      }
      if (existing.status === REWARD_BATCH_STATUS.PENDING) {
        return {
          ok: false,
          code: "WITHDRAWAL_IN_PROGRESS",
          message: "Withdrawal is already processing.",
          status: 409,
        };
      }
    }
  }

  const quote = await getOnDemandWithdrawalQuoteForUser(userId, withdrawMoco);
  if (!quote.ok) {
    const status =
      quote.code === "INSUFFICIENT_BALANCE"
        ? 402
        : quote.code === "BELOW_MIN_TIER" || quote.code === "BELOW_MIN_PAYOUT"
          ? 400
          : 400;
    return { ok: false, code: quote.code, message: quote.message, status };
  }

  const gate = await checkCreatorRewardPayoutGate(userId);
  if (!gate.ok || !gate.accountId) {
    return {
      ok: false,
      code: gate.skipStatus ?? "PAYOUT_GATE",
      message: gate.skipReason ?? "Complete payout account setup.",
      status: 403,
    };
  }

  let withdrawal: { id: string };
  try {
    withdrawal = await db.$transaction(async (tx) => {
      const locked = await lockPlatformWalletRow(tx, userId);
      if (!locked || locked.settlementMocoPoints < quote.withdrawMoco) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const updated = await tx.platformWallet.update({
        where: { id: locked.id },
        data: { settlementMocoPoints: { decrement: quote.withdrawMoco } },
      });

      await syncEarnedMocoDisplayTier(userId, updated.settlementMocoPoints, tx);

      const row = await tx.creatorMocoOnDemandWithdrawal.create({
        data: {
          userId,
          withdrawMoco: quote.withdrawMoco,
          balanceBeforeMoco: quote.balanceBeforeMoco,
          balanceAfterMoco: quote.balanceAfterMoco,
          activeTierBefore: quote.activeTierBefore.label,
          activeTierAfter: quote.activeTierAfter.label,
          payoutTier: quote.payoutTier.label,
          faceValueCents: quote.faceValueCents,
          platformMarginCents: quote.platformMarginCents,
          netTransferCents: quote.netTransferCents,
          grossAmountMinor: quote.transfer.grossMinor,
          withholdingMinor: quote.transfer.withholdingMinor,
          netAmountMinor: quote.transfer.netMinor,
          currency: quote.transfer.currency,
          status: REWARD_BATCH_STATUS.PENDING,
          idempotencyKey: idempotencyKey || null,
        },
      });

      await tx.platformWalletLedger.create({
        data: {
          walletId: locked.id,
          bucket: "SETTLEMENT_MOCO",
          delta: -quote.withdrawMoco,
          balanceAfter: updated.settlementMocoPoints,
          reason: "Reward on-demand withdrawal",
          referenceType: "moco_on_demand_withdrawal",
          referenceId: row.id,
        },
      });

      return row;
    }, TX_OPTIONS);
  } catch (e) {
    if (e instanceof Error && e.message === "INSUFFICIENT_BALANCE") {
      return {
        ok: false,
        code: "INSUFFICIENT_BALANCE",
        message: "Insufficient settlement MOCO balance.",
        status: 402,
      };
    }
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002" &&
      idempotencyKey
    ) {
      const raced = await db.creatorMocoOnDemandWithdrawal.findUnique({
        where: { idempotencyKey },
      });
      if (raced?.status === REWARD_BATCH_STATUS.COMPLETED && raced.stripeTransferId) {
        return {
          ok: true,
          withdrawalId: raced.id,
          stripeTransferId: raced.stripeTransferId,
        };
      }
      return {
        ok: false,
        code: "WITHDRAWAL_IN_PROGRESS",
        message: "Withdrawal is already processing.",
        status: 409,
      };
    }
    throw e;
  }

  const stripe = getStripe();
  try {
    const transfer = await stripe.transfers.create(
      {
        amount: quote.transfer.netMinor,
        currency: quote.transfer.currency,
        destination: gate.accountId,
        metadata: {
          mocomoUserId: userId,
          withdrawalId: withdrawal.id,
          type: "creator_reward_on_demand",
          withdrawMoco: String(quote.withdrawMoco),
          payoutTier: quote.payoutTier.label,
          activeTierAfter: quote.activeTierAfter.label,
          ...(idempotencyKey ? { idempotencyKey } : {}),
        },
      },
      idempotencyKey ? { idempotencyKey: `moco_wd_${idempotencyKey}` } : undefined,
    );

    await db.creatorMocoOnDemandWithdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: REWARD_BATCH_STATUS.COMPLETED,
        stripeTransferId: transfer.id,
        completedAt: new Date(),
      },
    });

    await db.creatorBalance
      .update({
        where: { creatorId: userId },
        data: {
          accumulatedAllocationCents: { decrement: quote.netTransferCents },
          withdrawnCents: { increment: quote.transfer.netMinor },
        },
      })
      .catch(() => null);

    return { ok: true, withdrawalId: withdrawal.id, stripeTransferId: transfer.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Transfer failed";
    await db.$transaction(async (tx) => {
      await tx.creatorMocoOnDemandWithdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: REWARD_BATCH_STATUS.FAILED,
          errorMessage: msg,
        },
      });

      const locked = await lockPlatformWalletRow(tx, userId);
      if (!locked) return;

      const restored = await tx.platformWallet.update({
        where: { id: locked.id },
        data: { settlementMocoPoints: { increment: quote.withdrawMoco } },
      });

      await tx.platformWalletLedger.create({
        data: {
          walletId: locked.id,
          bucket: "SETTLEMENT_MOCO",
          delta: quote.withdrawMoco,
          balanceAfter: restored.settlementMocoPoints,
          reason: "Reward on-demand withdrawal failure reversal",
          referenceType: "moco_on_demand_withdrawal_reversal",
          referenceId: withdrawal.id,
        },
      });

      await syncEarnedMocoDisplayTier(userId, restored.settlementMocoPoints, tx);
    }, TX_OPTIONS);

    return { ok: false, code: "TRANSFER_FAILED", message: msg, status: 502 };
  }
}
