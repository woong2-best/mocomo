import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId, requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { wikiCoverDisplayUrl } from "@/lib/wiki-cover-url";
import { updateAnimeForUser, type AnimeUpdateInput } from "@/lib/anime-create-for-user";

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

  const viewerId = await getMobileUserId(req);
  const anime = await db.anime.findUnique({
    where: { slug },
    select: {
      id: true,
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
      infobox: true,
      isProtected: true,
      createdAt: true,
      updatedAt: true,
      creator: { select: { username: true } },
    },
  });

  if (!anime) {
    return NextResponse.json({ error: "작품을 찾을 수 없습니다." }, { status: 404 });
  }

  const starred = viewerId
    ? Boolean(
        await db.animeStar.findUnique({
          where: { userId_animeId: { userId: viewerId, animeId: anime.id } },
          select: { id: true },
        })
      )
    : false;

  return NextResponse.json({
    item: {
      ...anime,
      coverUrl: wikiCoverDisplayUrl(anime.coverUrl),
      bannerUrl: wikiCoverDisplayUrl(anime.bannerUrl) ?? anime.bannerUrl,
      characters: Array.isArray(anime.characters) ? anime.characters.slice(0, 80) : [],
      starred,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-anime-update", 12);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw ?? "").trim();
  if (!slug || slug.length > 120) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let body: AnimeUpdateInput;
  try {
    body = (await req.json()) as AnimeUpdateInput;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const result = await updateAnimeForUser(auth.user.id, slug, body);
  if ("error" in result) {
    return NextResponse.json({ error: errorText(result.error) }, { status: 400 });
  }
  return NextResponse.json({ anime: result.anime });
}
