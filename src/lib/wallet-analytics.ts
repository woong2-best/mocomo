import { db } from "@/lib/db";
import { EARNING_SOURCE_LABELS, MONTH_LABELS } from "@/lib/wallet-labels";
import { getWalletSummary } from "@/lib/settlement";
import { buildTransactionSeries, type WalletTransactionPoint } from "@/lib/wallet-timeseries";
import { resolveEarningCategory, type EarningCategory } from "@/lib/wallet-earning-categories";

export type { WalletTransactionPoint };

export type WalletEnrichedTransaction = WalletTransactionPoint & {
  category: EarningCategory;
  payerUsername: string | null;
};

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
  transactions: WalletEnrichedTransaction[];
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
      select: {
        id: true,
        type: true,
        amount: true,
        createdAt: true,
        referenceType: true,
        referenceId: true,
        paymentIntentId: true,
        memo: true,
      },
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

  const transactions = await enrichWalletTransactions(entries);

  return {
    year,
    years,
    months: withCumulative,
    transactions,
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

async function enrichWalletTransactions(
  entries: {
    id: string;
    type: string;
    amount: number;
    createdAt: Date;
    referenceType: string | null;
    referenceId: string | null;
    paymentIntentId: string | null;
    memo: string | null;
  }[]
): Promise<WalletEnrichedTransaction[]> {
  const base = buildTransactionSeries(entries);
  const entryById = new Map(entries.map((e) => [e.id, e]));

  const piIds = [...new Set(entries.map((e) => e.paymentIntentId).filter(Boolean))] as string[];
  const paymentIntents =
    piIds.length > 0
      ? await db.paymentIntent.findMany({
          where: { id: { in: piIds } },
          select: { id: true, user: { select: { username: true } } },
        })
      : [];
  const piPayer = new Map(paymentIntents.map((pi) => [pi.id, pi.user.username]));

  const marketplaceIds = entries
    .filter((e) => e.referenceType === "marketplace_escrow" && e.referenceId)
    .map((e) => e.referenceId!);
  const orders =
    marketplaceIds.length > 0
      ? await db.marketplaceOrder.findMany({
          where: { id: { in: marketplaceIds } },
          select: { id: true, buyer: { select: { username: true } } },
        })
      : [];
  const orderBuyer = new Map(orders.map((o) => [o.id, o.buyer.username]));

  return base.map((tx) => {
    const entry = entryById.get(tx.id);
    const category = resolveEarningCategory(entry?.referenceType ?? null, entry?.type ?? tx.type);
    let payerUsername: string | null = null;
    if (entry?.paymentIntentId) {
      payerUsername = piPayer.get(entry.paymentIntentId) ?? null;
    }
    if (!payerUsername && entry?.referenceType === "marketplace_escrow" && entry.referenceId) {
      payerUsername = orderBuyer.get(entry.referenceId) ?? null;
    }
    // tip credits store paymentIntentId as referenceId; memo often embeds @username
    if (!payerUsername && entry?.memo) {
      const m = entry.memo.match(/@([A-Za-z0-9_.]{2,32})/);
      if (m?.[1]) payerUsername = m[1];
    }
    return { ...tx, category, payerUsername };
  });
}
