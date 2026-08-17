import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { getCachedMobileFeedPostsPage } from "@/lib/feed-query";
import { getPostEngagementForUser } from "@/lib/post-engagement";
import { filterPostsByAudienceLock } from "@/lib/posts-lock";
import { attachWebPaidMediaPlayback } from "@/lib/paid-media-playback";
import { getSubscriptionsForViewer } from "@/lib/content-access";
import { isSubscriptionActive } from "@/lib/creator-subscription";
import { isPaymentsConfigured } from "@/lib/payments";

export async function GET(req: NextRequest) {
  try {
    const limited = await rateLimitPublicApi(req, "mobile-feed", 120);
    if (limited) return limited;

    const cursor = req.nextUrl.searchParams.get("cursor");
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "10", 10), 24);

    // Auth + cached posts in parallel (JWT verify must not block DB cache read).
    const [viewerId, posts] = await Promise.all([
      getMobileUserId(req),
      getCachedMobileFeedPostsPage(cursor, limit),
    ]);

    const visible = await filterPostsByAudienceLock(
      posts.map((p) => ({ ...p, authorId: p.author.id })),
      viewerId
    );
    const gated = await attachWebPaidMediaPlayback(visible, viewerId);

    const authorIds = [...new Set(gated.map((p) => p.author.id))];
    const subscriptions = await getSubscriptionsForViewer(viewerId, authorIds);
    const paymentsEnabled = isPaymentsConfigured();

    const engagement =
      viewerId && gated.length > 0
        ? await getPostEngagementForUser(
            viewerId,
            gated.map((p) => p.id)
          )
        : { likedIds: [], starredIds: [], repostedIds: [] };

    return NextResponse.json(
      {
        items: gated.map((data) => {
          const sub = subscriptions.get(data.author.id);
          return {
            type: "post" as const,
            data: {
              ...data,
              subscribedToAuthor: sub ? isSubscriptionActive(sub) : false,
              createdAt:
                data.createdAt instanceof Date
                  ? data.createdAt.toISOString()
                  : String(data.createdAt),
            },
          };
        }),
        nextCursor: posts.length === limit ? posts[posts.length - 1]?.id ?? null : null,
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
