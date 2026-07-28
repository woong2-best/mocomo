import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-anime-list", 60);
  if (limited) return limited;
  await getMobileUserId(req);

  const take = Math.min(Number(req.nextUrl.searchParams.get("take") ?? "40") || 40, 80);
  const q = req.nextUrl.searchParams.get("q")?.trim();

  const items = await db.anime.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { titleEn: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ viewCount: "desc" }, { updatedAt: "desc" }],
    take,
    select: {
      slug: true,
      title: true,
      titleEn: true,
      coverUrl: true,
      genre: true,
      viewCount: true,
    },
  });

  return NextResponse.json({ items });
}
