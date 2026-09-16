import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { resolveFeedPage, type FeedMode } from "@/lib/feed-ranking";
import { getPostEngagementForUser } from "@/lib/post-engagement";
import { filterPostsByAudienceLock } from "@/lib/posts-lock";
import { attachWebPaidMediaPlayback } from "@/lib/paid-media-playback";
import { getSubscriptionsForViewer } from "@/lib/content-access";
import { isSubscriptionActive } from "@/lib/creator-subscription";
import { isPaymentsConfigured } from "@/lib/payments";
import { db } from "@/lib/db";
import { resolveCanViewNsfw } from "@/lib/nsfw-viewer-access";

export async function GET(req: NextRequest) {
  try {
    const limited = await rateLimitPublicApi(req, "mobile-feed", 120);
    if (limited) return limited;

    const cursor = req.nextUrl.searchParams.get("cursor");
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "10", 10), 24);
    const modeParam = req.nextUrl.searchParams.get("mode");
    const mode: FeedMode =
      modeParam === "latest" || modeParam === "following" || modeParam === "for_you"
        ? modeParam
        : "for_you";

    const viewerId = await getMobileUserId(req);
    let effectiveMode: FeedMode = viewerId ? mode : "latest";

    if (viewerId && effectiveMode === "for_you") {
      const prefs = await db.user.findUnique({
        where: { id: viewerId },
        select: { feedRecommendationEnabled: true },
      });
      if (prefs && !prefs.feedRecommendationEnabled) {
        effectiveMode = "latest";
      }
    }

    const canViewNsfw = await resolveCanViewNsfw(viewerId);

    const posts = await resolveFeedPage({
      userId: viewerId,
      mode: effectiveMode,
      cursor,
      limit,
      variant: "mobile",
      canViewNsfw,
    });

    const visible = await filterPostsByAudienceLock(
      posts.map((p) => ({ ...p, authorId: p.author.id })),
      viewerId
    );
    const postIds = visible.map((p) => p.id);
    const authorIds = [...new Set(visible.map((p) => p.author.id))];

    // Mobile: no in-feed ads — Instagram-style placement is Reels-only.
    const [gated, subscriptions, engagement] = await Promise.all([
      attachWebPaidMediaPlayback(visible, viewerId),
      getSubscriptionsForViewer(viewerId, authorIds),
      viewerId && postIds.length > 0
        ? getPostEngagementForUser(viewerId, postIds)
        : Promise.resolve({ likedIds: [], starredIds: [], repostedIds: [] }),
    ]);
    const paymentsEnabled = isPaymentsConfigured();

    const serialized = gated.map((data) => {
      const sub = subscriptions.get(data.author.id);
      return {
        ...data,
        subscribedToAuthor: sub ? isSubscriptionActive(sub) : false,
        createdAt:
          data.createdAt instanceof Date
            ? data.createdAt.toISOString()
            : String(data.createdAt),
      };
    });

    return NextResponse.json(
      {
        items: serialized.map((data) => ({ type: "post" as const, data })),
        nextCursor: posts.length === limit ? posts[posts.length - 1]?.id ?? null : null,
        mode: effectiveMode,
        likedIds: engagement.likedIds,
        starredIds: engagement.starredIds,
        repostedIds: engagement.repostedIds,
        paymentsEnabled,
      },
      {
        headers: {
          // Personalized likes — keep private; edge still benefits from lean payload.
          "Cache-Control": viewerId
            ? "private, no-cache"
            : "public, s-maxage=15, stale-while-revalidate=45",
        },
      }
    );
  } catch (e) {
    console.error("[api/mobile/feed]", e);
    return NextResponse.json(
      { items: [], nextCursor: null, error: "피드를 불러오지 못했습니다." },
      { status: 503 }
    );
  }
}
