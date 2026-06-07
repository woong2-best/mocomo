import { db } from "@/lib/db";
import { filterChannelsWithPresentHost } from "@/lib/live-abandon";
import type { SupportTierLevel } from "@prisma/client";
export type FastSearchResult = {
  users: { username: string; name: string | null; supportTierSent: SupportTierLevel }[];
  animes: { slug: string; title: string }[];
  posts: { id: string; content: string; title: string | null }[];
  liveStreams: { id: string; name: string; category: string }[];
};

/** 헤더·검색 페이지용 — synopsis 등 무거운 필드 제외 */
export async function runFastSearch(query: string): Promise<FastSearchResult> {
  const q = query.trim();
  if (q.length < 2) {
    return { users: [], animes: [], posts: [], liveStreams: [] };
  }

  const userWhere =
    q.length <= 20 && !/\s/.test(q)
      ? {
          OR: [
            { username: { startsWith: q, mode: "insensitive" as const } },
            { name: { startsWith: q, mode: "insensitive" as const } },
          ],
        }
      : {
          OR: [
            { username: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
          ],
        };

  const postWhere =
    q.length >= 4
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { content: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : { title: { contains: q, mode: "insensitive" as const } };

  const [users, animes, posts, liveStreamsRaw] = await Promise.all([
    db.user.findMany({
      where: userWhere,
      take: 8,
      select: { username: true, name: true, supportTierSent: true },
      orderBy: { username: "asc" },
    }),
    db.anime.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { titleEn: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 8,
      orderBy: [{ viewCount: "desc" }, { updatedAt: "desc" }],
      select: { slug: true, title: true },
    }),
    db.post.findMany({
      where: postWhere,
      take: 8,
      orderBy: { createdAt: "desc" },
      select: { id: true, content: true, title: true },
    }),
    db.voiceChannel.findMany({
      where: {
        isLive: true,
        liveStatus: "LIVE",
        name: { contains: q, mode: "insensitive" },
      },
      take: 6,
      select: { id: true, name: true, category: true, createdBy: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const liveRows = await filterChannelsWithPresentHost(liveStreamsRaw);
  const liveStreamsFiltered = liveRows.map(({ id, name, category }) => ({ id, name, category }));

  return { users, animes, posts, liveStreams: liveStreamsFiltered };
}
