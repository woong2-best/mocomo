"use client";

import { memo } from "react";
import { FeedCompactPostCard } from "@/components/feed/feed-compact-post-card";
import { FeedTimelinePostCard } from "@/components/feed/feed-timeline-post-card";
import { PostFlashHighlight } from "@/components/post/post-flash-highlight";
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
  const card =
    displayMode === "COMPACT" ? (
      <FeedCompactPostCard
        post={post}
        initialLiked={initialLiked}
        initialStarred={initialStarred}
        initialReposted={initialReposted}
      />
    ) : (
      <FeedTimelinePostCard
        post={post}
        initialLiked={initialLiked}
        initialStarred={initialStarred}
        initialReposted={initialReposted}
      />
    );

  return <PostFlashHighlight postId={post.id}>{card}</PostFlashHighlight>;
}

export const FeedPostCardInteractive = memo(
  FeedPostCardInteractiveInner,
  (prev, next) =>
    prev.post.id === next.post.id &&
    prev.post.media?.length === next.post.media?.length &&
    prev.post._count?.media === next.post._count?.media &&
    prev.displayMode === next.displayMode &&
    prev.initialLiked === next.initialLiked &&
    prev.initialStarred === next.initialStarred &&
    prev.initialReposted === next.initialReposted
);
