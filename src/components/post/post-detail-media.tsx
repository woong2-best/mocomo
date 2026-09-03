"use client";

import { FeedPostMediaCarousel } from "@/components/feed/feed-post-media-carousel";
import type { ProfilePostMediaItem } from "@/components/profile/paid-post-media-grid";

export function PostDetailMedia({
  media,
  postId,
  authorUsername,
  authorId,
  subscriptionPriceKrw,
  paymentsEnabled,
  subscribed,
  postInstantPurchasePriceKrw,
  isNsfw,
  isOwner,
  viewerShowNsfw,
}: {
  media: ProfilePostMediaItem[];
  postId: string;
  authorUsername: string;
  authorId: string;
  subscriptionPriceKrw?: number;
  paymentsEnabled: boolean;
  subscribed?: boolean;
  postInstantPurchasePriceKrw?: number;
  isNsfw?: boolean;
  isOwner?: boolean;
  viewerShowNsfw?: boolean;
}) {
  if (media.length === 0) return null;

  return (
    <FeedPostMediaCarousel
      media={media}
      postId={postId}
      authorUsername={authorUsername}
      authorId={authorId}
      subscriptionPriceKrw={subscriptionPriceKrw}
      paymentsEnabled={paymentsEnabled}
      subscribed={subscribed}
      postInstantPurchasePriceKrw={postInstantPurchasePriceKrw}
      mediaTotal={media.length}
      isNsfw={isNsfw}
      isOwner={isOwner}
      viewerShowNsfw={viewerShowNsfw}
      feedPreview={false}
    />
  );
}
