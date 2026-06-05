import { db } from "@/lib/db";
import type { GridPost } from "@/components/feed/feed-post-card";
import { userPublicSelect } from "@/lib/user-public-select";

export async function getStarredPostsForUser(userId: string): Promise<GridPost[]> {
  const bookmarks = await db.bookmark.findMany({
    where: { userId },
    take: 50,
    include: {
      post: {
        include: {
          author: { select: userPublicSelect },
          anime: { select: { title: true, slug: true } },
          media: { take: 1, select: { url: true, type: true } },
          _count: { select: { likes: true, comments: true, votes: true, reposts: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return bookmarks.map((b) => b.post);
}
