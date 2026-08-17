"use client";

import { memo } from "react";
import { FeedTimelinePostCard } from "@/components/feed/feed-timeline-post-card";
import { PostFlashHighlight } from "@/components/post/post-flash-highlight";
import type { GridPost } from "@/components/feed/feed-post-card";

function FeedPostCardInteractiveInner({
  post,
  initialLiked = false,
  initialStarred = false,
  initialReposted = false,
  paymentsEnabled = false,
}: {
  post: GridPost & { createdAt: string | Date };
  initialLiked?: boolean;
  initialStarred?: boolean;
  initialReposted?: boolean;
  paymentsEnabled?: boolean;
}) {
  return (
    <PostFlashHighlight postId={post.id}>
      <FeedTimelinePostCard
        post={post}
        initialLiked={initialLiked}
        initialStarred={initialStarred}
        initialReposted={initialReposted}
        paymentsEnabled={paymentsEnabled}
      />
    </PostFlashHighlight>
  );
}

export const FeedPostCardInteractive = memo(
  FeedPostCardInteractiveInner,
  (prev, next) =>
    prev.post.id === next.post.id &&
    prev.post.media?.length === next.post.media?.length &&
    prev.post._count?.media === next.post._count?.media &&
    prev.initialLiked === next.initialLiked &&
    prev.initialStarred === next.initialStarred &&
    prev.initialReposted === next.initialReposted &&
    prev.paymentsEnabled === next.paymentsEnabled
);
