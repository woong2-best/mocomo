import { randomUUID } from "crypto";
import type { FlowerLedgerAction, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export function newIdempotencyKey(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

export async function flowerHeldBalanceKrw(userId: string, tx: Prisma.TransactionClient | typeof db = db) {
  const agg = await tx.flowerAsset.aggregate({
    where: { ownerId: userId, status: "HELD" },
    _sum: { faceValueKrw: true },
    _count: { _all: true },
  });
  return {
    balanceKrw: agg._sum.faceValueKrw ?? 0,
    assetCount: agg._count._all,
  };
}

export async function appendFlowerLedger(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    assetId?: string | null;
    action: FlowerLedgerAction;
    amountKrw: number;
    idempotencyKey: string;
    referenceType?: string;
    referenceId?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const existing = await tx.flowerLedgerEntry.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return existing;

  const { balanceKrw } = await flowerHeldBalanceKrw(input.userId, tx);
  return tx.flowerLedgerEntry.create({
    data: {
      userId: input.userId,
      assetId: input.assetId ?? null,
      action: input.action,
      amountKrw: input.amountKrw,
      balanceAfterKrw: balanceKrw,
      idempotencyKey: input.idempotencyKey,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function logFlowerAudit(input: {
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}) {
  try {
    await db.flowerAuditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        detail: input.detail?.slice(0, 4000),
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ip: input.ip ?? null,
      },
    });
  } catch (e) {
    console.error("[flower-audit]", e);
  }
}
