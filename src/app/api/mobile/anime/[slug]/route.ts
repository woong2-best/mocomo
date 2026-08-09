import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-anime-detail", 60);
  if (limited) return limited;

  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw ?? "").trim();
  if (!slug || slug.length > 120) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const anime = await db.anime.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      titleEn: true,
      genre: true,
      coverUrl: true,
      bannerUrl: true,
      synopsis: true,
      studio: true,
      tags: true,
      viewCount: true,
      characters: true,
      worldInfo: true,
    },
  });

  if (!anime) {
    return NextResponse.json({ error: "작품을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    item: {
      ...anime,
      characters: Array.isArray(anime.characters) ? anime.characters.slice(0, 24) : [],
    },
  });
}
