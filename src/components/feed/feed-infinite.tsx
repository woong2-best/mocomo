"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FeedDualColumnLayout,
  type FeedLayoutItem,
} from "@/components/feed/feed-dual-column-layout";
import type { GridPost } from "@/components/feed/feed-post-card";
import type { FeedDisplayMode } from "@/lib/feed-display-mode";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Ad = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  sponsorName?: string | null;
  ctaLabel?: string | null;
  adCategory?: string | null;
};

type FeedItem = FeedLayoutItem;

function mergeIds(prev: Set<string>, ids?: string[]) {
  if (!ids?.length) return prev;
  const next = new Set(prev);
  for (const id of ids) next.add(id);
  return next;
}

export function FeedInfinite({
  initialItems,
  initialCursor,
  initialLikedIds = [],
  initialStarredIds = [],
  initialRepostedIds = [],
  displayMode = "TIMELINE",
}: {
  initialItems: FeedItem[];
  initialCursor: string | null;
  initialLikedIds?: string[];
  initialStarredIds?: string[];
  initialRepostedIds?: string[];
  displayMode?: FeedDisplayMode;
}) {
  const [items, setItems] = useState(initialItems);
  const [likedIds, setLikedIds] = useState(() => new Set(initialLikedIds));
  const [starredIds, setStarredIds] = useState(() => new Set(initialStarredIds));
  const [repostedIds, setRepostedIds] = useState(() => new Set(initialRepostedIds));
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(!initialCursor);
  const [loadError, setLoadError] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const postOffsetRef = useRef(
    initialItems.filter((i) => i.type === "post").length
  );

  const feedSeed = `${initialCursor ?? ""}:${initialItems.length}:${
    initialItems.find((i) => i.type === "post")?.data.id ?? ""
  }`;

  useEffect(() => {
    setItems(initialItems);
    setCursor(initialCursor);
    setDone(!initialCursor);
    setLikedIds(new Set(initialLikedIds));
    setStarredIds(new Set(initialStarredIds));
    setRepostedIds(new Set(initialRepostedIds));
    postOffsetRef.current = initialItems.filter((i) => i.type === "post").length;
    setLoadError("");
    loadingRef.current = false;
    // feedSeed만 의존 — 배열 참조 변경으로 스크롤 리셋 방지
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedSeed]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingRef.current || done) return;
    loadingRef.current = true;
    setLoading(true);
    setLoadError("");
    try {
      const postOffset = postOffsetRef.current;
      const res = await fetch(`/api/feed?cursor=${cursor}&limit=12&postOffset=${postOffset}`, {
        credentials: "include",
      });
      let json: {
        items?: FeedItem[];
        nextCursor?: string | null;
        likedIds?: string[];
        starredIds?: string[];
        repostedIds?: string[];
        error?: string;
      };
      try {
        json = await res.json();
      } catch {
        setLoadError("응답을 해석하지 못했습니다.");
        return;
      }
      if (!res.ok) {
        setLoadError(json.error ?? "피드를 더 불러오지 못했습니다.");
        return;
      }
      if (!Array.isArray(json.items)) {
        setLoadError("피드 형식이 올바르지 않습니다.");
        return;
      }
      const added = json.items;
      const addedPosts = added.filter((i) => i.type === "post").length;
      postOffsetRef.current += addedPosts;
      setLikedIds((prev) => mergeIds(prev, json.likedIds));
      setStarredIds((prev) => mergeIds(prev, json.starredIds));
      setRepostedIds((prev) => mergeIds(prev, json.repostedIds));
      setItems((prev) => {
        const seen = new Set(
          prev.filter((i) => i.type === "post").map((i) => i.data.id)
        );
        const fresh = added.filter(
          (i) => i.type !== "post" || !seen.has(i.data.id)
        );
        return [...prev, ...fresh];
      });
      setCursor(json.nextCursor ?? null);
      if (!json.nextCursor) setDone(true);
    } catch {
      setLoadError("네트워크 오류가 발생했습니다.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [cursor, done]);

  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || done) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMoreRef.current();
      },
      { rootMargin: "280px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [done]);

  return (
    <>
      <FeedDualColumnLayout
        items={items}
        likedIds={likedIds}
        starredIds={starredIds}
        repostedIds={repostedIds}
        displayMode={displayMode}
      />
      <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-8">
        {loading && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
        {loadError && (
          <>
            <p className="text-sm text-destructive">{loadError}</p>
            <Button type="button" variant="secondary" size="sm" onClick={() => loadMore()}>
              다시 시도
            </Button>
          </>
        )}
        {done && items.length > 0 && !loadError && (
          <p className="text-sm text-muted-foreground">피드 끝</p>
        )}
      </div>
    </>
  );
}
