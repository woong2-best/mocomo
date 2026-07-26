"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProfilePostCard } from "@/components/profile/profile-post-card";
import type { GridPost } from "@/components/feed/feed-post-card";
import type { ProfileMediaKind, ProfileSort, ProfileTab } from "@/lib/profile-queries";
import { appendProfileSortParam } from "@/lib/profile-queries";
import { Button } from "@/components/ui/button";
import { subscribePostDeleted } from "@/lib/post-deleted-sync";
import { Loader2 } from "lucide-react";

export type TimelineItem =
  | { type: "post"; post: GridPost & { createdAt: string | Date; isPinned?: boolean } }
  | {
      type: "reply";
      comment: { id: string; content: string; createdAt: string | Date };
      post: GridPost & { createdAt: string | Date };
    }
  | { type: "like"; post: GridPost & { createdAt: string | Date } };

function timelineQuery(tab: ProfileTab, sort: ProfileSort, mediaKind: ProfileMediaKind | null) {
  const params = new URLSearchParams({ tab });
  appendProfileSortParam(params, sort);
  if (tab === "media" && mediaKind && mediaKind !== "all") params.set("kind", mediaKind);
  return params.toString();
}

function mergeIds(prev: Set<string>, next?: string[]) {
  if (!next?.length) return prev;
  const merged = new Set(prev);
  for (const id of next) merged.add(id);
  return merged;
}

function postIdFromItem(item: TimelineItem) {
  return item.type === "reply" ? item.post.id : item.post.id;
}

export function ProfileTimeline({
  username,
  tab,
  sort,
  mediaKind,
  initialItems,
  initialCursor,
  emptyMessage,
  isSelf = false,
  paymentsEnabled = false,
  authorId,
  subscriptionPriceKrw,
  subscribed = false,
  initialLikedIds = [],
  initialStarredIds = [],
  initialRepostedIds = [],
}: {
  username: string;
  tab: ProfileTab;
  sort: ProfileSort;
  mediaKind: ProfileMediaKind | null;
  initialItems: TimelineItem[];
  initialCursor: string | null;
  emptyMessage: string;
  isSelf?: boolean;
  paymentsEnabled?: boolean;
  authorId?: string;
  subscriptionPriceKrw?: number;
  subscribed?: boolean;
  initialLikedIds?: string[];
  initialStarredIds?: string[];
  initialRepostedIds?: string[];
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(!initialCursor);
  const [loadError, setLoadError] = useState("");
  const [likedIds, setLikedIds] = useState(() => new Set(initialLikedIds));
  const [starredIds, setStarredIds] = useState(() => new Set(initialStarredIds));
  const [repostedIds, setRepostedIds] = useState(() => new Set(initialRepostedIds));
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(initialItems);
    setCursor(initialCursor);
    setDone(!initialCursor);
    setLoadError("");
    setLikedIds(new Set(initialLikedIds));
    setStarredIds(new Set(initialStarredIds));
    setRepostedIds(new Set(initialRepostedIds));
  }, [initialItems, initialCursor, initialLikedIds, initialStarredIds, initialRepostedIds, tab, sort, mediaKind]);

  useEffect(() => {
    return subscribePostDeleted((postId) => {
      setItems((prev) =>
        prev.filter((item) => {
          if (item.type === "post") return item.post.id !== postId;
          if (item.type === "reply") return item.post.id !== postId;
          return item.post.id !== postId;
        })
      );
    });
  }, []);

  const loadMore = useCallback(async () => {
    if (!cursor || loading || done) return;
    setLoading(true);
    setLoadError("");
    try {
      const qs = timelineQuery(tab, sort, mediaKind);
      const res = await fetch(
        `/api/profile/${username}/timeline?${qs}&cursor=${cursor}`
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
      setLikedIds((prev) => mergeIds(prev, json.likedIds));
      setStarredIds((prev) => mergeIds(prev, json.starredIds));
      setRepostedIds((prev) => mergeIds(prev, json.repostedIds));
    } catch {
      setLoadError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, done, username, tab, sort, mediaKind]);

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
        const postId = postIdFromItem(item);
        const engagement = {
          initialLiked: likedIds.has(postId),
          initialStarred: starredIds.has(postId),
          initialReposted: repostedIds.has(postId),
        };
        if (item.type === "post") {
          return (
            <ProfilePostCard
              key={`post-${item.post.id}`}
              post={item.post}
              isSelf={isSelf}
              paymentsEnabled={paymentsEnabled}
              authorId={authorId}
              subscriptionPriceKrw={subscriptionPriceKrw}
              subscribed={subscribed}
              {...engagement}
            />
          );
        }
        if (item.type === "reply") {
          return (
            <ProfilePostCard
              key={`reply-${item.comment.id}`}
              post={item.post}
              meta="답글"
              paymentsEnabled={paymentsEnabled}
              authorId={authorId}
              subscriptionPriceKrw={subscriptionPriceKrw}
              subscribed={subscribed}
              {...engagement}
            />
          );
        }
        return (
          <ProfilePostCard
            key={`like-${item.post.id}`}
            post={item.post}
            meta="좋아요한 게시물"
            paymentsEnabled={paymentsEnabled}
            authorId={authorId}
            subscriptionPriceKrw={subscriptionPriceKrw}
            subscribed={subscribed}
            {...engagement}
          />
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
