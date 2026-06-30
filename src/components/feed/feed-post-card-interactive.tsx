"use client";

import { FeedPhotoPostCard } from "@/components/feed/feed-photo-post-card";
import { FeedTextPostCard } from "@/components/feed/feed-text-post-card";
import { MotionPress } from "@/components/motion/motion-primitives";
import { postHasVisualMedia } from "@/lib/format-feed";
import type { GridPost } from "@/components/feed/feed-post-card";

export function FeedPostCardInteractive({
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
      <MotionPress hoverLift={false}>
        <FeedPhotoPostCard
          post={post}
          initialLiked={initialLiked}
          initialStarred={initialStarred}
          initialReposted={initialReposted}
        />
      </MotionPress>
    );
  }

  return (
    <MotionPress>
      <FeedTextPostCard
        post={post}
        initialLiked={initialLiked}
        initialStarred={initialStarred}
        initialReposted={initialReposted}
      />
    </MotionPress>
  );
}
