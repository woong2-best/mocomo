import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPopularWikiSearchQueries, logWikiSearchQuery } from "@/lib/wiki-search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const popularOnly = req.nextUrl.searchParams.get("popular") === "1";

  if (popularOnly) {
    const popular = await getPopularWikiSearchQueries(10);
    return NextResponse.json({ popular });
  }

  if (q.length < 1) {
    const popular = await getPopularWikiSearchQueries(8);
    return NextResponse.json({ results: [], popular });
  }

  if (q.length >= 2) void logWikiSearchQuery(q);

  // 공백/대소문자 무시 매칭: "귀멸의칼날" ↔ "귀멸의 칼날"
  const compact = q.replace(/\s+/g, "").toLowerCase().replace(/[\\%_]/g, "");
  const likeCompact = `%${compact}%`;

  const results = compact.length >= 1
    ? await db.$queryRaw<{ slug: string; title: string; titleEn: string | null }[]>`
        SELECT slug, title, "titleEn"
        FROM "Anime"
        WHERE replace(lower(title), ' ', '') LIKE ${likeCompact}
           OR replace(lower(coalesce("titleEn", '')), ' ', '') LIKE ${likeCompact}
           OR lower(coalesce(synopsis, '')) LIKE ${`%${q.toLowerCase().replace(/[\\%_]/g, "")}%`}
           OR lower(coalesce("worldInfo", '')) LIKE ${`%${q.toLowerCase().replace(/[\\%_]/g, "")}%`}
           OR EXISTS (
                SELECT 1 FROM unnest(tags) AS t
                WHERE replace(lower(t), ' ', '') LIKE ${likeCompact}
              )
        ORDER BY "viewCount" DESC, "updatedAt" DESC
        LIMIT 10
      `
    : [];

  const popular = await getPopularWikiSearchQueries(6);
  return NextResponse.json({ results, popular });
}
