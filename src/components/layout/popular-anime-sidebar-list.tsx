"use client";

import Link from "next/link";
import { useLocale } from "@/components/providers/locale-provider";
import { LocalizedAnimeTitleList } from "@/components/anime/localized-anime-title-list";
import type { AnimeTitleFields } from "@/lib/anime-title-catalog";

export type SidebarPopularAnime = AnimeTitleFields & {
  id: string;
  viewCount: number;
};

/** 사이드바 인기 애니 탑10 — locale별 제목만 자동 현지화 */
export function PopularAnimeSidebarList({ animes }: { animes: SidebarPopularAnime[] }) {
  const { t } = useLocale();

  if (animes.length === 0) {
    return (
      <Link href="/anime" className="text-xs text-primary hover:underline">
        {t("sidebar.animeHubLink")}
      </Link>
    );
  }

  return <LocalizedAnimeTitleList items={animes} numbered className="space-y-2" />;
}
