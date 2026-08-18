import { NextRequest, NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getCachedFeedPostsPage } from "@/lib/feed-query";
import { getPostEngagementForUser } from "@/lib/post-engagement";
import { filterPostsByAudienceLock } from "@/lib/posts-lock";
import { attachWebPaidMediaPlayback } from "@/lib/paid-media-playback";

export async function GET(req: NextRequest) {
  try {
    const limited = await rateLimitPublicApi(req, "feed", 120);
    if (limited) return limited;

    const session = await getCachedSession();
    const cursor = req.nextUrl.searchParams.get("cursor");
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "12", 10), 30);

    const posts = await getCachedFeedPostsPage(cursor, limit);
    const visible = await filterPostsByAudienceLock(
      posts.map((p) => ({ ...p, authorId: p.author.id })),
      session?.user?.id ?? null
    );
    const postIds = visible.map((p) => p.id);
    const viewerUserId = session?.user?.id;

    const [gated, engagement] = await Promise.all([
      attachWebPaidMediaPlayback(visible, viewerUserId ?? null),
      viewerUserId && postIds.length > 0
        ? getPostEngagementForUser(viewerUserId, postIds)
        : Promise.resolve({ likedIds: [], starredIds: [], repostedIds: [] }),
    ]);

    const items = gated.map((data) => ({ type: "post" as const, data }));

    const nextCursor = posts.length === limit ? posts[posts.length - 1]?.id : null;

    return NextResponse.json(
      {
        items: items.map((item) => ({
          type: "post" as const,
          data: { ...item.data, createdAt: item.data.createdAt.toISOString() },
        })),
        nextCursor,
        likedIds: engagement.likedIds,
        starredIds: engagement.starredIds,
        repostedIds: engagement.repostedIds,
      },
      {
        headers: {
          "Cache-Control": session?.user?.id
            ? "private, no-cache"
            : "public, s-maxage=15, stale-while-revalidate=30",
        },
      }
    );
  } catch (e) {
    console.error("[api/feed]", e);
    return NextResponse.json(
      { items: [], nextCursor: null, error: "피드를 불러오지 못했습니다." },
      { status: 503 }
    );
  }
}
