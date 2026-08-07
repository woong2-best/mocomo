"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { displayAnimeTitle, needsAnimeTitleAutoResolve } from "@/lib/anime-display-title";
import { animeSlugFromTitle, isValidAnimeSlug } from "@/lib/utils";

export type AnimeHubCatalogItem = {
  id: string;
  slug: string;
  title: string;
  titleEn: string | null;
  coverUrl: string | null;
  genreEmoji: string;
};

export function AnimeHubCatalog({
  items,
  emptyTitle,
  emptyHint,
  emptyLinkHref,
  emptyLinkLabel,
}: {
  items: AnimeHubCatalogItem[];
  emptyTitle: string;
  emptyHint: string;
  emptyLinkHref: string;
  emptyLinkLabel: string;
}) {
  const { locale } = useLocale();
  const [autoTitles, setAutoTitles] = useState<Record<string, string>>({});

  const syncTitles = useMemo(
    () =>
      Object.fromEntries(
        items.map((a) => [
          a.slug,
          displayAnimeTitle({ title: a.title, titleEn: a.titleEn, slug: a.slug }, locale),
        ])
      ),
    [items, locale]
  );

  useEffect(() => {
    if (!needsAnimeTitleAutoResolve(locale) || items.length === 0) {
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
              titleEn: a.titleEn,
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

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-12 text-center space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{emptyTitle}</p>
        <p className="text-xs text-muted-foreground">
          {emptyHint}{" "}
          <Link href={emptyLinkHref} className="text-[#0096fa] font-semibold hover:underline">
            {emptyLinkLabel}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((item) => {
        const href = isValidAnimeSlug(item.slug)
          ? `/anime/${item.slug}`
          : `/anime/${animeSlugFromTitle(item.title, item.titleEn)}`;
        const label = autoTitles[item.slug] ?? syncTitles[item.slug] ?? item.title;
        return (
          <article key={item.id}>
            <Link href={href} className="group block">
              <div className="relative overflow-hidden rounded-lg border border-border/50 bg-muted/20 shadow-sm">
                {item.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.coverUrl}
                    alt=""
                    className="w-full aspect-[3/4] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full aspect-[3/4] flex items-center justify-center text-4xl bg-muted/30">
                    {item.genreEmoji}
                  </div>
                )}
              </div>
              <p className="mt-2 min-h-[2.5rem] px-0.5 text-xs font-semibold leading-snug line-clamp-2 group-hover:text-[#0096fa] transition-colors">
                {label}
              </p>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
