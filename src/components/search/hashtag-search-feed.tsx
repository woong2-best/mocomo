"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useCallback, useEffect, useState } from "react";
import { FeedTimelinePostCard } from "@/components/feed/feed-timeline-post-card";
import type { HashtagFeedPost, HashtagSort } from "@/lib/hashtag-search";
import { useLocale } from "@/components/providers/locale-provider";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

function formatPostCount(n: number, locale: string) {
  return `${n.toLocaleString()} post${n === 1 ? "" : "s"}`;
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
  paymentsEnabled = false,
}: {
  tag: string;
  initialSort: HashtagSort;
  postsTop: HashtagFeedPost[];
  postsLatest: HashtagFeedPost[];
  total: number;
  emptyMsg: string;
  paymentsEnabled?: boolean;
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
    [
          { id: "top", label: "Top" },
          { id: "latest", label: "Latest" },
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
        aria-label={"Hashtag filters"}
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
              <FeedTimelinePostCard post={post} paymentsEnabled={paymentsEnabled} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
