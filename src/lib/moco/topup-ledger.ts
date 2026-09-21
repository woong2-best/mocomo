import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { quoteMocoTopupLedger } from "@/lib/moco/stripe-pass-through";

type Tx = Prisma.TransactionClient;

export async function recordMocoTopupTransaction(
  tx: Tx,
  input: {
    userId: string;
    mocoQuantity: number;
    paymentIntentId: string;
    stripePaymentRef: string;
    grossAmountCents: number;
  }
) {
  const existing = await tx.mocoTopupTransaction.findUnique({
    where: { paymentIntentId: input.paymentIntentId },
  });
  if (existing) return existing;

  const ledger = quoteMocoTopupLedger(input.mocoQuantity);
  if (ledger.grossAmountCents !== input.grossAmountCents) {
    throw new Error("MOCO_TOPUP_GROSS_MISMATCH");
  }

  return tx.mocoTopupTransaction.create({
    data: {
      userId: input.userId,
      mocoQuantity: ledger.mocoQuantity,
      basePriceCents: ledger.basePriceCents,
      pgFeeCents: ledger.pgFeeCents,
      grossAmountCents: ledger.grossAmountCents,
      platformRevenueCents: ledger.platformRevenueCents,
      creatorAllocationCents: ledger.creatorAllocationCents,
      status: "SUCCEEDED",
      paymentIntentId: input.paymentIntentId,
      stripePaymentRef: input.stripePaymentRef,
    },
  });
}

export async function creditCreatorAllocationCents(
  tx: Tx,
  creatorId: string,
  allocationCents: number
) {
  if (allocationCents <= 0) return;
  await tx.creatorBalance.upsert({
    where: { creatorId },
    create: {
      creatorId,
      accumulatedAllocationCents: allocationCents,
    },
    update: {
      accumulatedAllocationCents: { increment: allocationCents },
    },
  });
}

/** Earned MOCO from tips — face value × 95% (integer cents). */
export function creatorAllocationCentsFromMoco(moco: number): number {
  const ledger = quoteMocoTopupLedger(Math.max(0, Math.floor(moco)));
  return ledger.creatorAllocationCents;
}

export async function getCreatorBalanceCents(creatorId: string): Promise<number> {
  const row = await db.creatorBalance.findUnique({ where: { creatorId } });
  return row?.accumulatedAllocationCents ?? 0;
}
