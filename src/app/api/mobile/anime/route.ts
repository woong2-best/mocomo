import { NextRequest, NextResponse } from "next/server";
import type { AnimeGenre } from "@prisma/client";
import { rateLimitPublicApi } from "@/lib/api-security";
import { genreFromParam } from "@/lib/anime-genres";
import { getCachedMobileAnimeList } from "@/lib/mobile-public-lists";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-anime-list", 60);
  if (limited) return limited;

  const take = Math.min(Number(req.nextUrl.searchParams.get("take") ?? "40") || 40, 80);
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const genreParam = req.nextUrl.searchParams.get("genre")?.trim();
  const genre: AnimeGenre | null = genreParam ? genreFromParam(genreParam) : null;

  const items = await getCachedMobileAnimeList({ take, q, genre });

  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control":
          q || genre
            ? "private, no-cache"
            : "public, s-maxage=30, stale-while-revalidate=90",
      },
    }
  );
}
