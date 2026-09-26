import { db } from "@/lib/db";
import { parseQnaCategoryParam, qnaFeedWhere, type QnaCategoryFilter } from "@/lib/qna-feed-query";
import {
  feedPostListSelect,
  feedPostListSelectNoPoll,
  feedPostListSelectNoReposts,
  mapFeedPost,
  mobileFeedPostSelect,
  trimFeedPostContent,
} from "@/lib/feed-query";

export type QnaFeedVariant = "web" | "mobile";
export { parseQnaCategoryParam, qnaFeedWhere };

const qnaCommunitySelect = {
  slug: true,
  name: true,
  category: true,
  customCategoryLabel: true,
} as const;

export async function fetchQnaFeedPage(opts: {
  cursor: string | null;
  limit: number;
  q?: string;
  category?: QnaCategoryFilter;
  canViewNsfw: boolean;
  variant: QnaFeedVariant;
}) {
  const where = qnaFeedWhere({
    category: opts.category ?? null,
    q: opts.q ?? "",
    canViewNsfw: opts.canViewNsfw,
  });
  const query = {
    where,
    take: opts.limit,
    ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
    orderBy: { createdAt: "desc" as const },
  };

  if (opts.variant === "mobile") {
    try {
      const posts = await db.post.findMany({
        ...query,
        select: { ...mobileFeedPostSelect, community: { select: qnaCommunitySelect } },
      });
      return posts.map(trimFeedPostContent);
    } catch (e) {
      console.error("[qna-feed] mobile", e);
      const posts = await db.post.findMany({
        ...query,
        select: {
          ...mobileFeedPostSelect,
          _count: { select: { likes: true, comments: true, votes: true } },
          community: { select: qnaCommunitySelect },
        },
      });
      return posts.map((p) =>
        trimFeedPostContent({
          ...p,
          _count: { ...p._count, reposts: 0 },
        })
      );
    }
  }

  try {
    const posts = await db.post.findMany({
      ...query,
      select: { ...feedPostListSelect, community: { select: qnaCommunitySelect } },
    });
    return posts.map(mapFeedPost);
  } catch (e) {
    console.error("[qna-feed] web poll/reposts", e);
    try {
      const posts = await db.post.findMany({
        ...query,
        select: {
          ...feedPostListSelectNoReposts,
          community: { select: qnaCommunitySelect },
        },
      });
      return posts.map((p) =>
        mapFeedPost({
          ...p,
          poll: null,
          _count: { ...p._count, reposts: 0 },
        })
      );
    } catch (e2) {
      console.error("[qna-feed] web fallback", e2);
      const posts = await db.post.findMany({
        ...query,
        select: {
          ...feedPostListSelectNoPoll,
          community: { select: qnaCommunitySelect },
        },
      });
      return posts.map((p) => trimFeedPostContent({ ...p, poll: null }));
    }
  }
}
