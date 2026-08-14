import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-post-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { clearAllStarBookmarks, getStarHubForUser } from "@/lib/star-bookmarks";

export async function GET(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  const creatorId = req.nextUrl.searchParams.get("creatorId")?.trim() || null;

  try {
    const hub = await getStarHubForUser(authResult.user.id, creatorId);
    return NextResponse.json({
      posts: hub.posts,
      creators: hub.creators,
      total: hub.total,
    });
  } catch (e) {
    console.error("[api/star]", e);
    return NextResponse.json({ error: "STAR 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "star-clear", 10);
  if (limited) return limited;

  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  try {
    const deleted = await clearAllStarBookmarks(authResult.user.id);
    return NextResponse.json({ ok: true, deleted });
  } catch (e) {
    console.error("[api/star DELETE]", e);
    return NextResponse.json({ error: "STAR 기록을 삭제하지 못했습니다." }, { status: 500 });
  }
}
