import { db } from "@/lib/db";
import { EARNING_SOURCE_LABELS, MONTH_LABELS } from "@/lib/wallet-labels";
import { getWalletSummary } from "@/lib/settlement";

export type WalletMonthBucket = {
  month: number;
  label: string;
  earned: number;
  withdrawn: number;
  net: number;
  cumulative: number;
};

export type WalletEarningsAnalytics = {
  year: number;
  years: number[];
  months: WalletMonthBucket[];
  yearEarned: number;
  yearWithdrawn: number;
  yearNet: number;
  bySource: { key: string; label: string; amount: number }[];
  summary: {
    availableBalance: number;
    totalEarned: number;
    totalWithdrawn: number;
    pendingPayout: number;
    withdrawable: number;
  };
};

function emptyMonths(): Omit<WalletMonthBucket, "cumulative">[] {
  return MONTH_LABELS.map((label, i) => ({
    month: i + 1,
    label,
    earned: 0,
    withdrawn: 0,
    net: 0,
  }));
}

export async function getWalletEarningsAnalytics(
  userId: string,
  yearInput?: number
): Promise<WalletEarningsAnalytics> {
  const currentYear = new Date().getFullYear();
  const year = yearInput && yearInput >= 2000 && yearInput <= currentYear + 1 ? yearInput : currentYear;

  const [summary, firstEntry, entries] = await Promise.all([
    getWalletSummary(userId),
    db.ledgerEntry.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    db.ledgerEntry.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
        type: { in: ["SELLER_EARNING", "PAYOUT_REQUEST", "PAYOUT_REJECTED"] },
      },
      select: { type: true, amount: true, createdAt: true, referenceType: true },
    }),
  ]);

  const startYear = firstEntry?.createdAt.getFullYear() ?? currentYear;
  const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) => startYear + i);

  const months = emptyMonths();
  const bySourceMap: Record<string, number> = {};

  for (const entry of entries) {
    const idx = entry.createdAt.getMonth();
    if (entry.type === "SELLER_EARNING") {
      months[idx].earned += entry.amount;
      const key = entry.referenceType ?? "other";
      bySourceMap[key] = (bySourceMap[key] ?? 0) + entry.amount;
    } else if (entry.type === "PAYOUT_REQUEST") {
      months[idx].withdrawn += entry.amount;
    } else if (entry.type === "PAYOUT_REJECTED") {
      months[idx].earned += entry.amount;
    }
  }

  let cumulative = 0;
  const withCumulative: WalletMonthBucket[] = months.map((m) => {
    const net = m.earned - m.withdrawn;
    cumulative += net;
    return { ...m, net, cumulative };
  });

  const yearEarned = withCumulative.reduce((s, m) => s + m.earned, 0);
  const yearWithdrawn = withCumulative.reduce((s, m) => s + m.withdrawn, 0);

  const bySource = Object.entries(bySourceMap)
    .map(([key, amount]) => ({
      key,
      label: EARNING_SOURCE_LABELS[key] ?? key,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  const withdrawable = Math.max(0, summary.availableBalance - summary.pendingPayout);

  return {
    year,
    years,
    months: withCumulative,
    yearEarned,
    yearWithdrawn,
    yearNet: yearEarned - yearWithdrawn,
    bySource,
    summary: {
      availableBalance: summary.availableBalance,
      totalEarned: summary.totalEarned,
      totalWithdrawn: summary.totalWithdrawn,
      pendingPayout: summary.pendingPayout,
      withdrawable,
    },
  };
}
