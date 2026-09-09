import "server-only";

import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import type { HeaderSearchScope } from "@/lib/header-search-context";
import { platformPostWhere } from "@/lib/post-scope";
import { getTrendingFromSnapshot } from "@/lib/search/trends";
import { userDisplayName } from "@/lib/user-public-select";
import {
  getSidebarSearchRankingScope,
  SIDEBAR_SEARCH_RANKING_LIMIT,
  type SidebarSearchRankingItem,
  type SidebarSearchRankingScope,
} from "@/lib/scoped-search-rank-shared";

export type { SidebarSearchRankingItem, SidebarSearchRankingScope } from "@/lib/scoped-search-rank-shared";
export {
  getSidebarSearchRankingScope,
  searchRankingHref,
  SIDEBAR_SEARCH_RANKING_LIMIT,
} from "@/lib/scoped-search-rank-shared";

const SCOPED_BUCKETS = new Set<string>(["used", "market", "community", "live", "feed"]);

function clampQuery(raw: string): string {
  return raw.trim().slice(0, 80);
}

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().slice(0, 80);
}

/** Record a scoped search for sidebar rankings. */
export async function recordScopedSearch(
  scope: HeaderSearchScope | SidebarSearchRankingScope,
  raw: string
) {
  const original = clampQuery(raw);
  if (original.length < 1) return;
  const key = normalizeKey(original);
  if (key.length < 1) return;

  if (scope === "wiki") {
    try {
      await db.wikiSearchQuery.upsert({
        where: { query: key },
        create: { query: key, count: 1 },
        update: { count: { increment: 1 } },
      });
    } catch {
      /* DB 미연결 */
    }
    return;
  }

  if (!SCOPED_BUCKETS.has(scope)) return;

  try {
    await db.scopedSearchQuery.upsert({
      where: { scope_query: { scope, query: key } },
      create: { scope, query: key, displayQuery: original, count: 1 },
      update: { count: { increment: 1 }, displayQuery: original },
    });
  } catch {
    /* DB 미연결 */
  }
}

async function fetchScopedRanking(
  scope: string,
  limit = SIDEBAR_SEARCH_RANKING_LIMIT
): Promise<SidebarSearchRankingItem[]> {
  try {
    const rows = await db.scopedSearchQuery.findMany({
      where: { scope },
      take: limit,
      orderBy: [{ count: "desc" }, { updatedAt: "desc" }],
      select: { id: true, displayQuery: true, query: true, count: true },
    });
    return rows.map((row, i) => ({
      rank: i + 1,
      id: row.id,
      label: row.displayQuery || row.query,
      count: row.count,
    }));
  } catch {
    return [];
  }
}

async function fetchWikiRanking(limit = SIDEBAR_SEARCH_RANKING_LIMIT): Promise<SidebarSearchRankingItem[]> {
  try {
    const rows = await db.wikiSearchQuery.findMany({
      take: limit,
      orderBy: [{ count: "desc" }, { updatedAt: "desc" }],
      select: { query: true, count: true },
    });
    return rows.map((row, i) => ({
      rank: i + 1,
      id: `wiki:${row.query}`,
      label: row.query,
      count: row.count,
    }));
  } catch {
    return [];
  }
}

function postRankingLabel(post: { title: string | null; content: string }): string {
  const title = post.title?.trim();
  if (title) return title;
  const line = post.content.trim().split("\n")[0] ?? "";
  return line.length > 80 ? `${line.slice(0, 80)}…` : line || "(제목 없음)";
}

function countPostMedia(media: { type: string }[]): { imageCount: number; videoCount: number } {
  let imageCount = 0;
  let videoCount = 0;
  for (const item of media) {
    if (item.type === "VIDEO") videoCount += 1;
    else if (item.type === "IMAGE" || item.type === "GIF") imageCount += 1;
  }
  return { imageCount, videoCount };
}

async function fetchPostRanking(
  where: { communityId?: null | { not: null } },
  limit = SIDEBAR_SEARCH_RANKING_LIMIT
): Promise<SidebarSearchRankingItem[]> {
  try {
    const rows = await db.post.findMany({
      where: {
        ...where,
        visibility: "PUBLIC",
        author: { deletedAt: null },
      },
      take: limit,
      orderBy: [{ hotScore: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        content: true,
        hotScore: true,
        author: { select: { username: true, name: true, deletedAt: true } },
        media: { select: { type: true } },
      },
    });

    return rows.map((row, index) => {
      const { imageCount, videoCount } = countPostMedia(row.media);
      return {
        rank: index + 1,
        id: row.id,
        label: postRankingLabel(row),
        count: row.hotScore,
        href: `/post/${row.id}`,
        authorName: userDisplayName(row.author),
        imageCount,
        videoCount,
      };
    });
  } catch {
    return [];
  }
}

async function fetchFeedRanking(limit = SIDEBAR_SEARCH_RANKING_LIMIT): Promise<SidebarSearchRankingItem[]> {
  const posts = await fetchPostRanking(platformPostWhere, limit);
  if (posts.length > 0) return posts;

  const rows = await getTrendingFromSnapshot("query", "7d", limit);
  return rows.slice(0, limit).map((row) => ({
    rank: row.rank,
    id: row.id,
    label: row.label,
    count: row.count,
  }));
}

async function fetchCommunityPostRanking(
  limit = SIDEBAR_SEARCH_RANKING_LIMIT
): Promise<SidebarSearchRankingItem[]> {
  const posts = await fetchPostRanking({ communityId: { not: null } }, limit);
  if (posts.length > 0) return posts;
  return fetchScopedRanking("community", limit);
}

export async function getSidebarSearchRanking(
  pathname: string,
  limit = SIDEBAR_SEARCH_RANKING_LIMIT
): Promise<{ scope: SidebarSearchRankingScope; items: SidebarSearchRankingItem[] }> {
  const scope = getSidebarSearchRankingScope(pathname);

  let items: SidebarSearchRankingItem[] = [];
  switch (scope) {
    case "wiki":
      items = await fetchWikiRanking(limit);
      break;
    case "feed":
      items = await fetchFeedRanking(limit);
      break;
    case "global":
      items = await fetchFeedRanking(limit);
      break;
    case "community":
      items = await fetchCommunityPostRanking(limit);
      break;
    default:
      items = await fetchScopedRanking(scope, limit);
  }

  return { scope, items: items.slice(0, limit) };
}

export function getCachedSidebarSearchRanking(
  pathname: string,
  limit = SIDEBAR_SEARCH_RANKING_LIMIT
) {
  const scope = getSidebarSearchRankingScope(pathname);
  return unstable_cache(
    () => getSidebarSearchRanking(pathname, limit),
    ["sidebar-search-ranking-v3", scope, pathname.split("?")[0] || "/", String(limit)],
    { revalidate: 120 }
  )();
}
