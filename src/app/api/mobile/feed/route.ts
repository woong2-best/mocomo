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
import { hydrateViewerPollVotes } from "@/lib/post-poll";
import { withRepostActivities } from "@/lib/repost-timeline";
import { applyViewerBlockPolicyToPosts } from "@/lib/user-block";
import { fetchFeedAdPool } from "@/lib/feed-ads";
import { mixFeedWithAds } from "@/lib/feed-mixer";

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
    const merged = await withRepostActivities(posts, {
      viewerId,
      cursor,
      mode: effectiveMode,
      variant: "mobile",
      canViewNsfw,
    });

    const visible = await hydrateViewerPollVotes(
      await filterPostsByAudienceLock(
        merged.map((p) => ({ ...p, authorId: p.author.id })),
        viewerId
      ),
      viewerId
    );
    const postIds = visible.map((p) => p.id);
    const authorIds = [...new Set(visible.map((p) => p.author.id))];

    const blockPolicyPosts = await applyViewerBlockPolicyToPosts(viewerId, visible);
    const postOffset = Math.max(
      0,
      Number.parseInt(req.nextUrl.searchParams.get("postOffset") || "0", 10) || 0
    );

    const [gated, subscriptions, engagement, viewerPin] = await Promise.all([
      attachWebPaidMediaPlayback(blockPolicyPosts, viewerId),
      getSubscriptionsForViewer(viewerId, authorIds),
      viewerId && postIds.length > 0
        ? getPostEngagementForUser(viewerId, postIds)
        : Promise.resolve({ likedIds: [], starredIds: [], repostedIds: [] }),
      viewerId
        ? db.user.findUnique({
            where: { id: viewerId },
            select: { profileMainPostId: true, premiumTier: true },
          })
        : Promise.resolve(null),
    ]);
    const viewerProfileMainPostId = viewerPin?.profileMainPostId ?? null;
    const paymentsEnabled = isPaymentsConfigured();

    const serialized = gated.map((data) => {
      const sub = subscriptions.get(data.author.id);
      return {
        ...data,
        subscribedToAuthor: sub ? isSubscriptionActive(sub) : false,
        profilePinned:
          !!viewerProfileMainPostId &&
          data.author.id === viewerId &&
          data.id === viewerProfileMainPostId,
        createdAt:
          data.createdAt instanceof Date
            ? data.createdAt.toISOString()
            : String(data.createdAt),
      };
    });

    const items =
      viewerPin?.premiumTier === "PREMIUM"
        ? serialized.map((data) => ({ type: "post" as const, data }))
        : mixFeedWithAds(serialized, await fetchFeedAdPool(), {
            postOffset,
            postsPerBlock: 6,
            minPostsBeforeFirstAd: 4,
          });

    return NextResponse.json(
      {
        items,
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
      { items: [], nextCursor: null, error: "Couldn't load the feed." },
      { status: 503 }
    );
  }
}
