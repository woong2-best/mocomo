"use client";

import { memo } from "react";
import { FeedPhotoPostCard } from "@/components/feed/feed-photo-post-card";
import { FeedTextPostCard } from "@/components/feed/feed-text-post-card";
import { postHasVisualMedia } from "@/lib/format-feed";
import type { GridPost } from "@/components/feed/feed-post-card";

function FeedPostCardInteractiveInner({
  post,
  initialLiked = false,
  initialStarred = false,
  initialReposted = false,
}: {
  post: GridPost & { createdAt: string | Date };
  initialLiked?: boolean;
  initialStarred?: boolean;
  initialReposted?: boolean;
}) {
  if (postHasVisualMedia(post)) {
    return (
      <FeedPhotoPostCard
        post={post}
        initialLiked={initialLiked}
        initialStarred={initialStarred}
        initialReposted={initialReposted}
      />
    );
  }

  return (
    <FeedTextPostCard
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
    prev.initialLiked === next.initialLiked &&
    prev.initialStarred === next.initialStarred &&
    prev.initialReposted === next.initialReposted
);
