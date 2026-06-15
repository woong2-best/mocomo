import { unstable_cache } from "next/cache";
import { FEED_POSTS_CACHE_TAG } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { userPublicSelect } from "@/lib/user-public-select";
import { postMediaPreview } from "@/lib/post-media-select";
import { postPollSelect, mapPostPollRow } from "@/lib/post-poll";

const FEED_POST_MAX_CONTENT = 520;

export const feedPostListSelect = {
  id: true,
  title: true,
  content: true,
  postType: true,
  createdAt: true,
  isNsfw: true,
  isPinned: true,
  author: { select: userPublicSelect },
  anime: { select: { title: true, slug: true } },
  media: postMediaPreview,
  poll: { select: postPollSelect },
  _count: { select: { likes: true, comments: true, votes: true, reposts: true } },
} as const;

export type FeedPostRow = {
  id: string;
  title: string | null;
  content: string;
  postType: string;
  createdAt: Date;
  isNsfw: boolean;
  isPinned: boolean;
  author: { id: string; username: string; image: string | null; supportTierSent: string };
  anime: { title: string; slug: string } | null;
  media: { url: string; type: string }[];
  _count: { likes: number; comments: number; votes: number; reposts: number };
};

export function trimFeedPostContent<T extends { content: string }>(post: T): T {
  if (post.content.length <= FEED_POST_MAX_CONTENT) return post;
  return { ...post, content: `${post.content.slice(0, FEED_POST_MAX_CONTENT)}…` };
}

function mapFeedPost<T extends { poll: Parameters<typeof mapPostPollRow>[0] | null; content: string }>(
  post: T
) {
  return trimFeedPostContent({
    ...post,
    poll: post.poll ? mapPostPollRow(post.poll) : null,
  });
}

export { mapFeedPost };

const feedPostListSelectNoReposts = {
  ...feedPostListSelect,
  _count: { select: { likes: true, comments: true, votes: true } },
} as const;

const feedPostListSelectNoPoll = {
  id: true,
  title: true,
  content: true,
  postType: true,
  createdAt: true,
  isNsfw: true,
  isPinned: true,
  author: { select: userPublicSelect },
  anime: { select: { title: true, slug: true } },
  media: postMediaPreview,
  _count: { select: { likes: true, comments: true, votes: true, reposts: true } },
} as const;

export async function fetchFeedPostsPage(cursor: string | null, limit: number) {
  const query = {
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" as const },
  };

  try {
    const posts = await db.post.findMany({ ...query, select: feedPostListSelect });
    return posts.map(mapFeedPost);
  } catch (e) {
    console.error("[feed] poll/reposts", e);
    try {
      const posts = await db.post.findMany({ ...query, select: feedPostListSelectNoReposts });
      return posts.map((p) =>
        mapFeedPost({
          ...p,
          poll: null,
          _count: { ...p._count, reposts: 0 },
        })
      );
    } catch (e2) {
      console.error("[feed] fallback", e2);
      const posts = await db.post.findMany({ ...query, select: feedPostListSelectNoPoll });
      return posts.map((p) => trimFeedPostContent({ ...p, poll: null }));
    }
  }
}

/** 무한 스크롤 페이지 — 짧은 TTL 캐시로 DB 부하 완화 */
export function getCachedFeedPostsPage(cursor: string | null, limit: number) {
  const cacheKey = cursor ?? "__head__";
  return unstable_cache(
    () => fetchFeedPostsPage(cursor, limit),
    ["feed-page-v1", cacheKey, String(limit)],
    { revalidate: 45, tags: [FEED_POSTS_CACHE_TAG] }
  )();
}
