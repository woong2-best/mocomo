"use client";

import { FeedPostCardInteractive } from "@/components/feed/feed-post-card-interactive";
import type { GridPost } from "@/components/feed/feed-post-card";
import { FeedAdCard } from "@/components/feed/feed-ad-card";
import type { FeedItem } from "@/lib/feed-mixer";

type Ad = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  sponsorName?: string | null;
  ctaLabel?: string | null;
  adCategory?: string | null;
};

export function FeedGrid({
  items,
  likedIds = [],
  starredIds = [],
  repostedIds = [],
}: {
  items: FeedItem<GridPost, Ad>[];
  likedIds?: string[];
  starredIds?: string[];
  repostedIds?: string[];
}) {
  const liked = new Set(likedIds);
  const starred = new Set(starredIds);
  const reposted = new Set(repostedIds);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map((item, i) =>
        item.type === "ad" ? (
          <FeedAdCard key={`ad-${item.data.id}-${i}`} ad={item.data} />
        ) : (
          <FeedPostCardInteractive
            key={item.data.id}
            post={item.data}
            initialLiked={liked.has(item.data.id)}
            initialStarred={starred.has(item.data.id)}
            initialReposted={reposted.has(item.data.id)}
          />
        )
      )}
    </div>
  );
}
