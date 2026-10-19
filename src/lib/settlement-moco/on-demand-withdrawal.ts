import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { assertManualPayoutReady } from "@/lib/creator-payout/readiness";
import { syncEarnedMocoDisplayTier } from "@/lib/settlement-moco/balance";
import { quoteOnDemandWithdrawal } from "@/lib/settlement-moco/dynamic-tier-engine";
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
  | { ok: true; withdrawalId: string; payoutRequestId: string; stripeTransferId: string | null }
  | { ok: false; code: string; message: string; status: number };

export type ExecuteOnDemandWithdrawalOptions = {
  idempotencyKey?: string;
};

/**
 * Debits settlement MOCO and records a PENDING manual payout.
 * Stripe Connect transfers are not created. Ops pays Payoneer / Wise / bank later.
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
      select: { id: true, userId: true, status: true, stripeTransferId: true },
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
      const linked = await db.creatorPayoutRequest.findUnique({
        where: { withdrawalId: existing.id },
        select: { id: true },
      });
      if (linked) {
        return {
          ok: true,
          withdrawalId: existing.id,
          payoutRequestId: linked.id,
          stripeTransferId: existing.stripeTransferId,
        };
      }
      if (existing.status === REWARD_BATCH_STATUS.COMPLETED && existing.stripeTransferId) {
        return {
          ok: true,
          withdrawalId: existing.id,
          payoutRequestId: existing.id,
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

  const ready = await assertManualPayoutReady(userId);
  if (!ready.ok) return ready;

  let created: { withdrawalId: string; payoutRequestId: string };
  try {
    created = await db.$transaction(async (tx) => {
      const pending = await tx.creatorPayoutRequest.count({
        where: { userId, status: "PENDING", source: "ON_DEMAND" },
      });
      if (pending > 0) throw new Error("PENDING_EXISTS");

      const locked = await lockPlatformWalletRow(tx, userId);
      if (!locked || locked.settlementMocoPoints < quote.withdrawMoco) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      const updated = await tx.platformWallet.update({
        where: { id: locked.id },
        data: { settlementMocoPoints: { decrement: quote.withdrawMoco } },
      });
      await syncEarnedMocoDisplayTier(userId, updated.settlementMocoPoints, tx);

      const withdrawal = await tx.creatorMocoOnDemandWithdrawal.create({
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

      const request = await tx.creatorPayoutRequest.create({
        data: {
          userId,
          mocoAmount: quote.withdrawMoco,
          usdCents: quote.netTransferCents,
          amountMinor: quote.transfer.netMinor,
          currency: quote.transfer.currency,
          status: "PENDING",
          payoutMethodKind: ready.method.kind,
          payoutMethodHint: ready.method.hint,
          source: "ON_DEMAND",
          withdrawalId: withdrawal.id,
          idempotencyKey: idempotencyKey || null,
        },
      });

      await tx.platformWalletLedger.create({
        data: {
          walletId: locked.id,
          bucket: "SETTLEMENT_MOCO",
          delta: -quote.withdrawMoco,
          balanceAfter: updated.settlementMocoPoints,
          reason: "Manual reward payout request",
          referenceType: "creator_payout_request",
          referenceId: request.id,
        },
      });

      return { withdrawalId: withdrawal.id, payoutRequestId: request.id };
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
    if (e instanceof Error && e.message === "PENDING_EXISTS") {
      return {
        ok: false,
        code: "PAYOUT_ALREADY_PENDING",
        message: "You already have a payout waiting for manual payment.",
        status: 409,
      };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") {
      return {
        ok: false,
        code: "PAYOUT_ALREADY_PENDING",
        message: "You already have a payout waiting for manual payment.",
        status: 409,
      };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && idempotencyKey) {
      const raced = await db.creatorMocoOnDemandWithdrawal.findUnique({
        where: { idempotencyKey },
        select: { id: true, stripeTransferId: true },
      });
      const linked = raced
        ? await db.creatorPayoutRequest.findUnique({
            where: { withdrawalId: raced.id },
            select: { id: true },
          })
        : null;
      if (raced && linked) {
        return {
          ok: true,
          withdrawalId: raced.id,
          payoutRequestId: linked.id,
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

  return {
    ok: true,
    withdrawalId: created.withdrawalId,
    payoutRequestId: created.payoutRequestId,
    stripeTransferId: null,
  };
}
