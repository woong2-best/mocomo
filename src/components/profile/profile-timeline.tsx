"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProfilePostCard } from "@/components/profile/profile-post-card";
import type { GridPost } from "@/components/feed/feed-post-card";
import type { ProfileTab } from "@/lib/profile-queries";
import { Button } from "@/components/ui/button";
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
  isSelf = false,
}: {
  username: string;
  tab: ProfileTab;
  initialItems: TimelineItem[];
  initialCursor: string | null;
  emptyMessage: string;
  isSelf?: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(!initialCursor);
  const [loadError, setLoadError] = useState("");
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || loading || done) return;
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(
        `/api/profile/${username}/timeline?tab=${tab}&cursor=${cursor}`
      );
      const json = await res.json();
      if (!res.ok) {
        setLoadError(
          res.status === 403 ? "비공개 탭입니다." : json.error ?? "불러오기에 실패했습니다."
        );
        return;
      }
      setItems((prev) => [...prev, ...json.items]);
      setCursor(json.nextCursor);
      if (!json.nextCursor) setDone(true);
    } catch {
      setLoadError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, done, username, tab]);

  useEffect(() => {
    const el = sentinel.current;
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

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{emptyMessage}</p>;
  }

  return (
    <>
      {items.map((item) => {
        if (item.type === "post") {
          return <ProfilePostCard key={`post-${item.post.id}`} post={item.post} isSelf={isSelf} />;
        }
        if (item.type === "reply") {
          return (
            <ProfilePostCard
              key={`reply-${item.comment.id}`}
              post={item.post}
              meta="답글"
            />
          );
        }
        return (
          <ProfilePostCard key={`like-${item.post.id}`} post={item.post} meta="좋아요한 게시물" />
        );
      })}
      <div ref={sentinel} className="flex flex-col items-center gap-2 py-6">
        {loading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        {loadError && (
          <>
            <p className="text-sm text-destructive">{loadError}</p>
            <Button type="button" variant="secondary" size="sm" onClick={() => loadMore()}>
              다시 시도
            </Button>
          </>
        )}
        {done && items.length > 0 && !loadError && (
          <p className="text-xs text-muted-foreground">더 이상 없습니다</p>
        )}
      </div>
    </>
  );
}
