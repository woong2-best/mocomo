"use client";

import { useCallback, useEffect, useState } from "react";
import { FeedPostCardInteractive } from "@/components/feed/feed-post-card-interactive";
import type { GridPost } from "@/components/feed/feed-post-card";
import { STAR_CHANGED_EVENT } from "@/lib/post-engage-client";

export function StarFeedClient({ initialPosts }: { initialPosts: GridPost[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/star", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { posts?: GridPost[] };
      if (Array.isArray(data.posts)) setPosts(data.posts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onStarChanged = () => {
      void refresh();
    };
    window.addEventListener(STAR_CHANGED_EVENT, onStarChanged);
    return () => window.removeEventListener(STAR_CHANGED_EVENT, onStarChanged);
  }, [refresh]);

  if (posts.length === 0 && !loading) {
    return (
      <p className="col-span-full text-center text-muted-foreground py-12">
        STAR에 저장한 게시글이 없습니다. 피드에서 별 아이콘을 눌러 저장하세요.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {posts.map((p) => (
        <FeedPostCardInteractive
          key={p.id}
          post={p}
          initialStarred={true}
          initialLiked={false}
          initialReposted={false}
        />
      ))}
    </div>
  );
}
