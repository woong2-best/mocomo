import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { userDisplayName } from "@/lib/user-public-select";

type Tx = Prisma.TransactionClient;

export type ContributionTowerBlockDto = {
  id: string;
  stackOrder: number;
  userId: string;
  username: string;
  displayName: string;
  profileImageUrl: string | null;
  mocoQuantity: number;
  createdAt: string;
};

function toDto(row: {
  id: string;
  stackOrder: number;
  userId: string;
  username: string;
  displayName: string | null;
  profileImageUrl: string | null;
  mocoQuantity: number;
  createdAt: Date;
}): ContributionTowerBlockDto {
  return {
    id: row.id,
    stackOrder: row.stackOrder,
    userId: row.userId,
    username: row.username,
    displayName: row.displayName?.trim() || row.username,
    profileImageUrl: row.profileImageUrl,
    mocoQuantity: row.mocoQuantity,
    createdAt: row.createdAt.toISOString(),
  };
}

/** 결제 충전 1건당 기여 탑 블록 1개 — idempotent on gemPurchaseId / PI id */
export async function registerContributionTowerBlock(
  tx: Tx,
  input: {
    userId: string;
    gemPurchaseId: string;
    stripePaymentIntentId: string;
    mocoQuantity: number;
  }
): Promise<void> {
  const existing = await tx.mocoContributionTowerBlock.findFirst({
    where: {
      OR: [{ gemPurchaseId: input.gemPurchaseId }, { stripePaymentIntentId: input.stripePaymentIntentId }],
    },
    select: { id: true },
  });
  if (existing) return;

  const user = await tx.user.findUnique({
    where: { id: input.userId },
    select: { id: true, username: true, name: true, image: true },
  });
  if (!user) return;

  await tx.mocoContributionTowerBlock.create({
    data: {
      userId: user.id,
      gemPurchaseId: input.gemPurchaseId,
      stripePaymentIntentId: input.stripePaymentIntentId,
      mocoQuantity: input.mocoQuantity,
      username: user.username,
      displayName: userDisplayName(user),
      profileImageUrl: user.image,
    },
  });
}

export async function hideContributionTowerBlockForPurchase(gemPurchaseId: string): Promise<void> {
  await db.mocoContributionTowerBlock.updateMany({
    where: { gemPurchaseId, visible: true },
    data: { visible: false, removedAt: new Date() },
  });
}

const DEFAULT_LIMIT = 80;

export async function listContributionTowerBlocks(input?: {
  /** Poll: blocks newer than this stack order */
  afterStackOrder?: number;
  /** Scroll up: blocks older than this stack order */
  beforeStackOrder?: number;
  limit?: number;
}): Promise<{ blocks: ContributionTowerBlockDto[]; totalVisible: number }> {
  const limit = Math.min(Math.max(input?.limit ?? DEFAULT_LIMIT, 1), 200);
  const baseWhere: Prisma.MocoContributionTowerBlockWhereInput = {
    visible: true,
    removedAt: null,
  };

  const where: Prisma.MocoContributionTowerBlockWhereInput = {
    ...baseWhere,
    ...(input?.afterStackOrder != null ? { stackOrder: { gt: input.afterStackOrder } } : {}),
    ...(input?.beforeStackOrder != null ? { stackOrder: { lt: input.beforeStackOrder } } : {}),
  };

  const orderBy =
    input?.afterStackOrder != null
      ? ({ stackOrder: "asc" } as const)
      : input?.beforeStackOrder != null
        ? ({ stackOrder: "desc" } as const)
        : ({ stackOrder: "desc" } as const);

  const [rows, totalVisible] = await Promise.all([
    db.mocoContributionTowerBlock.findMany({
      where,
      orderBy,
      take: limit,
      select: {
        id: true,
        stackOrder: true,
        userId: true,
        username: true,
        displayName: true,
        profileImageUrl: true,
        mocoQuantity: true,
        createdAt: true,
      },
    }),
    db.mocoContributionTowerBlock.count({ where: baseWhere }),
  ]);

  const blocks =
    input?.afterStackOrder != null
      ? rows.map(toDto)
      : [...rows].reverse().map(toDto);

  return { blocks, totalVisible };
}
