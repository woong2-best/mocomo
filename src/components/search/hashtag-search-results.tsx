import { FeedTimelinePostCard } from "@/components/feed/feed-timeline-post-card";
import { HashtagSearchTabs } from "@/components/search/hashtag-search-tabs";
import {
  getCachedHashtagPostCount,
  getCachedHashtagPosts,
  hashtagDisplayLabel,
  type HashtagSort,
} from "@/lib/hashtag-search";
import { getServerTranslator } from "@/lib/i18n/server";

function formatPostCount(n: number, locale: string) {
  if (locale === "en") return `${n.toLocaleString()} post${n === 1 ? "" : "s"}`;
  if (locale === "ja") return `${n.toLocaleString()}件の投稿`;
  if (locale === "zh") return `${n.toLocaleString()} 条帖子`;
  return `게시물 ${n.toLocaleString()}개`;
}

export async function HashtagSearchResults({
  tag,
  sort,
}: {
  tag: string;
  sort: HashtagSort;
}) {
  const { locale } = await getServerTranslator();
  const [posts, total] = await Promise.all([
    getCachedHashtagPosts(tag, sort),
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
    <div className="space-y-0 -mx-4">
      <div className="px-4 pb-3 border-b border-border/60">
        <h2 className="text-2xl font-bold tracking-tight">{hashtagDisplayLabel(tag)}</h2>
        <p className="text-sm text-muted-foreground mt-1">{formatPostCount(total, locale)}</p>
      </div>

      <HashtagSearchTabs tag={tag} sort={sort} />

      <div className="divide-y divide-border/70">
        {posts.length === 0 ? (
          <p className="px-4 py-10 text-sm text-muted-foreground text-center">{emptyMsg}</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="px-2 py-1">
              <FeedTimelinePostCard post={post} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
