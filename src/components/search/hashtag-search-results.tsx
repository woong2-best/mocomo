import { HashtagSearchFeed } from "@/components/search/hashtag-search-feed";
import {
  getCachedHashtagPostCount,
  getCachedHashtagPosts,
  type HashtagSort,
} from "@/lib/hashtag-search";
import { getServerTranslator } from "@/lib/i18n/server";

export async function HashtagSearchResults({
  tag,
  sort,
}: {
  tag: string;
  sort: HashtagSort;
}) {
  const { locale } = await getServerTranslator();
  const [postsTop, postsLatest, total] = await Promise.all([
    getCachedHashtagPosts(tag, "top"),
    getCachedHashtagPosts(tag, "latest"),
    getCachedHashtagPostCount(tag),
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
