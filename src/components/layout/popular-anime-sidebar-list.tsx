"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { displayAnimeTitle, needsAnimeTitleAutoResolve } from "@/lib/anime-display-title";
import type { AnimeTitleFields } from "@/lib/anime-title-catalog";

export type SidebarPopularAnime = AnimeTitleFields & {
  id: string;
  viewCount: number;
};

/** 사이드바 인기 애니 탑10 — locale별 제목만 자동 현지화 */
export function PopularAnimeSidebarList({ animes }: { animes: SidebarPopularAnime[] }) {
  const { locale, t } = useLocale();
  const [autoTitles, setAutoTitles] = useState<Record<string, string>>({});

  const syncTitles = useMemo(
    () => Object.fromEntries(animes.map((a) => [a.slug, displayAnimeTitle(a, locale)])),
    [animes, locale]
  );

  useEffect(() => {
    if (!needsAnimeTitleAutoResolve(locale)) {
      setAutoTitles({});
      return;
    }

    let cancelled = false;
    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/anime/localize-titles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locale,
            items: animes.map((a) => ({
              slug: a.slug,
              title: a.title,
              titleEn: a.titleEn ?? null,
            })),
          }),
          signal: ac.signal,
        });
        const body = (await res.json()) as { ok?: boolean; titles?: Record<string, string> };
        if (!cancelled && body.ok && body.titles) setAutoTitles(body.titles);
      } catch {
        if (!cancelled) setAutoTitles({});
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [animes, locale]);

  if (animes.length === 0) {
    return (
      <Link href="/anime" className="text-xs text-primary hover:underline">
        {t("sidebar.animeHubLink")}
      </Link>
    );
  }

  return (
    <>
      {animes.map((a, i) => {
        const label = autoTitles[a.slug] ?? syncTitles[a.slug] ?? a.title;
        return (
          <Link
            key={a.id}
            href={`/anime/${a.slug}`}
            className="flex items-baseline gap-2 text-sm hover:text-folk-cobalt min-w-0 group"
          >
            <span className="shrink-0 w-5 text-right font-semibold tabular-nums text-folk-cobalt group-hover:underline">
              {i + 1}
            </span>
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </>
  );
}
