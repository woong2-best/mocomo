import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { listAnimeHistory } from "@/lib/anime-history";
import { restoreAnimeRevisionForUser } from "@/lib/anime-create-for-user";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-anime-history", 60);
  if (limited) return limited;

  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw ?? "").trim();
  if (!slug || slug.length > 120) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const data = await listAnimeHistory(slug);
  if ("error" in data) {
    return NextResponse.json({ error: data.error }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-anime-restore", 12);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw ?? "").trim();
  if (!slug || slug.length > 120) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let revisionId = "";
  try {
    const body = (await req.json()) as { revisionId?: string };
    revisionId = String(body.revisionId ?? "").trim();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  if (!revisionId || revisionId.startsWith("created-")) {
    return NextResponse.json({ error: "복구할 기록을 선택해 주세요." }, { status: 400 });
  }

  const result = await restoreAnimeRevisionForUser(auth.user.id, revisionId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ anime: result.anime, slug });
}
