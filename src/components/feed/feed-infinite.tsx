"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FeedAdCard } from "@/components/feed/feed-ad-card";
import { FeedPostCardInteractive } from "@/components/feed/feed-post-card-interactive";
import type { GridPost } from "@/components/feed/feed-post-card";
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

type FeedItem =
  | { type: "post"; data: GridPost & { createdAt: string } }
  | { type: "ad"; data: Ad };

export function FeedInfinite({
  initialItems,
  initialCursor,
}: {
  initialItems: FeedItem[];
  initialCursor: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(!initialCursor);
  const [loadError, setLoadError] = useState("");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const postOffsetRef = useRef(
    initialItems.filter((i) => i.type === "post").length
  );

  const loadMore = useCallback(async () => {
    if (!cursor || loading || done) return;
    setLoading(true);
    setLoadError("");
    try {
      const postOffset = postOffsetRef.current;
      const res = await fetch(`/api/feed?cursor=${cursor}&limit=12&postOffset=${postOffset}`);
      const json = await res.json();
      if (!res.ok) {
        setLoadError(json.error ?? "피드를 더 불러오지 못했습니다.");
        return;
      }
      const added = json.items as FeedItem[];
      const addedPosts = added.filter((i) => i.type === "post").length;
      postOffsetRef.current += addedPosts;
      setItems((prev) => [...prev, ...added]);
      setCursor(json.nextCursor);
      if (!json.nextCursor) setDone(true);
    } catch {
      setLoadError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, done]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item, i) =>
          item.type === "ad" ? (
            <FeedAdCard key={`ad-${item.data.id}-${i}`} ad={item.data} />
          ) : (
            <FeedPostCardInteractive key={item.data.id} post={item.data} />
          )
        )}
      </div>
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
