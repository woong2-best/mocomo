import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  decodeSettlementHistoryCursor,
  encodeSettlementHistoryCursor,
  isHistoryItemBeforeCursor,
  mergeHistoryItemsDesc,
  type SettlementHistoryCursor,
} from "@/lib/settlement-moco/history-cursor";

export type UnifiedSettlementHistoryItem =
  | {
      kind: "monthly_cycle";
      id: string;
      at: string;
      periodYear: number;
      periodMonth: number;
      status: string;
      lockedMoco: number;
      deductedMoco: number;
      rolloverMoco: number;
      netAmountMinor: number | null;
      currency: string | null;
    }
  | {
      kind: "on_demand_withdrawal";
      id: string;
      at: string;
      status: string;
      withdrawMoco: number;
      balanceAfterMoco: number;
      payoutTier: string;
      activeTierBefore: string;
      activeTierAfter: string;
      netAmountMinor: number;
      currency: string;
      stripeTransferId: string | null;
    };

export type UnifiedSettlementHistoryPage = {
  items: UnifiedSettlementHistoryItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

function cycleCursorWhere(
  userId: string,
  cursor: SettlementHistoryCursor | null,
): Prisma.CreatorMocoSettlementCycleWhereInput {
  if (!cursor) return { userId };
  const cursorAt = new Date(cursor.at);
  return {
    userId,
    OR: [{ lockedAt: { lt: cursorAt } }, { lockedAt: cursorAt, id: { lt: cursor.id } }],
  };
}

function withdrawalCursorWhere(
  userId: string,
  cursor: SettlementHistoryCursor | null,
): Prisma.CreatorMocoOnDemandWithdrawalWhereInput {
  if (!cursor) return { userId };
  const cursorAt = new Date(cursor.at);
  return {
    userId,
    OR: [{ createdAt: { lt: cursorAt } }, { createdAt: cursorAt, id: { lt: cursor.id } }],
  };
}

async function fetchHistoryCandidates(
  userId: string,
  cursor: SettlementHistoryCursor | null,
  take: number,
): Promise<UnifiedSettlementHistoryItem[]> {
  const [cycles, withdrawals] = await Promise.all([
    db.creatorMocoSettlementCycle.findMany({
      where: cycleCursorWhere(userId, cursor),
      orderBy: [{ lockedAt: "desc" }, { id: "desc" }],
      take,
      include: {
        rewardPayoutBatch: {
          select: {
            netAmountMinor: true,
            currency: true,
          },
        },
      },
    }),
    db.creatorMocoOnDemandWithdrawal.findMany({
      where: withdrawalCursorWhere(userId, cursor),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
    }),
  ]);

  const merged: UnifiedSettlementHistoryItem[] = [
    ...cycles.map((c) => ({
      kind: "monthly_cycle" as const,
      id: c.id,
      at: c.lockedAt.toISOString(),
      periodYear: c.periodYear,
      periodMonth: c.periodMonth,
      status: c.status,
      lockedMoco: c.lockedMoco,
      deductedMoco: c.deductedMoco,
      rolloverMoco: c.rolloverMoco,
      netAmountMinor: c.rewardPayoutBatch?.netAmountMinor ?? null,
      currency: c.rewardPayoutBatch?.currency ?? null,
    })),
    ...withdrawals.map((w) => ({
      kind: "on_demand_withdrawal" as const,
      id: w.id,
      at: w.createdAt.toISOString(),
      status: w.status,
      withdrawMoco: w.withdrawMoco,
      balanceAfterMoco: w.balanceAfterMoco,
      payoutTier: w.payoutTier,
      activeTierBefore: w.activeTierBefore,
      activeTierAfter: w.activeTierAfter,
      netAmountMinor: w.netAmountMinor,
      currency: w.currency,
      stripeTransferId: w.stripeTransferId,
    })),
  ];

  if (!cursor) return merged;
  return merged.filter((row) => isHistoryItemBeforeCursor(row, cursor));
}

export async function getUnifiedSettlementHistoryPage(
  userId: string,
  opts?: { limit?: number; cursor?: string | null },
): Promise<UnifiedSettlementHistoryPage> {
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 20));
  const cursor = decodeSettlementHistoryCursor(opts?.cursor ?? null);
  const candidates = await fetchHistoryCandidates(userId, cursor, limit + 8);
  const { page, nextCursor, hasMore } = mergeHistoryItemsDesc(candidates, limit);

  return {
    items: page,
    nextCursor: nextCursor ? encodeSettlementHistoryCursor(nextCursor) : null,
    hasMore,
  };
}

/** @deprecated use getUnifiedSettlementHistoryPage */
export async function getUnifiedSettlementHistory(
  userId: string,
  limit = 40,
): Promise<UnifiedSettlementHistoryItem[]> {
  const page = await getUnifiedSettlementHistoryPage(userId, { limit });
  return page.items;
}
