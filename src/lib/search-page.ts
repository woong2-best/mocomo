import { unstable_cache } from "next/cache";
import type { Prisma, SupportTierLevel } from "@prisma/client";
import { db } from "@/lib/db";
import { enrichSearchUsersWithFollowStatus } from "@/lib/search-fast";
import {
  feedPostListSelect,
  feedPostListSelectNoPoll,
  feedPostListSelectNoReposts,
  mapFeedPost,
  trimFeedPostContent,
} from "@/lib/feed-query";
import { platformPostWhere } from "@/lib/post-scope";
import { nsfwPostWhere } from "@/lib/nsfw-viewer-access";
import { attachSponsoredAdFlags } from "@/lib/sponsored-ad/post-disclosure";
import { blockedIdList } from "@/lib/user-block";
import { parseHashtagFromQuery } from "@/lib/hashtag-search";
import type { SearchPageUser } from "@/lib/search-page-shared";

export type { SearchPageFilter, SearchPageUser } from "@/lib/search-page-shared";
export { parseSearchPageFilter, SEARCH_PAGE_FILTERS } from "@/lib/search-page-shared";

export type SearchPagePost = Awaited<ReturnType<typeof fetchSearchPagePosts>>[number];

function searchUserWhere(q: string): Prisma.UserWhereInput {
  return q.length <= 20 && !/\s/.test(q)
    ? {
        OR: [
          { username: { startsWith: q, mode: "insensitive" } },
          { name: { startsWith: q, mode: "insensitive" } },
        ],
      }
    : {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      };
}

export function searchPostWhere(
  q: string,
  canViewNsfw: boolean,
  excludeAuthorIds?: Set<string>
): Prisma.PostWhereInput {
  const hashtagTag = parseHashtagFromQuery(q);
  const excludeAuthors = blockedIdList(excludeAuthorIds ?? new Set());
  return {
    ...platformPostWhere,
    ...nsfwPostWhere(canViewNsfw),
    ...(excludeAuthors.length ? { authorId: { notIn: excludeAuthors } } : {}),
    ...(hashtagTag
      ? {
          OR: [
            { content: { contains: `#${hashtagTag}`, mode: "insensitive" } },
            { title: { contains: `#${hashtagTag}`, mode: "insensitive" } },
          ],
        }
      : {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
          ],
        }),
  };
}

async function fetchSearchPagePosts(
  q: string,
  sort: "top" | "latest",
  canViewNsfw: boolean,
  limit = 28
) {
  const where = searchPostWhere(q, canViewNsfw);
  const orderBy: Prisma.PostOrderByWithRelationInput[] =
    sort === "top"
      ? [{ likes: { _count: "desc" } }, { createdAt: "desc" }]
      : [{ createdAt: "desc" }];

  try {
    const posts = await db.post.findMany({
      where,
      take: limit,
      orderBy,
      select: feedPostListSelect,
    });
    return attachSponsoredAdFlags(posts.map(mapFeedPost));
  } catch (e) {
    console.error("[search-page] posts primary", e);
    try {
      const posts = await db.post.findMany({
        where,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: feedPostListSelectNoReposts,
      });
      return attachSponsoredAdFlags(
        posts.map((p) =>
          mapFeedPost({
            ...p,
            quotedPost: null,
            poll: null,
            _count: { ...p._count, reposts: 0 },
          })
        )
      );
    } catch (e2) {
      console.error("[search-page] posts fallback", e2);
      const posts = await db.post.findMany({
        where,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: feedPostListSelectNoPoll,
      });
      return attachSponsoredAdFlags(
        posts.map((p) => trimFeedPostContent({ ...p, quotedPost: null, poll: null }))
      );
    }
  }
}

export async function fetchSearchPageUsersRaw(q: string, excludeAuthorIds?: Set<string>, take = 16) {
  const excludeAuthors = blockedIdList(excludeAuthorIds ?? new Set());
  const rows = await db.user.findMany({
    where: {
      ...searchUserWhere(q),
      deletedAt: null,
      ...(excludeAuthors.length ? { id: { notIn: excludeAuthors } } : {}),
    },
    take,
    orderBy: [{ username: "asc" }],
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      supportTierSent: true,
      postsLocked: true,
      profile: { select: { bio: true } },
    },
  });

  return rows.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    image: u.image,
    supportTierSent: u.supportTierSent as SupportTierLevel,
    postsLocked: u.postsLocked,
    bio: u.profile?.bio ?? null,
  }));
}

async function fetchSearchPageAnimes(q: string) {
  const compact = q.replace(/\s+/g, "").toLowerCase().replace(/[\\%_]/g, "");
  if (q.length < 2 || compact.length < 1) return [];
  const likeCompact = `%${compact}%`;
  return db.$queryRaw<
    { slug: string; title: string; titleEn: string | null; coverUrl: string | null }[]
  >`
    SELECT slug, title, "titleEn", "coverUrl"
    FROM "Anime"
    WHERE replace(lower(title), ' ', '') LIKE ${likeCompact}
       OR replace(lower(coalesce("titleEn", '')), ' ', '') LIKE ${likeCompact}
    ORDER BY "viewCount" DESC, "updatedAt" DESC
    LIMIT 6
  `;
}

export async function runSearchPage(query: string, canViewNsfw = false) {
  const q = query.trim();
  if (q.length < 1) {
    return {
      users: [] as SearchPageUser[],
      postsTop: [] as SearchPagePost[],
      postsLatest: [] as SearchPagePost[],
      animes: [] as { slug: string; title: string; titleEn: string | null; coverUrl: string | null }[],
    };
  }

  const [users, postsTop, postsLatest, animes] = await Promise.all([
    fetchSearchPageUsersRaw(q),
    fetchSearchPagePosts(q, "top", canViewNsfw),
    fetchSearchPagePosts(q, "latest", canViewNsfw),
    fetchSearchPageAnimes(q),
  ]);

  return { users, postsTop, postsLatest, animes };
}

export function getCachedSearchPage(query: string, canViewNsfw: boolean) {
  const key = query.trim().toLowerCase().slice(0, 80);
  return unstable_cache(
    () => runSearchPage(query, canViewNsfw),
    ["search-page-v1", key, canViewNsfw ? "adult" : "safe"],
    { revalidate: 30 }
  )();
}

export async function enrichSearchPageUsers(
  viewerId: string | null | undefined,
  users: SearchPageUser[]
): Promise<SearchPageUser[]> {
  const enriched = await enrichSearchUsersWithFollowStatus(viewerId, users);
  const extra = new Map(users.map((u) => [u.id, u]));
  return enriched.map((u) => {
    const src = extra.get(u.id);
    return {
      ...u,
      bio: src?.bio ?? null,
      postsLocked: src?.postsLocked ?? false,
    };
  });
}
