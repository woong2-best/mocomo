import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { getPostEngagementForUser } from "@/lib/post-engagement";
import { filterPostsByAudienceLock } from "@/lib/posts-lock";
import { attachWebPaidMediaPlayback } from "@/lib/paid-media-playback";
import { getSubscriptionsForViewer } from "@/lib/content-access";
import { isSubscriptionActive } from "@/lib/creator-subscription";
import { isPaymentsConfigured } from "@/lib/payments";
import { resolveCanViewNsfw } from "@/lib/nsfw-viewer-access";
import { fetchQnaFeedPage, parseQnaCategoryParam } from "@/lib/qna-feed";
import { redactAnonymousPostAuthors } from "@/lib/anonymous-post";

export async function GET(req: NextRequest) {
  try {
    const limited = await rateLimitPublicApi(req, "mobile-qna-feed", 120);
    if (limited) return limited;

    const cursor = req.nextUrl.searchParams.get("cursor")?.trim() || null;
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "10", 10), 24);
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    const category = parseQnaCategoryParam(req.nextUrl.searchParams.get("category"));
    const viewerId = await getMobileUserId(req);
    const canViewNsfw = await resolveCanViewNsfw(viewerId);

    const posts = await fetchQnaFeedPage({
      cursor,
      limit,
      q,
      category,
      canViewNsfw,
      variant: "mobile",
    });

    const visible = await filterPostsByAudienceLock(
      posts.map((p) => ({ ...p, authorId: p.author.id })),
      viewerId
    );
    const postIds = visible.map((p) => p.id);
    const authorIds = [...new Set(visible.map((p) => p.author.id))];

    const [gated, subscriptions, engagement] = await Promise.all([
      attachWebPaidMediaPlayback(visible, viewerId),
      getSubscriptionsForViewer(viewerId, authorIds),
      viewerId && postIds.length > 0
        ? getPostEngagementForUser(viewerId, postIds)
        : Promise.resolve({ likedIds: [], starredIds: [], repostedIds: [] }),
    ]);
    const paymentsEnabled = isPaymentsConfigured();

    const serialized = redactAnonymousPostAuthors(
      gated.map((data) => {
        const sub = subscriptions.get(data.author.id);
        return {
          ...data,
          isAnonymous: true,
          subscribedToAuthor: sub ? isSubscriptionActive(sub) : false,
          createdAt:
            data.createdAt instanceof Date ? data.createdAt.toISOString() : String(data.createdAt),
        };
      }),
      viewerId
    );

    return NextResponse.json(
      {
        items: serialized.map((data) => ({ type: "post" as const, data })),
        nextCursor: posts.length === limit ? posts[posts.length - 1]?.id ?? null : null,
        likedIds: engagement.likedIds,
        starredIds: engagement.starredIds,
        repostedIds: engagement.repostedIds,
        paymentsEnabled,
      },
      {
        headers: {
          "Cache-Control":
            viewerId || q || category ? "private, no-cache" : "public, s-maxage=15, stale-while-revalidate=45",
        },
      }
    );
  } catch (e) {
    console.error("[api/mobile/community/feed]", e);
    return NextResponse.json(
      { items: [], nextCursor: null, error: "QnA를 불러오지 못했습니다." },
      { status: 503 }
    );
  }
}
