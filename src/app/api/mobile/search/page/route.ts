import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { parseHashtagFromQuery } from "@/lib/hashtag-search";
import {
  enrichSearchPageUsers,
  fetchSearchPageUsersRaw,
  searchPostWhere,
} from "@/lib/search-page";
import {
  mapMobileFeedPost,
  mobileFeedPostSelect,
} from "@/lib/feed-query";
import { attachWebPaidMediaPlayback } from "@/lib/paid-media-playback";
import { filterPostsByAudienceLock } from "@/lib/posts-lock";
import { getPostEngagementForUser } from "@/lib/post-engagement";
import { hydrateViewerPollVotes } from "@/lib/post-poll";
import { applyViewerBlockPolicyToPosts } from "@/lib/user-block";
import { resolveCanViewNsfw } from "@/lib/nsfw-viewer-access";
import { isPaymentsConfigured } from "@/lib/payments";
import { recordSearchEvent } from "@/lib/search/record";
import type { Prisma } from "@prisma/client";

async function fetchMobileSearchPosts(
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

  const posts = await db.post.findMany({
    where,
    take: limit,
    orderBy,
    select: mobileFeedPostSelect,
  });
  return posts.map((p) => mapMobileFeedPost(p));
}

function serializePosts(
  posts: Array<{ id: string; createdAt: Date | string }>,
  engagement: { likedIds: string[]; starredIds: string[]; repostedIds: string[] }
) {
  const liked = new Set(engagement.likedIds);
  const starred = new Set(engagement.starredIds);
  const reposted = new Set(engagement.repostedIds);
  return posts.map((data) => ({
    ...data,
    createdAt:
      data.createdAt instanceof Date ? data.createdAt.toISOString() : String(data.createdAt),
    liked: liked.has(data.id),
    starred: starred.has(data.id),
    reposted: reposted.has(data.id),
  }));
}

async function preparePosts(
  posts: Awaited<ReturnType<typeof fetchMobileSearchPosts>>,
  viewerId: string | null
) {
  const withAuthor = posts.map((p) => ({ ...p, authorId: p.author.id }));
  const visible = await hydrateViewerPollVotes(withAuthor, viewerId);
  const blocked = await applyViewerBlockPolicyToPosts(viewerId, visible);
  return attachWebPaidMediaPlayback(blocked, viewerId);
}

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-search-page", 40);
  if (limited) return limited;

  const viewerId = await getMobileUserId(req);
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({
      users: [],
      postsTop: [],
      postsLatest: [],
      paymentsEnabled: isPaymentsConfigured(),
    });
  }

  try {
    const canViewNsfw = await resolveCanViewNsfw(viewerId);
    const isHashtag = Boolean(parseHashtagFromQuery(q));

    const [usersRaw, postsTopRaw, postsLatestRaw] = await Promise.all([
      isHashtag ? Promise.resolve([]) : fetchSearchPageUsersRaw(q),
      fetchMobileSearchPosts(q, "top", canViewNsfw),
      fetchMobileSearchPosts(q, "latest", canViewNsfw),
    ]);

    const [users, postsTop, postsLatest] = await Promise.all([
      isHashtag ? Promise.resolve([]) : enrichSearchPageUsers(viewerId, usersRaw),
      preparePosts(postsTopRaw, viewerId),
      preparePosts(postsLatestRaw, viewerId),
    ]);

    const postIds = [...new Set([...postsTop, ...postsLatest].map((p) => p.id))];
    const engagement =
      viewerId && postIds.length > 0
        ? await getPostEngagementForUser(viewerId, postIds)
        : { likedIds: [], starredIds: [], repostedIds: [] };

    void recordSearchEvent({
      rawQuery: q,
      resultCount: users.length + postsLatest.length,
      userId: viewerId,
    }).catch(() => undefined);

    return NextResponse.json({
      users,
      postsTop: serializePosts(postsTop, engagement),
      postsLatest: serializePosts(postsLatest, engagement),
      paymentsEnabled: isPaymentsConfigured(),
    });
  } catch (e) {
    console.error("[api/mobile/search/page]", e);
    return NextResponse.json(
      { users: [], postsTop: [], postsLatest: [], paymentsEnabled: false, error: "Search failed." },
      { status: 503 }
    );
  }
}
