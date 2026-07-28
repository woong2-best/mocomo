import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getStarredPostsForUser } from "@/lib/star-bookmarks";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-star-list", 60);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const posts = await getStarredPostsForUser(auth.user.id);
  return NextResponse.json({
    items: posts.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      createdAt:
        p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
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
    })),
  });
}
