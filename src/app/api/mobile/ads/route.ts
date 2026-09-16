import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { fetchFeedAdPool } from "@/lib/feed-ads";
import { db } from "@/lib/db";

/** Mobile Reels sponsored pool (Instagram-style). Feed does not use this. */
export async function GET(req: NextRequest) {
  try {
    const limited = await rateLimitPublicApi(req, "mobile-ads", 60);
    if (limited) return limited;

    const viewerId = await getMobileUserId(req);
    if (viewerId) {
      const user = await db.user.findUnique({
        where: { id: viewerId },
        select: { premiumTier: true },
      });
      if (user?.premiumTier === "PREMIUM") {
        return NextResponse.json({ ads: [] });
      }
    }

    const ads = await fetchFeedAdPool();
    return NextResponse.json(
      { ads },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (e) {
    console.error("[api/mobile/ads]", e);
    return NextResponse.json({ ads: [] }, { status: 503 });
  }
}
