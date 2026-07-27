import type { SupportTierLevel } from "@prisma/client";
import { subDays } from "date-fns";
import { db } from "@/lib/db";
import { userPublicSelect } from "@/lib/user-public-select";

const highlightInclude = {
  author: { select: userPublicSelect },
  media: { take: 1, orderBy: { order: "asc" as const } },
  _count: { select: { likes: true, comments: true } },
};

export type WeeklyHighlightPost = {
  id: string;
  title: string | null;
  content: string;
  viewCount: number;
  weeklyLikes: number;
  createdAt: Date | string;
  author: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
    supportTierSent: SupportTierLevel;
  };
  media: { url: string }[];
  _count: { likes: number; comments: number };
};

function mapPost(
  post: Awaited<ReturnType<typeof fetchHighlightPosts>>[number],
  weeklyLikes: number
): WeeklyHighlightPost {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    viewCount: post.viewCount,
    weeklyLikes,
    createdAt: post.createdAt,
    author: post.author,
    media: post.media,
    _count: post._count,
  };
}

async function fetchHighlightPosts(ids: string[]) {
  if (ids.length === 0) return [];
  const posts = await db.post.findMany({
    where: { id: { in: ids } },
    include: highlightInclude,
  });
  const order = new Map(ids.map((id, i) => [id, i]));
  return posts.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export async function getWeeklyHighlights(limit = 5) {
  const since = subDays(new Date(), 7);

  const [likeGroups, topViewedIds] = await Promise.all([
    db.like.groupBy({
      by: ["postId"],
      where: { createdAt: { gte: since } },
      _count: { postId: true },
      orderBy: { _count: { postId: "desc" } },
      take: limit,
    }),
    db.post.findMany({
      where: { createdAt: { gte: since } },
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: { id: true },
    }),
  ]);

  const likeCountByPost = new Map(likeGroups.map((g) => [g.postId, g._count.postId]));
  const topLikedIds = likeGroups.map((g) => g.postId);
  const viewedIds = topViewedIds.map((p) => p.id);
  const allIds = [...new Set([...topLikedIds, ...viewedIds])];
  const allRaw = await fetchHighlightPosts(allIds);
  const byId = new Map(allRaw.map((p) => [p.id, p]));

  const topLikedRaw = topLikedIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
  const topViewedRaw = viewedIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p);

  return {
    topLiked: topLikedRaw.map((p) => mapPost(p, likeCountByPost.get(p.id) ?? 0)),
    topViewed: topViewedRaw.map((p) => mapPost(p, likeCountByPost.get(p.id) ?? 0)),
  };
}
