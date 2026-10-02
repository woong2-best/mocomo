import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { toggleAnimeStarForUser } from "@/lib/star-bookmarks";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-anime-star", 30);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw ?? "").trim();
  if (!slug || slug.length > 120) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const anime = await db.anime.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!anime) {
    return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
  }

  const result = await toggleAnimeStarForUser(auth.user.id, anime.id);
  if ("error" in result) {
    return NextResponse.json({ error: errorText(result.error) }, { status: 400 });
  }
  return NextResponse.json(result);
}
