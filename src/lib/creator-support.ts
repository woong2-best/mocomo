import type { SupportTierLevel } from "@prisma/client";
import { db } from "@/lib/db";
import {
  liveChatSupportTierFromAmount,
  supportTierAmountBounds,
  tierFromAmount,
} from "@/lib/tiers";

export type SupportedUserAtTier = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  totalAmount: number;
};

function mocoUnits(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.max(1, Math.round(amount));
}

/** Whole MOCO counted toward creator-support tiers from a live donation row. */
export function mocoDonationSupportUnits(row: {
  mocoAmount: number;
  mocoAmountTenths?: number | null;
  mocoCenti?: number | null;
}): number {
  if ((row.mocoCenti ?? 0) > 0) {
    return mocoUnits(row.mocoCenti! / 100);
  }
  return mocoUnits(row.mocoAmount + (row.mocoAmountTenths ?? 0) / 10);
}

const countedDonationWhere = {
  refundedAt: null,
  status: { not: "CANCELLED" as const },
};

function amountInTier(amount: number, level: SupportTierLevel): boolean {
  if (amount <= 0) return false;
  const bounds = supportTierAmountBounds(level);
  if (amount < bounds.minInclusive) return false;
  if (bounds.maxExclusive != null && amount >= bounds.maxExclusive) return false;
  return true;
}

function mergeAmount(map: Map<string, number>, id: string, amount: number) {
  if (amount <= 0) return;
  map.set(id, Math.max(map.get(id) ?? 0, amount));
}

export async function listCreatorsISupportedAtTier(
  supporterId: string,
  level: SupportTierLevel
): Promise<SupportedUserAtTier[]> {
  const [rows, donations] = await Promise.all([
    db.creatorSupport.findMany({
      where: { supporterId, totalAmount: { gt: 0 } },
      select: {
        totalAmount: true,
        creator: {
          select: { id: true, username: true, name: true, image: true },
        },
      },
    }),
    db.mocoDonation.groupBy({
      by: ["streamerId"],
      where: { userId: supporterId, ...countedDonationWhere },
      _sum: { mocoAmount: true },
    }),
  ]);

  const amounts = new Map<string, number>();
  const users = new Map<string, Omit<SupportedUserAtTier, "totalAmount">>();
  for (const row of rows) {
    mergeAmount(amounts, row.creator.id, row.totalAmount);
    users.set(row.creator.id, {
      id: row.creator.id,
      username: row.creator.username,
      name: row.creator.name,
      image: row.creator.image,
    });
  }
  for (const row of donations) {
    mergeAmount(amounts, row.streamerId, row._sum.mocoAmount ?? 0);
  }

  const missingIds = [...amounts.keys()].filter((id) => !users.has(id));
  if (missingIds.length > 0) {
    const extra = await db.user.findMany({
      where: { id: { in: missingIds } },
      select: { id: true, username: true, name: true, image: true },
    });
    for (const user of extra) {
      users.set(user.id, user);
    }
  }

  return [...amounts.entries()]
    .filter(([id, amount]) => users.has(id) && amountInTier(amount, level))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 80)
    .map(([id, totalAmount]) => ({
      ...users.get(id)!,
      totalAmount,
    }));
}

export async function getSupportTiersToCreator(
  creatorId: string,
  supporterIds: string[]
): Promise<Map<string, SupportTierLevel | null>> {
  const unique = [...new Set(supporterIds.filter(Boolean))];
  const map = new Map<string, SupportTierLevel | null>(unique.map((id) => [id, null]));
  if (!creatorId || unique.length === 0) return map;

  const [rows, donations] = await Promise.all([
    db.creatorSupport.findMany({
      where: {
        creatorId,
        supporterId: { in: unique },
        totalAmount: { gt: 0 },
      },
      select: { supporterId: true, totalAmount: true },
    }),
    db.mocoDonation.groupBy({
      by: ["userId"],
      where: {
        streamerId: creatorId,
        userId: { in: unique },
        ...countedDonationWhere,
      },
      _sum: { mocoAmount: true },
    }),
  ]);

  const amounts = new Map<string, number>();
  for (const row of rows) mergeAmount(amounts, row.supporterId, row.totalAmount);
  for (const row of donations) mergeAmount(amounts, row.userId, row._sum.mocoAmount ?? 0);

  for (const [id, amount] of amounts) {
    map.set(id, liveChatSupportTierFromAmount(amount));
  }
  return map;
}

export async function applyCreatorSupportDelta(
  senderId: string,
  receiverId: string,
  mocoDelta: number
): Promise<void> {
  if (!senderId || !receiverId || senderId === receiverId) return;
  const delta = Math.trunc(mocoDelta);
  if (delta === 0) return;

  await db.$transaction(async (tx) => {
    const existing = await tx.creatorSupport.findUnique({
      where: { supporterId_creatorId: { supporterId: senderId, creatorId: receiverId } },
      select: { totalAmount: true },
    });
    const newTotal = Math.max(0, (existing?.totalAmount ?? 0) + delta);
    const pairTier = newTotal > 0 ? tierFromAmount(newTotal) : "SEED";

    await tx.creatorSupport.upsert({
      where: { supporterId_creatorId: { supporterId: senderId, creatorId: receiverId } },
      create: {
        supporterId: senderId,
        creatorId: receiverId,
        totalAmount: newTotal,
        tier: pairTier,
      },
      update: { totalAmount: newTotal, tier: pairTier },
    });

    const [sender, receiver] = await Promise.all([
      tx.user.findUnique({ where: { id: senderId }, select: { totalSupportSent: true } }),
      tx.user.findUnique({ where: { id: receiverId }, select: { totalSupportReceived: true } }),
    ]);
    const newSent = Math.max(0, (sender?.totalSupportSent ?? 0) + delta);
    const newReceived = Math.max(0, (receiver?.totalSupportReceived ?? 0) + delta);

    await tx.user.update({
      where: { id: senderId },
      data: {
        totalSupportSent: newSent,
        supportTierSent: newSent > 0 ? tierFromAmount(newSent) : "SEED",
      },
    });
    await tx.user.update({
      where: { id: receiverId },
      data: {
        totalSupportReceived: newReceived,
        supportTierReceived: newReceived > 0 ? tierFromAmount(newReceived) : "SEED",
      },
    });
  });
}
