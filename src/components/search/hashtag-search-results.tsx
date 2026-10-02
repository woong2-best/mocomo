import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { HashtagSearchFeed } from "@/components/search/hashtag-search-feed";
import {
  getCachedHashtagPostCount,
  getCachedHashtagPosts,
  type HashtagSort,
} from "@/lib/hashtag-search";
import { getServerTranslator } from "@/lib/i18n/server";
import { getAuthUserId } from "@/lib/auth";
import { attachWebPaidMediaPlayback } from "@/lib/paid-media-playback";
import { isPaymentsConfigured } from "@/lib/payments";

export async function HashtagSearchResults({
  tag,
  sort,
}: {
  tag: string;
  sort: HashtagSort;
}) {
  const { locale } = await getServerTranslator();
  const [viewerId, postsTopRaw, postsLatestRaw, total] = await Promise.all([
    getAuthUserId(),
    getCachedHashtagPosts(tag, "top"),
    getCachedHashtagPosts(tag, "latest"),
    getCachedHashtagPostCount(tag),
  ]);
  const [postsTop, postsLatest] = await Promise.all([
    attachWebPaidMediaPlayback(postsTopRaw, viewerId),
    attachWebPaidMediaPlayback(postsLatestRaw, viewerId),
  ]);

  const emptyMsg =
    "No posts with this hashtag yet.";

  return (
    <HashtagSearchFeed
      tag={tag}
      initialSort={sort}
      postsTop={postsTop}
      postsLatest={postsLatest}
      total={total}
      emptyMsg={emptyMsg}
      paymentsEnabled={isPaymentsConfigured()}
    />
  );
}
