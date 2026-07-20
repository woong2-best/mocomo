import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { searchUsersForCollab } from "@/lib/dm-user-search";

/** Collaborator invite typeahead — username/name prefix + exact UID. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await rateLimitPublicApi(req, "users-collab-search", 60);
  if (limited) return limited;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ ok: true, users: [] });
  }
  if (q.length > 64) {
    return NextResponse.json({ error: "검색어가 너무 깁니다." }, { status: 400 });
  }

  try {
    const users = await searchUsersForCollab(session.user.id, q);
    return NextResponse.json(
      { ok: true, query: q, users },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (e) {
    console.error("[api/users/collab-search]", e);
    return NextResponse.json({ error: "검색에 실패했습니다." }, { status: 500 });
  }
}
