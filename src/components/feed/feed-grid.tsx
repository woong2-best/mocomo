"use client";

import {
  FeedDualColumnLayout,
  type FeedLayoutItem,
} from "@/components/feed/feed-dual-column-layout";
import type { GridPost } from "@/components/feed/feed-post-card";
import type { FeedDisplayMode } from "@/lib/feed-display-mode";
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
  displayMode = "TIMELINE",
}: {
  items: FeedItem<GridPost, Ad>[];
  likedIds?: string[];
  starredIds?: string[];
  repostedIds?: string[];
  displayMode?: FeedDisplayMode;
}) {
  return (
    <FeedDualColumnLayout
      items={items as FeedLayoutItem[]}
      likedIds={new Set(likedIds)}
      starredIds={new Set(starredIds)}
      repostedIds={new Set(repostedIds)}
      displayMode={displayMode}
    />
  );
}
