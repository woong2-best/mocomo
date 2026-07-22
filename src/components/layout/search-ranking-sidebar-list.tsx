"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/locale-provider";

export type SidebarTrendingQuery = {
  rank: number;
  id: string;
  label: string;
  count: number;
};

/** 사이드바 검색어 순위 TOP10 */
export function SearchRankingSidebarList({
  items,
}: {
  items: SidebarTrendingQuery[];
}) {
  const { t } = useLocale();

  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">{t("sidebar.searchRankingEmpty")}</p>
    );
  }

  return (
    <ol className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/search?q=${encodeURIComponent(item.label)}`}
            className="flex items-baseline gap-2 text-sm text-folk-cobalt dark:text-white hover:underline"
          >
            <span className="w-5 shrink-0 font-bold tabular-nums">{item.rank}</span>
            <span className="min-w-0 truncate font-medium">{item.label}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
