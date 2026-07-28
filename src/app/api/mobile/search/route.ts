import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { runFastSearch } from "@/lib/search-fast";
import { recordSearchEvent } from "@/lib/search/record";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-search", 60);
  if (limited) return limited;

  const viewerId = await getMobileUserId(req);
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({
      users: [],
      posts: [],
      animes: [],
      liveStreams: [],
    });
  }

  const result = await runFastSearch(q);
  void recordSearchEvent({
    rawQuery: q,
    resultCount:
      result.users.length +
      result.posts.length +
      result.animes.length +
      result.liveStreams.length,
    userId: viewerId,
  }).catch(() => undefined);

  return NextResponse.json({
    users: result.users.slice(0, 20).map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      image: u.image,
    })),
    posts: result.posts.slice(0, 20).map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content,
    })),
    animes: result.animes.slice(0, 12).map((a) => ({
      slug: a.slug,
      title: a.title,
      titleEn: a.titleEn ?? null,
      coverUrl: a.coverUrl ?? null,
    })),
    liveStreams: result.liveStreams.slice(0, 10).map((ch) => ({
      id: ch.id,
      name: ch.name,
      category: ch.category,
    })),
  });
}
