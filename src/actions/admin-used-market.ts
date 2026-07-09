"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_USED_AUCTION_CONFIG } from "@/lib/used-auction-config";

export async function getUsedMarketBanStats(userId: string) {
  await requireAdmin();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      name: true,
      usedMarketBannedAt: true,
      usedMarketBanReason: true,
      usedMarketBanListingId: true,
      auctionWinCount: true,
      auctionPaymentDefaultCount: true,
      auctionLastPaymentDefaultAt: true,
    },
  });
  if (!user) return { error: "사용자를 찾을 수 없습니다." };

  const defaultRate =
    user.auctionWinCount > 0
      ? Math.round((user.auctionPaymentDefaultCount / user.auctionWinCount) * 100)
      : 0;

  return {
    user,
    defaultRate,
  };
}

export async function searchUsedMarketBannedUsers(q: string) {
  await requireAdmin();
  const term = q.trim();
  if (!term) {
    const rows = await db.user.findMany({
      where: { usedMarketBannedAt: { not: null } },
      select: {
        id: true,
        username: true,
        name: true,
        usedMarketBannedAt: true,
        auctionPaymentDefaultCount: true,
        auctionWinCount: true,
      },
      orderBy: { usedMarketBannedAt: "desc" },
      take: 30,
    });
    return { users: rows };
  }

  const rows = await db.user.findMany({
    where: {
      OR: [
        { username: { contains: term, mode: "insensitive" } },
        { name: { contains: term, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      username: true,
      name: true,
      usedMarketBannedAt: true,
      auctionPaymentDefaultCount: true,
      auctionWinCount: true,
    },
    take: 20,
  });
  return { users: rows };
}

export async function adminUnbanUsedMarket(targetId: string) {
  const admin = await requireAdmin();
  await db.user.update({
    where: { id: targetId },
    data: {
      usedMarketBannedAt: null,
      usedMarketBanReason: null,
      usedMarketBanListingId: null,
    },
  });
  await db.modLog.create({
    data: {
      actorId: admin.id,
      targetId,
      action: "used_market_unban",
      reason: "관리자 차단 해제",
    },
  });
  revalidatePath("/admin/used-market");
  return { success: true };
}

export async function getUsedAuctionAdminConfig() {
  await requireAdmin();
  try {
    const row = await db.usedAuctionConfig.findUnique({ where: { id: "default" } });
    return { config: row ?? DEFAULT_USED_AUCTION_CONFIG };
  } catch {
    return { config: DEFAULT_USED_AUCTION_CONFIG };
  }
}

export async function updateUsedAuctionAdminConfig(input: {
  depositEnabled?: boolean;
  depositRate?: number;
  paymentDeadlineHours?: number;
  negotiationDeadlineHours?: number;
}) {
  await requireAdmin();
  await db.usedAuctionConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      depositEnabled: input.depositEnabled ?? false,
      depositRate: input.depositRate ?? 0.05,
      paymentDeadlineHours: input.paymentDeadlineHours ?? 5,
      negotiationDeadlineHours: input.negotiationDeadlineHours ?? 24,
    },
    update: {
      ...(input.depositEnabled != null ? { depositEnabled: input.depositEnabled } : {}),
      ...(input.depositRate != null ? { depositRate: input.depositRate } : {}),
      ...(input.paymentDeadlineHours != null
        ? { paymentDeadlineHours: input.paymentDeadlineHours }
        : {}),
      ...(input.negotiationDeadlineHours != null
        ? { negotiationDeadlineHours: input.negotiationDeadlineHours }
        : {}),
    },
  });
  revalidatePath("/admin/used-market");
  return { success: true };
}
