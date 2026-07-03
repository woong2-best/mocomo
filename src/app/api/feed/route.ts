import { NextRequest, NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getCachedFeedAds } from "@/lib/cached-data";
import { mixFeedWithAds } from "@/lib/feed-mixer";
import { getCachedFeedPostsPage } from "@/lib/feed-query";
import { getPostEngagementForUser } from "@/lib/post-engagement";

export async function GET(req: NextRequest) {
  try {
    const limited = await rateLimitPublicApi(req, "feed", 120);
    if (limited) return limited;

    const session = await getCachedSession();
    const isPremium = session?.user?.premiumTier === "PREMIUM";
    const cursor = req.nextUrl.searchParams.get("cursor");
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "12", 10), 30);
    const postOffset = Math.max(
      0,
      parseInt(req.nextUrl.searchParams.get("postOffset") || "0", 10) || 0
    );

    const posts = await getCachedFeedPostsPage(cursor, limit);

    const feedAds = isPremium ? [] : await getCachedFeedAds();

    const items = isPremium
      ? posts.map((data) => ({ type: "post" as const, data }))
      : mixFeedWithAds(posts, feedAds, { postsPerBlock: 6, minPostsBeforeFirstAd: 4, postOffset });

    const nextCursor = posts.length === limit ? posts[posts.length - 1]?.id : null;
    const engagement =
      session?.user?.id && posts.length > 0
        ? await getPostEngagementForUser(
            session.user.id,
            posts.map((p) => p.id)
          )
        : { likedIds: [], starredIds: [], repostedIds: [] };

    return NextResponse.json(
      {
        items: items.map((item) =>
          item.type === "post"
            ? { type: "post", data: { ...item.data, createdAt: item.data.createdAt.toISOString() } }
            : { type: "ad", data: item.data }
        ),
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
