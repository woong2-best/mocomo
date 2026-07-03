"use client";

import { memo } from "react";
import { FeedCompactPostCard } from "@/components/feed/feed-compact-post-card";
import { FeedTimelinePostCard } from "@/components/feed/feed-timeline-post-card";
import type { FeedDisplayMode } from "@/lib/feed-display-mode";
import type { GridPost } from "@/components/feed/feed-post-card";

function FeedPostCardInteractiveInner({
  post,
  displayMode = "TIMELINE",
  initialLiked = false,
  initialStarred = false,
  initialReposted = false,
}: {
  post: GridPost & { createdAt: string | Date };
  displayMode?: FeedDisplayMode;
  initialLiked?: boolean;
  initialStarred?: boolean;
  initialReposted?: boolean;
}) {
  if (displayMode === "COMPACT") {
    return (
      <FeedCompactPostCard
        post={post}
        initialLiked={initialLiked}
        initialStarred={initialStarred}
        initialReposted={initialReposted}
      />
    );
  }

  return (
    <FeedTimelinePostCard
      post={post}
      initialLiked={initialLiked}
      initialStarred={initialStarred}
      initialReposted={initialReposted}
    />
  );
}

export const FeedPostCardInteractive = memo(
  FeedPostCardInteractiveInner,
  (prev, next) =>
    prev.post.id === next.post.id &&
    prev.displayMode === next.displayMode &&
    prev.initialLiked === next.initialLiked &&
    prev.initialStarred === next.initialStarred &&
    prev.initialReposted === next.initialReposted
);
