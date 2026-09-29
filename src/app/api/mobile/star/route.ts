import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import {
  clearStarBookmarks,
  getStarHubForUser,
  listStarredMarketListings,
  listStarredWikiEntries,
  type StarHubKind,
} from "@/lib/star-bookmarks";

function parseKind(value: string | null): StarHubKind {
  if (value === "qna" || value === "market" || value === "wiki") return value;
  return "posts";
}

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
    communityId: p.communityId ?? null,
    community: p.community ?? null,
    isAnonymous: p.isAnonymous ?? false,
  };
}

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-star-list", 60);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const creatorId = req.nextUrl.searchParams.get("creatorId")?.trim() || null;
  const kind = parseKind(req.nextUrl.searchParams.get("kind"));

  if (kind === "market") {
    const items = await listStarredMarketListings(auth.user.id);
    return NextResponse.json({
      kind,
      items,
      creators: [],
      total: items.length,
    });
  }

  if (kind === "wiki") {
    const items = await listStarredWikiEntries(auth.user.id);
    return NextResponse.json({
      kind,
      items,
      creators: [],
      total: items.length,
    });
  }

  const postKind: "posts" | "qna" = kind === "qna" ? "qna" : "posts";
  const hub = await getStarHubForUser(auth.user.id, creatorId, postKind);
  return NextResponse.json({
    kind,
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

  const kindParam = req.nextUrl.searchParams.get("kind");
  const kind =
    kindParam === "posts" ||
    kindParam === "qna" ||
    kindParam === "market" ||
    kindParam === "wiki" ||
    kindParam === "all"
      ? kindParam
      : "all";
  const deleted = await clearStarBookmarks(auth.user.id, kind);
  return NextResponse.json({ ok: true, deleted });
}
