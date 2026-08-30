"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Play, Star } from "lucide-react";
import type { StarHubCreator } from "@/lib/star-bookmarks";
import type { GridPost } from "@/components/feed/feed-post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STAR_CHANGED_EVENT } from "@/lib/post-engage-client";
import { userDisplayName } from "@/lib/user-public-select";
import { resolveVideoPosterUrl } from "@/lib/video-poster";

function formatDuration(sec: number | null | undefined): string | null {
  if (!sec || sec <= 0 || !Number.isFinite(sec)) return null;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pickCover(post: GridPost) {
  const media = post.media?.[0];
  if (!media) return null;
  const isVideo = media.type === "VIDEO" || post.postType === "VIDEO";
  const url = isVideo
    ? resolveVideoPosterUrl(media)
    : media.url?.trim() || null;
  return {
    url,
    type: media.type,
    duration: media.duration,
  };
}

function StarGridTile({ post }: { post: GridPost }) {
  const cover = pickCover(post);
  const isVideo = cover?.type === "VIDEO" || post.postType === "VIDEO";
  const duration = isVideo ? formatDuration(cover?.duration) : null;

  return (
    <Link
      href={`/post/${post.id}`}
      prefetch={false}
      className="group relative block aspect-square min-w-0 w-full overflow-hidden rounded-sm bg-neutral-900 ring-1 ring-border/40 hover:ring-primary/40 transition-shadow"
    >
      {cover?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover.url} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted/40 p-2 text-center text-[11px] font-semibold text-muted-foreground">
          {post.title || post.content?.slice(0, 40) || "게시물"}
        </div>
      )}
      {isVideo ? (
        <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-black/70 text-white">
          <Play className="h-3.5 w-3.5 fill-current" />
        </span>
      ) : null}
      {duration ? (
        <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white">
          {duration}
        </span>
      ) : null}
    </Link>
  );
}

type HubResponse = {
  posts?: GridPost[];
  creators?: StarHubCreator[];
  total?: number;
};

export function StarHubClient({
  initialPosts,
  initialCreators,
  initialTotal,
}: {
  initialPosts: GridPost[];
  initialCreators: StarHubCreator[];
  initialTotal: number;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [creators, setCreators] = useState(initialCreators);
  const [total, setTotal] = useState(initialTotal);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const refresh = useCallback(async (nextCreatorId: string | null) => {
    setLoading(true);
    try {
      const q = nextCreatorId ? `?creatorId=${encodeURIComponent(nextCreatorId)}` : "";
      const res = await fetch(`/api/star${q}`, { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as HubResponse;
      if (Array.isArray(data.posts)) setPosts(data.posts);
      if (Array.isArray(data.creators)) setCreators(data.creators);
      if (typeof data.total === "number") setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  const skipInitialRefresh = useRef(true);

  useEffect(() => {
    if (skipInitialRefresh.current && creatorId === null) {
      skipInitialRefresh.current = false;
      return;
    }
    skipInitialRefresh.current = false;
    void refresh(creatorId);
  }, [creatorId, refresh]);

  useEffect(() => {
    const onStarChanged = () => {
      void refresh(creatorId);
    };
    window.addEventListener(STAR_CHANGED_EVENT, onStarChanged);
    return () => window.removeEventListener(STAR_CHANGED_EVENT, onStarChanged);
  }, [creatorId, refresh]);

  const onClearAll = useCallback(async () => {
    if (total <= 0) return;
    if (
      !window.confirm(
        "STAR에 저장한 게시물 기록을 모두 삭제할까요? 북마크만 지워지며 게시물 자체는 삭제되지 않습니다."
      )
    ) {
      return;
    }
    setClearing(true);
    try {
      const res = await fetch("/api/star", { method: "DELETE", credentials: "include" });
      if (!res.ok) return;
      setPosts([]);
      setCreators([]);
      setTotal(0);
      setCreatorId(null);
      window.dispatchEvent(new Event(STAR_CHANGED_EVENT));
    } finally {
      setClearing(false);
    }
  }, [total]);

  const showEmpty = posts.length === 0 && !loading;

  const headerAction = useMemo(
    () => (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 font-bold"
        disabled={clearing || total <= 0}
        onClick={() => void onClearAll()}
      >
        {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : "전체 삭제하기"}
      </Button>
    ),
    [clearing, onClearAll, total]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1" />
        {headerAction}
      </div>

      {creators.length > 0 ? (
        <div className="relative -mx-1">
          <div className="flex gap-3 overflow-x-auto px-1 pb-1 scrollbar-hide snap-x snap-mandatory">
            <button
              type="button"
              onClick={() => setCreatorId(null)}
              className={cn(
                "snap-start shrink-0 flex flex-col items-center gap-1.5 w-[68px]",
                creatorId === null ? "opacity-100" : "opacity-70 hover:opacity-100"
              )}
            >
              <span
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full border-2 bg-muted/50",
                  creatorId === null ? "border-primary ring-2 ring-primary/25" : "border-border"
                )}
              >
                <Star className={cn("h-6 w-6", creatorId === null ? "text-primary fill-primary/30" : "text-muted-foreground")} />
              </span>
              <span className="text-[11px] font-bold text-foreground">전체</span>
            </button>
            {creators.map((c) => {
              const active = creatorId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCreatorId(c.id)}
                  className={cn(
                    "snap-start shrink-0 flex flex-col items-center gap-1.5 w-[68px]",
                    active ? "opacity-100" : "opacity-80 hover:opacity-100"
                  )}
                >
                  <Avatar
                    className={cn(
                      "h-14 w-14 border-2",
                      active ? "border-primary ring-2 ring-primary/25" : "border-border"
                    )}
                  >
                    <AvatarImage src={c.image ?? undefined} />
                    <AvatarFallback className="text-sm font-bold">
                      {c.username[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] font-bold text-foreground truncate max-w-full px-0.5">
                    {userDisplayName(c)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {loading && posts.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : showEmpty ? (
        <p className="text-center text-muted-foreground py-16 text-sm leading-relaxed">
          {creatorId
            ? "이 크리에이터의 STAR 저장 게시물이 없습니다."
            : "STAR에 저장한 게시글이 없습니다. 피드에서 별 아이콘을 눌러 저장하세요."}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 sm:gap-1 md:grid-cols-4 lg:grid-cols-5">
          {posts.map((p) => (
            <StarGridTile key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
