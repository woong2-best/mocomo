"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProfilePostCard } from "@/components/profile/profile-post-card";
import type { GridPost } from "@/components/feed/feed-post-card";
import type { ProfileTab } from "@/lib/profile-queries";
import { Loader2 } from "lucide-react";

export type TimelineItem =
  | { type: "post"; post: GridPost & { createdAt: string | Date; isPinned?: boolean } }
  | {
      type: "reply";
      comment: { id: string; content: string; createdAt: string | Date };
      post: GridPost & { createdAt: string | Date };
    }
  | { type: "like"; post: GridPost & { createdAt: string | Date } };

export function ProfileTimeline({
  username,
  tab,
  initialItems,
  initialCursor,
  emptyMessage,
}: {
  username: string;
  tab: ProfileTab;
  initialItems: TimelineItem[];
  initialCursor: string | null;
  emptyMessage: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(!initialCursor);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || loading || done) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/profile/${username}/timeline?tab=${tab}&cursor=${cursor}`
      );
      const json = await res.json();
      setItems((prev) => [...prev, ...json.items]);
      setCursor(json.nextCursor);
      if (!json.nextCursor) setDone(true);
    } catch {
      setDone(true);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, done, username, tab]);

  useEffect(() => {
    setItems(initialItems);
    setCursor(initialCursor);
    setDone(!initialCursor);
  }, [initialItems, initialCursor, tab]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (e) => e[0]?.isIntersecting && loadMore(),
      { rootMargin: "120px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  if (items.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-16 text-sm">{emptyMessage}</p>
    );
  }

  return (
    <div>
      {items.map((item) => {
        if (item.type === "reply") {
          return (
            <div key={`reply-${item.comment.id}`}>
              <div className="px-4 pt-3 pb-1 text-sm text-muted-foreground border-b border-border/40">
                <span className="text-foreground">@{username}</span> 님에게 답글
              </div>
              <p className="px-4 pb-2 text-[15px] border-b border-border/40">{item.comment.content}</p>
              <ProfilePostCard post={item.post} meta="원본 게시물" />
            </div>
          );
        }
        const post = item.type === "like" ? item.post : item.post;
        const meta = item.type === "like" ? "좋아요한 게시물" : undefined;
        return <ProfilePostCard key={`${item.type}-${post.id}`} post={post} meta={meta} />;
      })}
      <div ref={sentinel} className="h-8 flex justify-center py-6">
        {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}
