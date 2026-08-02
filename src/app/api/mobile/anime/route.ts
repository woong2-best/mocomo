import { NextRequest, NextResponse } from "next/server";
import type { AnimeGenre, Prisma } from "@prisma/client";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { genreFromParam } from "@/lib/anime-genres";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-anime-list", 60);
  if (limited) return limited;
  await getMobileUserId(req);

  const take = Math.min(Number(req.nextUrl.searchParams.get("take") ?? "40") || 40, 80);
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const genreParam = req.nextUrl.searchParams.get("genre")?.trim();
  const genre: AnimeGenre | null = genreParam ? genreFromParam(genreParam) : null;

  const where: Prisma.AnimeWhereInput = {};
  if (genre) where.genre = genre;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { titleEn: { contains: q, mode: "insensitive" } },
    ];
  }

  const items = await db.anime.findMany({
    where: Object.keys(where).length ? where : undefined,
    orderBy: genre
      ? [{ title: "asc" }]
      : [{ viewCount: "desc" }, { updatedAt: "desc" }],
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
