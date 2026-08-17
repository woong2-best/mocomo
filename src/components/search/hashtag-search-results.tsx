import { HashtagSearchFeed } from "@/components/search/hashtag-search-feed";
import {
  getCachedHashtagPostCount,
  getCachedHashtagPosts,
  type HashtagSort,
} from "@/lib/hashtag-search";
import { getServerTranslator } from "@/lib/i18n/server";
import { getAuthUserId } from "@/lib/auth";
import { attachWebPaidMediaPlayback } from "@/lib/paid-media-playback";

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
    locale === "en"
      ? "No posts with this hashtag yet."
      : locale === "ja"
        ? "このハッシュタグの投稿はまだありません。"
        : locale === "zh"
          ? "暂无带此话题标签的帖子。"
          : "이 해시태그가 포함된 게시물이 없습니다.";

  return (
    <HashtagSearchFeed
      tag={tag}
      initialSort={sort}
      postsTop={postsTop}
      postsLatest={postsLatest}
      total={total}
      emptyMsg={emptyMsg}
    />
  );
}
