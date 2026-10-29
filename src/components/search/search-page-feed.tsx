"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FeedTimelinePostCard } from "@/components/feed/feed-timeline-post-card";
import { SearchUserRow } from "@/components/search/search-user-row";
import { displayAnimeTitle } from "@/lib/anime-display-title";
import { postHasVisualMedia } from "@/lib/format-feed";
import type { GridPost } from "@/components/feed/feed-post-card";
import {
  parseSearchPageFilter,
  type SearchPageFilter,
  type SearchPageUser,
} from "@/lib/search-page-shared";
import { useLocale } from "@/components/providers/locale-provider";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

const TABS: { id: SearchPageFilter; labelKey: "search.syvug" | "search.s10004" | "search.sxs2o" | "search.tab.media" }[] = [
  { id: "top", labelKey: "search.syvug" },
  { id: "latest", labelKey: "search.s10004" },
  { id: "people", labelKey: "search.sxs2o" },
  { id: "media", labelKey: "search.tab.media" },
];

function parseFilterFromUrl(): SearchPageFilter {
  if (typeof window === "undefined") return "top";
  return parseSearchPageFilter(new URLSearchParams(window.location.search).get("f"));
}

export function SearchPageFeed({
  query,
  scope = "global",
  initialFilter,
  users,
  postsTop,
  postsLatest,
  animes,
  related,
  viewerId,
  paymentsEnabled = false,
}: {
  query: string;
  scope?: "global" | "social";
  initialFilter: SearchPageFilter;
  users: SearchPageUser[];
  postsTop: Array<GridPost & { createdAt: string | Date }>;
  postsLatest: Array<GridPost & { createdAt: string | Date }>;
  animes: { slug: string; title: string; titleEn: string | null; coverUrl: string | null }[];
  related: { query: string; normalized: string }[];
  viewerId: string | null;
  paymentsEnabled?: boolean;
}) {
  const { locale, t } = useLocale();
  const { isNativeApp } = useClientPlatform();
  const [filter, setFilter] = useState<SearchPageFilter>(initialFilter);

  useEffect(() => {
    setFilter(initialFilter);
  }, [query, initialFilter]);

  useEffect(() => {
    function onPopState() {
      setFilter(parseFilterFromUrl());
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const selectFilter = useCallback((next: SearchPageFilter) => {
    setFilter(next);
    const url = new URL(window.location.href);
    if (next === "top") url.searchParams.delete("f");
    else url.searchParams.set("f", next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const mediaPosts = useMemo(() => {
    const seen = new Set<string>();
    return [...postsLatest, ...postsTop].filter((post) => {
      if (!postHasVisualMedia(post) || seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    });
  }, [postsLatest, postsTop]);

  const topPreviewUsers = users.slice(0, 3);
  const showAnimes = scope !== "social" && animes.length > 0 && filter === "top";

  return (
    <div className="min-w-0">
      <nav
        className={cn(
          "sticky z-40 flex border-b border-border/80 bg-background/95 backdrop-blur-md",
          isNativeApp ? "top-[calc(3.25rem+env(safe-area-inset-top,0px))]" : "top-14"
        )}
        aria-label={t("search.filterAria")}
      >
        {TABS.map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectFilter(tab.id)}
              className={cn(
                "relative flex-1 border-b-2 py-3 text-center text-sm font-semibold transition-colors",
                active
                  ? "border-folk-cobalt text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              {t(tab.labelKey)}
            </button>
          );
        })}
      </nav>

      {filter === "people" ? (
        <PeopleList users={users} viewerId={viewerId} empty={t("search.emptyPeople")} />
      ) : null}

      {filter === "latest" ? (
        <PostList
          posts={postsLatest}
          paymentsEnabled={paymentsEnabled}
          empty={t("search.emptyPosts")}
        />
      ) : null}

      {filter === "media" ? (
        <PostList
          posts={mediaPosts}
          paymentsEnabled={paymentsEnabled}
          empty={t("search.emptyMedia")}
        />
      ) : null}

      {filter === "top" ? (
        <div>
          {topPreviewUsers.length > 0 ? (
            <section className="border-b border-border/70">
              {topPreviewUsers.map((user) => (
                <SearchUserRow
                  key={user.id}
                  user={user}
                  viewerId={viewerId}
                  className="border-b border-border/60 last:border-b-0"
                />
              ))}
              {users.length > topPreviewUsers.length ? (
                <button
                  type="button"
                  onClick={() => selectFilter("people")}
                  className="w-full px-4 py-3 text-left text-sm font-medium text-folk-cobalt hover:bg-muted/40"
                >
                  {t("search.seeAllPeople")}
                </button>
              ) : null}
            </section>
          ) : null}

          {showAnimes ? (
            <section className="border-b border-border/70">
              <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("search.syjxk")}
              </p>
              {animes.map((a) => (
                <Link
                  key={a.slug}
                  href={`/anime/${a.slug}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40"
                >
                  <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    {a.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {displayAnimeTitle(
                        { title: a.title, titleEn: a.titleEn ?? null, slug: a.slug },
                        locale
                      )}
                    </p>
                    <p className="text-[11px] text-primary/70">{t("nav.anime")}</p>
                  </div>
                </Link>
              ))}
            </section>
          ) : null}

          <PostList
            posts={postsTop}
            paymentsEnabled={paymentsEnabled}
            empty={
              topPreviewUsers.length === 0 && !showAnimes ? t("search.s1ilpk74") : t("search.emptyPosts")
            }
          />
        </div>
      ) : null}

      {related.length > 0 && filter === "top" ? (
        <section className="border-t border-border/70 px-4 py-4">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{t("search.slb69a3")}</h2>
          <div className="flex flex-wrap gap-2">
            {related.map((r) => (
              <Link
                key={r.normalized}
                href={`/search?q=${encodeURIComponent(r.query)}${scope === "social" ? "&scope=social" : ""}`}
                className="rounded-full border border-border px-3 py-1 text-xs hover:border-primary/40 hover:bg-muted/50"
              >
                {r.query}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PeopleList({
  users,
  viewerId,
  empty,
}: {
  users: SearchPageUser[];
  viewerId: string | null;
  empty: string;
}) {
  if (users.length === 0) {
    return <p className="px-4 py-12 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div>
      {users.map((user) => (
        <SearchUserRow
          key={user.id}
          user={user}
          viewerId={viewerId}
          className="border-b border-border/70"
        />
      ))}
    </div>
  );
}

function PostList({
  posts,
  paymentsEnabled,
  empty,
}: {
  posts: Array<GridPost & { createdAt: string | Date }>;
  paymentsEnabled: boolean;
  empty: string;
}) {
  if (posts.length === 0) {
    return <p className="px-4 py-12 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div>
      {posts.map((post) => (
        <div key={post.id} className="border-b border-border/70 px-2 py-1">
          <FeedTimelinePostCard post={post} paymentsEnabled={paymentsEnabled} />
        </div>
      ))}
    </div>
  );
}
