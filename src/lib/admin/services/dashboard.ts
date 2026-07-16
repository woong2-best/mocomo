import { startOfDay, startOfMonth, subDays } from "date-fns";
import { db } from "@/lib/db";

function dayStart(d = new Date()) {
  return startOfDay(d);
}

export async function getAdminDashboardData() {
  const now = new Date();
  const today = dayStart(now);
  const monthStart = startOfMonth(now);
  const weekAgo = subDays(today, 7);

  const [
    totalUsers,
    todaySignups,
    premiumUsers,
    creators,
    todayRevenue,
    monthRevenue,
    pendingPayouts,
    pendingReports,
    recentUsers,
    recentPayments,
    recentReports,
    recentPayouts,
    recentAudit,
    recentLogins,
  ] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.user.count({ where: { createdAt: { gte: today }, deletedAt: null } }),
    db.user.count({
      where: {
        deletedAt: null,
        OR: [
          { premiumTier: "PREMIUM" },
          { premiumUntil: { gt: now } },
        ],
      },
    }),
    db.user.count({
      where: {
        deletedAt: null,
        OR: [
          { creatorSupportsReceived: { some: {} } },
          { digitalProducts: { some: {} } },
          { creatorEpisodes: { some: {} } },
          { subscriptionsTo: { some: {} } },
          { totalSupportReceived: { gt: 0 } },
        ],
      },
    }),
    db.paymentIntent.aggregate({
      where: { status: "PAID", paidAt: { gte: today } },
      _sum: { amount: true },
      _count: true,
    }),
    db.paymentIntent.aggregate({
      where: { status: "PAID", paidAt: { gte: monthStart } },
      _sum: { amount: true },
      _count: true,
    }),
    db.payoutRequest.count({ where: { status: { in: ["PENDING", "APPROVED"] } } }),
    db.report.count({ where: { status: "PENDING" } }),
    db.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        createdAt: true,
        role: true,
      },
    }),
    db.paymentIntent.findMany({
      where: { status: "PAID" },
      orderBy: { paidAt: "desc" },
      take: 8,
      select: {
        id: true,
        amount: true,
        type: true,
        paidAt: true,
        user: { select: { username: true, id: true } },
      },
    }),
    db.report.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        reason: true,
        targetType: true,
        createdAt: true,
        reporter: { select: { username: true } },
      },
    }),
    db.payoutRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        user: { select: { username: true } },
      },
    }),
    db.siteAdminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        createdAt: true,
        actor: { select: { username: true } },
      },
    }),
    db.user.findMany({
      where: { lastLoginAt: { not: null }, deletedAt: null },
      orderBy: { lastLoginAt: "desc" },
      take: 8,
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        lastLoginAt: true,
      },
    }),
  ]);

  const signupSeries = await Promise.all(
    Array.from({ length: 7 }, async (_, i) => {
      const day = subDays(today, 6 - i);
      const next = subDays(today, 5 - i);
      const count = await db.user.count({
        where: { createdAt: { gte: day, lt: next }, deletedAt: null },
      });
      return { date: day.toISOString().slice(0, 10), count };
    })
  );

  const revenueSeries = await Promise.all(
    Array.from({ length: 7 }, async (_, i) => {
      const day = subDays(today, 6 - i);
      const next = subDays(today, 5 - i);
      const agg = await db.paymentIntent.aggregate({
        where: { status: "PAID", paidAt: { gte: day, lt: next } },
        _sum: { amount: true },
      });
      return { date: day.toISOString().slice(0, 10), amount: agg._sum.amount ?? 0 };
    })
  );

  return {
    stats: {
      totalUsers,
      todaySignups,
      premiumUsers,
      creators,
      todayRevenue: todayRevenue._sum.amount ?? 0,
      todayPaymentCount: todayRevenue._count,
      monthRevenue: monthRevenue._sum.amount ?? 0,
      monthPaymentCount: monthRevenue._count,
      pendingPayouts,
      pendingReports,
    },
    recentUsers,
    recentPayments,
    recentReports,
    recentPayouts,
    recentAudit,
    recentLogins,
    signupSeries,
    revenueSeries,
    weekAgo,
  };
}
