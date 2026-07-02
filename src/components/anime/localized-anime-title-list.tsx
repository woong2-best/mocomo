"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { displayAnimeTitle, needsAnimeTitleAutoResolve } from "@/lib/anime-display-title";
import type { AnimeTitleFields } from "@/lib/anime-title-catalog";

export type LocalizedAnimeListItem = AnimeTitleFields;

type Props = {
  items: LocalizedAnimeListItem[];
  numbered?: boolean;
  className?: string;
};

/** 애니 제목 — locale별 표시 (사이드바·위키 허브 공용) */
export function LocalizedAnimeTitleList({ items, numbered = false, className }: Props) {
  const { locale } = useLocale();
  const [autoTitles, setAutoTitles] = useState<Record<string, string>>({});

  const syncTitles = useMemo(
    () => Object.fromEntries(items.map((a) => [a.slug, displayAnimeTitle(a, locale)])),
    [items, locale]
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
            items: items.map((a) => ({
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
  }, [items, locale]);

  return (
    <div className={className}>
      {items.map((a, i) => {
        const label = autoTitles[a.slug] ?? syncTitles[a.slug] ?? a.title;
        return (
          <Link
            key={a.slug}
            href={`/anime/${a.slug}`}
            className={
              numbered
                ? "flex gap-2 text-sm hover:text-folk-cobalt min-w-0"
                : "block text-sm truncate hover:text-folk-cobalt"
            }
          >
            {numbered && (
              <span className="w-5 text-right font-semibold text-folk-cobalt tabular-nums shrink-0">
                {i + 1}
              </span>
            )}
            <span className={numbered ? "truncate" : undefined}>{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
