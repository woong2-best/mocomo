import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { termsGateApiResponse } from "@/lib/legal/terms-agreement";
import { fetchReelsPage, getCachedReelsPage } from "@/lib/reels/query";
import { getBlockedUserIdSet } from "@/lib/user-block";
import { getPostEngagementForUser } from "@/lib/post-engagement";
import { REELS_PAGE_SIZE } from "@/lib/reels/constants";

export async function GET(req: NextRequest) {
  try {
    const limited = await rateLimitPublicApi(req, "mobile-reels", 120);
    if (limited) return limited;

    const viewerId = await getMobileUserId(req);
    if (viewerId) {
      const viewer = await db.user.findUnique({
        where: { id: viewerId },
        select: { currentTermsVersion: true },
      });
      const termsBlocked = await termsGateApiResponse(viewer?.currentTermsVersion);
      if (termsBlocked) return termsBlocked;
    }
    const cursor = req.nextUrl.searchParams.get("cursor");
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") || String(REELS_PAGE_SIZE), 10) ||
        REELS_PAGE_SIZE,
      30
    );

    const { items, nextCursor } = viewerId
      ? await fetchReelsPage(cursor, limit, await getBlockedUserIdSet(viewerId))
      : await getCachedReelsPage(cursor, limit);
    const postIds = items.map((i) => i.postId);

    const engagement =
      viewerId && postIds.length > 0
        ? await getPostEngagementForUser(viewerId, postIds)
        : { likedIds: [] as string[], starredIds: [] as string[], repostedIds: [] as string[] };

    const liked = new Set(engagement.likedIds);
    const starred = new Set(engagement.starredIds);
    const reposted = new Set(engagement.repostedIds);

    return NextResponse.json({
      items: items.map((item) => ({
        ...item,
        liked: liked.has(item.postId),
        starred: starred.has(item.postId),
        reposted: reposted.has(item.postId),
      })),
      nextCursor,
    });
  } catch (e) {
    console.error("[api/mobile/reels]", e);
    return NextResponse.json(
      { items: [], nextCursor: null, error: "Not found." },
      { status: 503 }
    );
  }
}
