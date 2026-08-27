import type { SupportTierLevel } from "@prisma/client";

/** Placeholder rankings shown until real supporters exceed these totals (USD cents). */
export const SUPPORT_RANKING_DEMO_USD_CENTS = {
  first: 1000,
  second: 500,
} as const;

export type SupportRankingRow = {
  total: number;
  isDemo?: boolean;
  user: {
    id: string;
    username: string;
    image: string | null;
    supportTierSent: SupportTierLevel;
  };
};

export const SUPPORT_RANKING_DEMO_ENTRIES: SupportRankingRow[] = [
  {
    isDemo: true,
    total: SUPPORT_RANKING_DEMO_USD_CENTS.first,
    user: {
      id: "__demo_support_rank_1__",
      username: "mocomo_demo_1",
      image: null,
      supportTierSent: "SEED",
    },
  },
  {
    isDemo: true,
    total: SUPPORT_RANKING_DEMO_USD_CENTS.second,
    user: {
      id: "__demo_support_rank_2__",
      username: "mocomo_demo_2",
      image: null,
      supportTierSent: "SEED",
    },
  },
];

export function mergeSupportRankingWithDemo(
  real: SupportRankingRow[],
  activeDemos: SupportRankingRow[],
  limit: number
): (SupportRankingRow & { rank: number })[] {
  const combined = [...real, ...activeDemos].sort((a, b) => b.total - a.total);
  return combined.slice(0, limit).map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}
