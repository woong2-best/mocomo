import { NextRequest, NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getPostEngagementForUser } from "@/lib/post-engagement";
import { filterPostsByAudienceLock } from "@/lib/posts-lock";
import { attachWebPaidMediaPlayback } from "@/lib/paid-media-playback";
import { resolveCanViewNsfw } from "@/lib/nsfw-viewer-access";
import { fetchQnaFeedPage, parseQnaCategoryParam } from "@/lib/qna-feed";
import { redactAnonymousPostAuthors } from "@/lib/anonymous-post";

export async function GET(req: NextRequest) {
  try {
    const limited = await rateLimitPublicApi(req, "qna-feed", 120);
    if (limited) return limited;

    const session = await getCachedSession();
    const cursor = req.nextUrl.searchParams.get("cursor")?.trim() || null;
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "12", 10), 30);
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    const category = parseQnaCategoryParam(req.nextUrl.searchParams.get("category"));
    const viewerUserId = session?.user?.id;
    const canViewNsfw = await resolveCanViewNsfw(viewerUserId);

    const posts = await fetchQnaFeedPage({
      cursor,
      limit,
      q,
      category,
      canViewNsfw,
      variant: "web",
    });
    const visible = await filterPostsByAudienceLock(
      posts.map((p) => ({ ...p, authorId: p.author.id })),
      viewerUserId ?? null
    );
    const postIds = visible.map((p) => p.id);

    const [gated, engagement] = await Promise.all([
      attachWebPaidMediaPlayback(visible, viewerUserId ?? null),
      viewerUserId && postIds.length > 0
        ? getPostEngagementForUser(viewerUserId, postIds)
        : Promise.resolve({ likedIds: [], starredIds: [], repostedIds: [] }),
    ]);

    const serialized = redactAnonymousPostAuthors(
      gated.map((data) => ({
        ...data,
        isAnonymous: true,
        createdAt: data.createdAt instanceof Date ? data.createdAt.toISOString() : String(data.createdAt),
      })),
      viewerUserId
    );

    return NextResponse.json(
      {
        items: serialized.map((data) => ({ type: "post" as const, data })),
        nextCursor: posts.length === limit ? posts[posts.length - 1]?.id ?? null : null,
        likedIds: engagement.likedIds,
        starredIds: engagement.starredIds,
        repostedIds: engagement.repostedIds,
      },
      {
        headers: {
          "Cache-Control":
            session?.user?.id || q || category
              ? "private, no-cache"
              : "public, s-maxage=15, stale-while-revalidate=30",
        },
      }
    );
  } catch (e) {
    console.error("[api/communities/feed]", e);
    return NextResponse.json(
      { items: [], nextCursor: null, error: "QnA를 불러오지 못했습니다." },
      { status: 503 }
    );
  }
}
