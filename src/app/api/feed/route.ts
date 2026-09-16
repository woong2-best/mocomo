import { NextRequest, NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { resolveFeedPage, type FeedMode } from "@/lib/feed-ranking";
import { getPostEngagementForUser } from "@/lib/post-engagement";
import { filterPostsByAudienceLock } from "@/lib/posts-lock";
import { attachWebPaidMediaPlayback } from "@/lib/paid-media-playback";
import { resolveCanViewNsfw } from "@/lib/nsfw-viewer-access";

export async function GET(req: NextRequest) {
  try {
    const limited = await rateLimitPublicApi(req, "feed", 120);
    if (limited) return limited;

    const session = await getCachedSession();
    const cursor = req.nextUrl.searchParams.get("cursor");
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "12", 10), 30);
    const modeParam = req.nextUrl.searchParams.get("mode");
    const mode: FeedMode =
      modeParam === "latest" || modeParam === "following" || modeParam === "for_you"
        ? modeParam
        : session?.user?.id
          ? "for_you"
          : "latest";

    const viewerUserId = session?.user?.id;
    const canViewNsfw = await resolveCanViewNsfw(viewerUserId);

    const posts = await resolveFeedPage({
      userId: viewerUserId ?? null,
      mode,
      cursor,
      limit,
      variant: "web",
      canViewNsfw,
    });
    const visible = await filterPostsByAudienceLock(
      posts.map((p) => ({ ...p, authorId: p.author.id })),
      session?.user?.id ?? null
    );
    const postIds = visible.map((p) => p.id);

    // Web: no in-feed ads (Sponsored lives in the right-panel photo slot only).
    const [gated, engagement] = await Promise.all([
      attachWebPaidMediaPlayback(visible, viewerUserId ?? null),
      viewerUserId && postIds.length > 0
        ? getPostEngagementForUser(viewerUserId, postIds)
        : Promise.resolve({ likedIds: [], starredIds: [], repostedIds: [] }),
    ]);

    const serialized = gated.map((data) => ({
      ...data,
      createdAt: data.createdAt.toISOString(),
    }));

    const nextCursor = posts.length === limit ? posts[posts.length - 1]?.id : null;

    return NextResponse.json(
      {
        items: serialized.map((data) => ({ type: "post" as const, data })),
        nextCursor,
        mode,
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
