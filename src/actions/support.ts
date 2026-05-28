"use server";

import { cache } from "react";
import { db } from "@/lib/db";
import { getCachedSession } from "@/lib/auth";
import { getTipRanking } from "@/actions/monetization";
import { getTierInfo, getNextTierInfo, tierFromAmount } from "@/lib/tiers";
import { revalidatePath } from "next/cache";
import { SupportTierLevel } from "@prisma/client";

export async function tipCreatorAction(
  _receiverId: string,
  _username: string,
  _amount: number,
  _message?: string
) {
  return { error: "결제 창을 통해 후원해 주세요." };
}

export async function getCreatorSupportSummary(creatorId: string) {
  const [totalAgg, supporterCount, topSupporters, recentTips] = await Promise.all([
    db.tip.aggregate({
      where: { receiverId: creatorId },
      _sum: { amount: true },
      _count: { id: true },
    }),
    db.creatorSupport.count({ where: { creatorId } }),
    db.creatorSupport.findMany({
      where: { creatorId },
      orderBy: { totalAmount: "desc" },
      take: 8,
      include: {
        supporter: {
          select: { id: true, username: true, name: true, image: true, supportTierSent: true },
        },
      },
    }),
    db.tip.findMany({
      where: { receiverId: creatorId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        sender: { select: { username: true, name: true, image: true, supportTierSent: true } },
      },
    }),
  ]);

  return {
    totalAmount: totalAgg._sum.amount ?? 0,
    tipCount: totalAgg._count.id,
    supporterCount,
    topSupporters,
    recentTips,
  };
}

export const getViewerSupportForCreator = cache(async (creatorId: string) => {
  const session = await getCachedSession();
  if (!session?.user?.id) return null;
  const row = await db.creatorSupport.findUnique({
    where: {
      supporterId_creatorId: {
        supporterId: session.user.id,
        creatorId,
      },
    },
  });
  if (!row) return null;
  return {
    tier: row.tier,
    totalAmount: row.totalAmount,
    info: getTierInfo(row.tier),
    nextTier: getNextTierInfo(row.totalAmount),
  };
});

export async function getViewerPlatformSupport() {
  const session = await getCachedSession();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      totalSupportSent: true,
      supportTierSent: true,
      totalSupportReceived: true,
      supportTierReceived: true,
    },
  });
  if (!user) return null;
  return {
    sent: {
      total: user.totalSupportSent,
      tier: user.supportTierSent,
      info: getTierInfo(user.supportTierSent),
      next: getNextTierInfo(user.totalSupportSent),
    },
    received: {
      total: user.totalSupportReceived,
      tier: user.supportTierReceived,
      info: getTierInfo(user.supportTierReceived),
      next: getNextTierInfo(user.totalSupportReceived),
    },
  };
}

export async function getSupportDashboard() {
  const session = await getCachedSession();
  if (!session?.user?.id) return null;

  const userId = session.user.id;

  const [sentSupports, receivedAgg, receivedTips, sentTips] = await Promise.all([
    db.creatorSupport.findMany({
      where: { supporterId: userId },
      take: 50,
      include: { creator: { select: { username: true, name: true, image: true } } },
      orderBy: { totalAmount: "desc" },
    }),
    db.tip.aggregate({
      where: { receiverId: userId },
      _sum: { amount: true },
      _count: { id: true },
    }),
    db.tip.findMany({
      where: { receiverId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { sender: { select: { username: true, name: true, image: true } } },
    }),
    db.tip.findMany({
      where: { senderId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { receiver: { select: { username: true, name: true, image: true } } },
    }),
  ]);

  const totalReceived = receivedAgg._sum.amount ?? 0;
  const ranking = await getTipRanking(20);
  const myRank = ranking.findIndex((r) => r.user?.id === userId) + 1;

  const me = await db.user.findUnique({
    where: { id: userId },
    select: {
      totalSupportSent: true,
      supportTierSent: true,
      totalSupportReceived: true,
      supportTierReceived: true,
    },
  });

  return {
    sentSupports,
    totalReceived,
    receivedTipCount: receivedAgg._count.id,
    receivedTips,
    sentTips,
    myRank: myRank > 0 ? myRank : null,
    ranking: ranking.slice(0, 10),
    platform: me
      ? {
          sentTotal: me.totalSupportSent,
          sentTier: me.supportTierSent,
          receivedTotal: me.totalSupportReceived,
          receivedTier: me.supportTierReceived,
        }
      : null,
  };
}

export type SupportDashboard = NonNullable<Awaited<ReturnType<typeof getSupportDashboard>>>;
