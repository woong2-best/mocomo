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

  const where =
    q.length <= 20 && !/\s/.test(q)
      ? {
          OR: [
            { title: { startsWith: q, mode: "insensitive" as const } },
            { titleEn: { startsWith: q, mode: "insensitive" as const } },
            { synopsis: { contains: q, mode: "insensitive" as const } },
            { worldInfo: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { titleEn: { contains: q, mode: "insensitive" as const } },
            { synopsis: { contains: q, mode: "insensitive" as const } },
            { worldInfo: { contains: q, mode: "insensitive" as const } },
          ],
        };

  const results = await db.anime.findMany({
    where,
    take: 10,
    orderBy: [{ viewCount: "desc" }, { updatedAt: "desc" }],
    select: { slug: true, title: true, titleEn: true },
  });

  const popular = await getPopularWikiSearchQueries(6);
  return NextResponse.json({ results, popular });
}
