import { db } from "@/lib/db";
import { filterChannelsWithPresentHost } from "@/lib/live-abandon";
import { isHashtagSearchQuery } from "@/lib/linkify";
import { parseHashtagFromQuery } from "@/lib/hashtag-search";
import { getPopularWikiSearchQueries, logWikiSearchQuery } from "@/lib/wiki-search";
import type { SupportTierLevel } from "@prisma/client";

export type SearchSuggestion = {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  kind: "query" | "trend" | "anime" | "tag" | "live";
};

export type FastSearchUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  supportTierSent: SupportTierLevel;
  isFollowing?: boolean;
  followsYou?: boolean;
};

export type FastSearchResult = {
  suggestions: SearchSuggestion[];
  users: FastSearchUser[];
  animes: { slug: string; title: string; titleEn: string | null; coverUrl: string | null }[];
  posts: { id: string; content: string; title: string | null }[];
  liveStreams: { id: string; name: string; category: string }[];
};

type AnimeSearchRow = {
  id: string;
  slug: string;
  title: string;
  titleEn: string | null;
  coverUrl: string | null;
};

function buildSuggestions(
  q: string,
  animes: { slug: string; title: string }[],
  liveStreams: { id: string; name: string }[],
  popular: { query: string; count: number }[]
): SearchSuggestion[] {
  const suggestions: SearchSuggestion[] = [];
  const lower = q.toLowerCase();

  suggestions.push({
    id: isHashtagSearchQuery(q) ? `tag:${lower}` : `query:${lower}`,
    label: q,
    sublabel: isHashtagSearchQuery(q) ? "해시태그" : "검색",
    href: `/search?q=${encodeURIComponent(q)}`,
    kind: isHashtagSearchQuery(q) ? "tag" : "query",
  });

  for (const p of popular) {
    if (suggestions.length >= 5) break;
    if (p.query === lower) continue;
    if (!p.query.includes(lower) && !p.query.startsWith(lower)) continue;
    suggestions.push({
      id: `trend:${p.query}`,
      label: p.query,
      sublabel: "인기 검색어",
      href: `/search?q=${encodeURIComponent(p.query)}`,
      kind: "trend",
    });
  }

  for (const a of animes.slice(0, 3)) {
    if (suggestions.some((s) => s.id === `anime:${a.slug}`)) continue;
    suggestions.push({
      id: `anime:${a.slug}`,
      label: a.title,
      sublabel: "culture-wiki",
      href: `/anime/${a.slug}`,
      kind: "anime",
    });
  }

  for (const ch of liveStreams.slice(0, 2)) {
    suggestions.push({
      id: `live:${ch.id}`,
      label: ch.name,
      sublabel: "라이브",
      href: `/voice/${ch.id}`,
      kind: "live",
    });
  }

  return suggestions.slice(0, 8);
}

export async function enrichSearchUsersWithFollowStatus(
  viewerId: string | null | undefined,
  users: FastSearchUser[]
): Promise<FastSearchUser[]> {
  if (!viewerId || users.length === 0) return users;

  const userIds = users.map((u) => u.id);
  const follows = await db.follow.findMany({
    where: {
      OR: [
        { followerId: viewerId, followingId: { in: userIds } },
        { followerId: { in: userIds }, followingId: viewerId },
      ],
    },
    select: { followerId: true, followingId: true },
  });

  const followingSet = new Set(
    follows.filter((f) => f.followerId === viewerId).map((f) => f.followingId)
  );
  const followsYouSet = new Set(
    follows.filter((f) => f.followingId === viewerId).map((f) => f.followerId)
  );

  return users.map((u) => ({
    ...u,
    isFollowing: followingSet.has(u.id),
    followsYou: followsYouSet.has(u.id),
  }));
}

/** 헤더·검색 페이지용 — synopsis 등 무거운 필드 제외 */
export async function runFastSearch(query: string): Promise<FastSearchResult> {
  const q = query.trim();
  if (q.length < 1) {
    return { suggestions: [], users: [], animes: [], posts: [], liveStreams: [] };
  }

  if (q.length >= 2) {
    void logWikiSearchQuery(q);
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

  const hashtagTag = parseHashtagFromQuery(q);
  // 공백/대소문자 무시 매칭용 압축 키: "귀멸의 칼날" ↔ "귀멸의칼날" 모두 매칭
  const compact = q.replace(/\s+/g, "").toLowerCase().replace(/[\\%_]/g, "");
  const likeCompact = `%${compact}%`;

  const postWhere = hashtagTag
    ? {
        OR: [
          { content: { contains: `#${hashtagTag}`, mode: "insensitive" as const } },
          { title: { contains: `#${hashtagTag}`, mode: "insensitive" as const } },
        ],
      }
    : {
        OR: [
          { title: { contains: q, mode: "insensitive" as const } },
          { content: { contains: q, mode: "insensitive" as const } },
        ],
      };

  const animeSearch: Promise<AnimeSearchRow[]> =
    q.length >= 2 && compact.length >= 1
      ? db.$queryRaw<AnimeSearchRow[]>`
          SELECT id, slug, title, "titleEn", "coverUrl"
          FROM "Anime"
          WHERE replace(lower(title), ' ', '') LIKE ${likeCompact}
             OR replace(lower(coalesce("titleEn", '')), ' ', '') LIKE ${likeCompact}
             OR EXISTS (
                  SELECT 1 FROM unnest(tags) AS t
                  WHERE replace(lower(t), ' ', '') LIKE ${likeCompact}
                )
          ORDER BY "viewCount" DESC, "updatedAt" DESC
          LIMIT 8
        `
      : Promise.resolve([]);

  const [users, animeRows, textPosts, liveStreamsRaw, popular] = await Promise.all([
    db.user.findMany({
      where: userWhere,
      take: 6,
      select: { id: true, username: true, name: true, image: true, supportTierSent: true },
      orderBy: [{ username: "asc" }],
    }),
    animeSearch,
    q.length >= 1
      ? db.post.findMany({
          where: postWhere,
          take: 8,
          orderBy: hashtagTag
            ? [{ likes: { _count: "desc" } }, { createdAt: "desc" }]
            : { createdAt: "desc" },
          select: { id: true, content: true, title: true, createdAt: true },
        })
      : Promise.resolve([]),
    q.length >= 2
      ? db.voiceChannel.findMany({
          where: {
            isLive: true,
            liveStatus: "LIVE",
            name: { contains: q, mode: "insensitive" },
          },
          take: 4,
          select: { id: true, name: true, category: true, createdBy: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    getPopularWikiSearchQueries(12),
  ]);

  // 매칭된 애니에 등록된 글(코스어/애니 커뮤니티 등록 등)도 함께 노출
  const animeIds = animeRows.map((a) => a.id);
  const animePosts =
    !hashtagTag && animeIds.length > 0
      ? await db.post.findMany({
          where: { animeId: { in: animeIds } },
          take: 8,
          orderBy: { createdAt: "desc" },
          select: { id: true, content: true, title: true, createdAt: true },
        })
      : [];

  const seen = new Set<string>();
  const posts = [...textPosts, ...animePosts]
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8)
    .map(({ id, content, title }) => ({ id, content, title }));

  const animes = animeRows.map(({ slug, title, titleEn, coverUrl }) => ({
    slug,
    title,
    titleEn,
    coverUrl,
  }));

  const liveRows = await filterChannelsWithPresentHost(liveStreamsRaw);
  const liveStreams = liveRows.map(({ id, name, category }) => ({ id, name, category }));
  const suggestions = buildSuggestions(q, animes, liveStreams, popular);

  return { suggestions, users, animes, posts, liveStreams };
}
