import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { getRelatedSearchQueries } from "@/lib/search/suggest";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "search-topics", 60);
  if (limited) return limited;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const topicId = req.nextUrl.searchParams.get("topicId")?.trim();

  try {
    if (q) {
      const related = await getRelatedSearchQueries(q, 12);
      return NextResponse.json({ ok: true, related });
    }

    if (topicId) {
      const topic = await db.searchTopic.findUnique({
        where: { id: topicId },
        include: {
          keywords: { take: 50 },
          queries: {
            orderBy: { searchCount: "desc" },
            take: 30,
            select: {
              id: true,
              displayQuery: true,
              normalizedQuery: true,
              searchCount: true,
            },
          },
        },
      });
      if (!topic) {
        return NextResponse.json({ error: "Topic 없음" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, topic });
    }

    const topics = await db.searchTopic.findMany({
      take: 50,
      orderBy: { searchCount: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        searchCount: true,
        _count: { select: { queries: true } },
      },
    });
    return NextResponse.json({ ok: true, topics });
  } catch (e) {
    console.error("[api/search/topics]", e);
    return NextResponse.json({ error: "Topic 조회 실패" }, { status: 500 });
  }
}
