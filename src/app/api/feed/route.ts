import { NextRequest, NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { mixFeedWithAds } from "@/lib/feed-mixer";
import { FALLBACK_FEED_ADS } from "@/lib/default-ads";
import { userPublicSelect } from "@/lib/user-public-select";
import { postMediaPreview } from "@/lib/post-media-select";

export async function GET(req: NextRequest) {
  try {
    const session = await getCachedSession();
    const isPremium = session?.user?.premiumTier === "PREMIUM";
    const cursor = req.nextUrl.searchParams.get("cursor");
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "12", 10), 30);

    const posts = await db.post.findMany({
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: userPublicSelect },
        anime: { select: { title: true, slug: true } },
        media: postMediaPreview,
        _count: { select: { likes: true, comments: true, votes: true, reposts: true } },
      },
    });

    let feedAds = isPremium
      ? []
      : await db.adSlot.findMany({ where: { active: true, isFeedAd: true }, take: 10 });

    if (feedAds.length === 0 && !isPremium) {
      feedAds = [...FALLBACK_FEED_ADS] as typeof feedAds;
    }

    const items = isPremium
      ? posts.map((data) => ({ type: "post" as const, data }))
      : mixFeedWithAds(posts, feedAds, 6);

    const nextCursor = posts.length === limit ? posts[posts.length - 1]?.id : null;

    return NextResponse.json(
      {
        items: items.map((item) =>
          item.type === "post"
            ? { type: "post", data: { ...item.data, createdAt: item.data.createdAt.toISOString() } }
            : { type: "ad", data: item.data }
        ),
        nextCursor,
      },
      {
        headers: {
          "Cache-Control": session?.user?.id
            ? "private, max-age=10, stale-while-revalidate=30"
            : "public, s-maxage=30, stale-while-revalidate=60",
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
