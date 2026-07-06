"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { displayAnimeTitle, needsAnimeTitleAutoResolve } from "@/lib/anime-display-title";
import type { CultureWikiHubItem } from "@/lib/culture-wiki-hub-data";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

const BADGE_KEYS: Record<CultureWikiHubItem["kind"], MessageKey> = {
  anime: "anime.badgeAnime",
  cosplayer: "anime.badgeCosplayer",
  cosplay: "anime.badgeCosplay",
};

export function CultureWikiHubList({
  items,
  numbered = false,
  showUpdatedAt = false,
  className,
}: {
  items: CultureWikiHubItem[];
  numbered?: boolean;
  showUpdatedAt?: boolean;
  className?: string;
}) {
  const { locale, t } = useLocale();
  const [autoTitles, setAutoTitles] = useState<Record<string, string>>({});

  const animeItems = useMemo(
    () => items.filter((item) => item.kind === "anime" && item.slug),
    [items]
  );

  const syncTitles = useMemo(
    () =>
      Object.fromEntries(
        animeItems.map((a) => [
          a.slug!,
          displayAnimeTitle({ title: a.title, titleEn: a.titleEn ?? null, slug: a.slug! }, locale),
        ])
      ),
    [animeItems, locale]
  );

  useEffect(() => {
    if (!needsAnimeTitleAutoResolve(locale) || animeItems.length === 0) {
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
            items: animeItems.map((a) => ({
              slug: a.slug!,
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
  }, [animeItems, locale]);

  function labelFor(item: CultureWikiHubItem) {
    if (item.kind === "anime" && item.slug) {
      return autoTitles[item.slug] ?? syncTitles[item.slug] ?? item.title;
    }
    return item.title;
  }

  function formatWhen(d: Date) {
    const tag =
      locale === "ko" ? "ko-KR" : locale === "ja" ? "ja-JP" : locale === "zh" ? "zh-CN" : "en-US";
    return new Intl.DateTimeFormat(tag, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  }

  return (
    <div className={className}>
      {items.map((item, i) => (
        <Link
          key={item.key}
          href={item.href}
          className={cn(
            numbered || showUpdatedAt
              ? "flex items-center gap-2 text-sm hover:text-folk-cobalt min-w-0"
              : "block text-sm min-w-0 hover:text-folk-cobalt"
          )}
        >
          {numbered && (
            <span className="w-5 text-right font-semibold text-folk-cobalt tabular-nums shrink-0">
              {i + 1}
            </span>
          )}
          <span className={cn("min-w-0 flex-1", numbered ? "truncate" : "flex flex-wrap items-center gap-1.5")}>
            <span className={numbered ? "truncate" : "truncate max-w-full"}>{labelFor(item)}</span>
            {item.kind !== "anime" && (
              <span className="text-[10px] font-medium text-pink-600 dark:text-pink-400 shrink-0">
                {t(BADGE_KEYS[item.kind])}
              </span>
            )}
          </span>
          {showUpdatedAt && item.updatedAt && (
            <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
              {formatWhen(item.updatedAt)}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
