"use client";

import { useCallback, useEffect, useState } from "react";
import { FeedTimelinePostCard } from "@/components/feed/feed-timeline-post-card";
import type { HashtagFeedPost, HashtagSort } from "@/lib/hashtag-search";
import { useLocale } from "@/components/providers/locale-provider";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

function formatPostCount(n: number, locale: string) {
  if (locale === "en") return `${n.toLocaleString()} post${n === 1 ? "" : "s"}`;
  if (locale === "ja") return `${n.toLocaleString()}件の投稿`;
  if (locale === "zh") return `${n.toLocaleString()} 条帖子`;
  return `게시물 ${n.toLocaleString()}개`;
}

function parseSortFromUrl(): HashtagSort {
  if (typeof window === "undefined") return "top";
  const raw = new URLSearchParams(window.location.search).get("sort");
  return raw === "latest" ? "latest" : "top";
}

export function HashtagSearchFeed({
  tag,
  initialSort,
  postsTop,
  postsLatest,
  total,
  emptyMsg,
}: {
  tag: string;
  initialSort: HashtagSort;
  postsTop: HashtagFeedPost[];
  postsLatest: HashtagFeedPost[];
  total: number;
  emptyMsg: string;
}) {
  const { locale } = useLocale();
  const { isNativeApp } = useClientPlatform();
  const [sort, setSort] = useState<HashtagSort>(initialSort);

  useEffect(() => {
    setSort(initialSort);
  }, [tag, initialSort]);

  useEffect(() => {
    function onPopState() {
      setSort(parseSortFromUrl());
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const selectSort = useCallback(
    (next: HashtagSort) => {
      setSort(next);
      const url = new URL(window.location.href);
      if (next === "top") url.searchParams.delete("sort");
      else url.searchParams.set("sort", next);
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    },
    []
  );

  const tabs: { id: HashtagSort; label: string }[] =
    locale === "en"
      ? [
          { id: "top", label: "Top" },
          { id: "latest", label: "Latest" },
        ]
      : locale === "ja"
        ? [
            { id: "top", label: "トップ" },
            { id: "latest", label: "最新" },
          ]
        : locale === "zh"
          ? [
              { id: "top", label: "热门" },
              { id: "latest", label: "最新" },
            ]
          : [
              { id: "top", label: "인기" },
              { id: "latest", label: "최신" },
            ];

  const posts = sort === "top" ? postsTop : postsLatest;

  return (
    <div className="space-y-0 -mx-4">
      <p className="px-4 py-2 text-sm text-muted-foreground border-b border-border/60">
        {formatPostCount(total, locale)}
      </p>

      <nav
        className={cn(
          "sticky z-40 flex border-b border-border/80 bg-background/95 backdrop-blur-md -mx-4 px-4",
          isNativeApp ? "top-[calc(3.25rem+env(safe-area-inset-top,0px))]" : "top-14"
        )}
        aria-label={locale === "en" ? "Hashtag filters" : "해시태그 필터"}
      >
        {tabs.map((tab) => {
          const active = sort === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectSort(tab.id)}
              className={cn(
                "relative flex-1 py-3 text-center text-sm font-semibold transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {active && (
                <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-folk-cobalt" aria-hidden />
              )}
            </button>
          );
        })}
      </nav>

      <div className="divide-y divide-border/70">
        {posts.length === 0 ? (
          <p className="px-4 py-10 text-sm text-muted-foreground text-center">{emptyMsg}</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="px-2 py-1">
              <FeedTimelinePostCard post={post} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
