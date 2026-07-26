import { NextRequest, NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getCachedReelsPage } from "@/lib/reels/query";
import { getPostEngagementForUser } from "@/lib/post-engagement";
import { REELS_PAGE_SIZE } from "@/lib/reels/constants";

export async function GET(req: NextRequest) {
  try {
    const limited = await rateLimitPublicApi(req, "reels", 120);
    if (limited) return limited;

    const session = await getCachedSession();
    const cursor = req.nextUrl.searchParams.get("cursor");
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") || String(REELS_PAGE_SIZE), 10) ||
        REELS_PAGE_SIZE,
      30
    );

    const { items, nextCursor } = await getCachedReelsPage(cursor, limit);
    const postIds = items.map((i) => i.postId);

    const engagement =
      session?.user?.id && postIds.length > 0
        ? await getPostEngagementForUser(session.user.id, postIds)
        : { likedIds: [] as string[], starredIds: [] as string[], repostedIds: [] as string[] };

    const liked = new Set(engagement.likedIds);
    const starred = new Set(engagement.starredIds);

    return NextResponse.json(
      {
        items: items.map((item) => ({
          ...item,
          liked: liked.has(item.postId),
          starred: starred.has(item.postId),
        })),
        nextCursor,
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
    console.error("[api/reels]", e);
    return NextResponse.json(
      { items: [], nextCursor: null, error: "영상 피드를 불러오지 못했습니다." },
      { status: 503 }
    );
  }
}
