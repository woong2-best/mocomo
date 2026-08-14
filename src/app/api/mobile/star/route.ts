import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { clearAllStarBookmarks, getStarHubForUser } from "@/lib/star-bookmarks";

function mapPost(p: Awaited<ReturnType<typeof getStarHubForUser>>["posts"][number]) {
  return {
    id: p.id,
    title: p.title,
    content: p.content,
    postType: p.postType,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
    isNsfw: p.isNsfw,
    author: p.author
      ? {
          id: p.author.id,
          username: p.author.username,
          name: p.author.name,
          image: p.author.image,
        }
      : null,
    media: p.media ?? [],
    _count: p._count,
    anime: p.anime ?? null,
  };
}

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-star-list", 60);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const creatorId = req.nextUrl.searchParams.get("creatorId")?.trim() || null;

  const hub = await getStarHubForUser(auth.user.id, creatorId);
  return NextResponse.json({
    items: hub.posts.map(mapPost),
    creators: hub.creators,
    total: hub.total,
  });
}

export async function DELETE(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-star-clear", 10);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const deleted = await clearAllStarBookmarks(auth.user.id);
  return NextResponse.json({ ok: true, deleted });
}
