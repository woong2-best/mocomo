import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type EconomyOperationKind =
  | "storage_consume"
  | "storage_return"
  | "market_buy"
  | "market_cancel"
  | "market_list"
  | "shop_purchase";

export type StoragePendingOp = {
  opId: string;
  itemId: string;
  amount: number;
  kind: "consume" | "return";
};

type TxClient = Prisma.TransactionClient;

/** 이미 처리된 opId면 false — 중복 적용 방지 */
export async function claimEconomyOperation(
  tx: TxClient,
  input: {
    opId: string;
    userId: string;
    kind: EconomyOperationKind;
    itemId?: string;
    amount?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<boolean> {
  const existing = await tx.aptEconomyOperation.findUnique({
    where: { id: input.opId },
  });
  if (existing) {
    if (existing.userId !== input.userId) {
      throw new Error("잘못된 동기화 요청입니다.");
    }
    return false;
  }
  await tx.aptEconomyOperation.create({
    data: {
      id: input.opId,
      userId: input.userId,
      kind: input.kind,
      itemId: input.itemId,
      amount: input.amount ?? 1,
      metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : undefined,
    },
  });
  return true;
}

export async function hasEconomyOperation(opId: string): Promise<boolean> {
  const row = await db.aptEconomyOperation.findUnique({ where: { id: opId } });
  return !!row;
}

/** 레거시 pending map → op 배열 (마이그레이션) */
export function legacyPendingToOps(
  pending: Record<string, number>
): StoragePendingOp[] {
  return Object.entries(pending)
    .filter(([, n]) => n > 0)
    .map(([itemId, amount]) => ({
      opId: `legacy-${itemId}-${amount}`,
      itemId,
      amount,
      kind: "consume" as const,
    }));
}

export function mergePendingOps(
  ops: StoragePendingOp[],
  legacy: Record<string, number>
): StoragePendingOp[] {
  const seen = new Set(ops.map((o) => o.opId));
  const merged = [...ops];
  for (const leg of legacyPendingToOps(legacy)) {
    if (!seen.has(leg.opId)) merged.push(leg);
  }
  return merged;
}
