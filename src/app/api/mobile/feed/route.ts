import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { getCachedFeedPostsPage } from "@/lib/feed-query";
import { getPostEngagementForUser } from "@/lib/post-engagement";
import { filterPostsByAudienceLock } from "@/lib/posts-lock";

export async function GET(req: NextRequest) {
  try {
    const limited = await rateLimitPublicApi(req, "mobile-feed", 120);
    if (limited) return limited;

    const viewerId = await getMobileUserId(req);
    const cursor = req.nextUrl.searchParams.get("cursor");
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "12", 10), 30);

    const posts = await getCachedFeedPostsPage(cursor, limit);
    const visible = await filterPostsByAudienceLock(
      posts.map((p) => ({ ...p, authorId: p.author.id })),
      viewerId
    );

    const engagement =
      viewerId && visible.length > 0
        ? await getPostEngagementForUser(
            viewerId,
            visible.map((p) => p.id)
          )
        : { likedIds: [], starredIds: [], repostedIds: [] };

    return NextResponse.json({
      items: visible.map((data) => ({
        type: "post" as const,
        data: {
          ...data,
          // unstable_cache may revive Date as string
          createdAt:
            data.createdAt instanceof Date
              ? data.createdAt.toISOString()
              : String(data.createdAt),
        },
      })),
      nextCursor: posts.length === limit ? posts[posts.length - 1]?.id ?? null : null,
      likedIds: engagement.likedIds,
      starredIds: engagement.starredIds,
      repostedIds: engagement.repostedIds,
    });
  } catch (e) {
    console.error("[api/mobile/feed]", e);
    return NextResponse.json(
      { items: [], nextCursor: null, error: "피드를 불러오지 못했습니다." },
      { status: 503 }
    );
  }
}
