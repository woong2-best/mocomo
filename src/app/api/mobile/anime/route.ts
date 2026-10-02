import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import type { AnimeGenre } from "@prisma/client";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { genreFromParam } from "@/lib/anime-genres";
import { createAnimeForUser, type AnimeCreateInput } from "@/lib/anime-create-for-user";
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

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-anime-create", 12);
  if (limited) return limited;

  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  let body: AnimeCreateInput;
  try {
    body = (await req.json()) as AnimeCreateInput;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await createAnimeForUser(userId, body);
  if ("error" in result) {
    return NextResponse.json({ error: errorText(result.error) }, { status: 400 });
  }

  return NextResponse.json({ anime: result.anime }, { status: 201 });
}
