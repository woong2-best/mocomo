import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-post-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  clearStarBookmarks,
  getStarHubForUser,
  listStarredMarketListings,
  listStarredWikiEntries,
  type StarHubKind,
} from "@/lib/star-bookmarks";

function parseKind(value: string | null): StarHubKind {
  if (value === "all" || value === "qna" || value === "market" || value === "wiki") return value;
  return "posts";
}

export async function GET(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  const creatorId = req.nextUrl.searchParams.get("creatorId")?.trim() || null;
  const kind = parseKind(req.nextUrl.searchParams.get("kind"));

  try {
    if (kind === "all") {
      const [hub, listings, wiki] = await Promise.all([
        getStarHubForUser(authResult.user.id, creatorId),
        listStarredMarketListings(authResult.user.id),
        listStarredWikiEntries(authResult.user.id),
      ]);
      return NextResponse.json({
        kind,
        posts: hub.posts,
        listings,
        wiki,
        creators: hub.creators,
        total: hub.total + listings.length + wiki.length,
      });
    }
    if (kind === "market") {
      const listings = await listStarredMarketListings(authResult.user.id);
      return NextResponse.json({
        kind,
        posts: [],
        listings,
        wiki: [],
        creators: [],
        total: listings.length,
      });
    }
    if (kind === "wiki") {
      const wiki = await listStarredWikiEntries(authResult.user.id);
      return NextResponse.json({
        kind,
        posts: [],
        listings: [],
        wiki,
        creators: [],
        total: wiki.length,
      });
    }
    const hub = await getStarHubForUser(authResult.user.id, creatorId, kind);
    return NextResponse.json({
      kind,
      posts: hub.posts,
      listings: [],
      wiki: [],
      creators: hub.creators,
      total: hub.total,
    });
  } catch (e) {
    console.error("[api/star]", e);
    return NextResponse.json({ error: "Not found." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "star-clear", 10);
  if (limited) return limited;

  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  try {
    const kindParam = req.nextUrl.searchParams.get("kind");
    const kind =
      kindParam === "all" ||
      kindParam === "posts" ||
      kindParam === "qna" ||
      kindParam === "market" ||
      kindParam === "wiki"
        ? kindParam
        : "all";
    const deleted = await clearStarBookmarks(authResult.user.id, kind);
    return NextResponse.json({ ok: true, deleted });
  } catch (e) {
    console.error("[api/star DELETE]", e);
    return NextResponse.json({ error: "Not found." }, { status: 500 });
  }
}
