"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FeedAdCard } from "@/components/feed/feed-ad-card";
import { FeedPostCardInteractive } from "@/components/feed/feed-post-card-interactive";
import type { GridPost } from "@/components/feed/feed-post-card";
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
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || loading || done) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/feed?cursor=${cursor}&limit=12`);
      const json = await res.json();
      setItems((prev) => [...prev, ...json.items]);
      setCursor(json.nextCursor);
      if (!json.nextCursor) setDone(true);
    } catch {
      setDone(true);
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
      <div ref={sentinelRef} className="flex justify-center py-8">
        {loading && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
        {done && items.length > 0 && (
          <p className="text-sm text-muted-foreground">피드 끝</p>
        )}
      </div>
    </>
  );
}
