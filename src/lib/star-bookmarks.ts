import { db } from "@/lib/db";
import type { GridPost } from "@/components/feed/feed-post-card";
import { postMediaPreview } from "@/lib/post-media-select";
import { userPublicSelect } from "@/lib/user-public-select";

const STAR_HUB_TAKE = 200;

export type StarHubCreator = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  count: number;
};

export type StarHubResult = {
  posts: GridPost[];
  creators: StarHubCreator[];
  total: number;
};

const starPostInclude = {
  author: { select: userPublicSelect },
  anime: { select: { title: true, slug: true } },
  media: postMediaPreview,
  _count: { select: { likes: true, comments: true, votes: true, reposts: true } },
} as const;

/** STAR hub — bookmark grid + followed-creator filter strip. */
export async function getStarHubForUser(
  userId: string,
  filterCreatorId?: string | null
): Promise<StarHubResult> {
  const bookmarks = await db.bookmark.findMany({
    where: { userId },
    take: STAR_HUB_TAKE,
    include: {
      post: { include: starPostInclude },
    },
    orderBy: { createdAt: "desc" },
  });

  const allPosts = bookmarks.map((b) => b.post) as GridPost[];

  const followingRows = await db.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = new Set(followingRows.map((f) => f.followingId));

  const creatorMap = new Map<string, StarHubCreator>();
  for (const post of allPosts) {
    const author = post.author;
    if (!author?.id || !followingIds.has(author.id)) continue;
    const prev = creatorMap.get(author.id);
    if (prev) {
      prev.count += 1;
    } else {
      creatorMap.set(author.id, {
        id: author.id,
        username: author.username,
        name: author.name ?? null,
        image: author.image ?? null,
        count: 1,
      });
    }
  }

  const creators = [...creatorMap.values()].sort((a, b) => b.count - a.count);

  const posts = filterCreatorId
    ? allPosts.filter((p) => p.author?.id === filterCreatorId)
    : allPosts;

  return { posts, creators, total: allPosts.length };
}

/** @deprecated Use getStarHubForUser — kept for callers that only need posts. */
export async function getStarredPostsForUser(userId: string): Promise<GridPost[]> {
  const hub = await getStarHubForUser(userId);
  return hub.posts;
}

export async function clearAllStarBookmarks(userId: string): Promise<number> {
  const result = await db.bookmark.deleteMany({ where: { userId } });
  return result.count;
}
