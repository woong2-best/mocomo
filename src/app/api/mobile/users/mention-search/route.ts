import { NextRequest, NextResponse } from "next/server";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { searchUsersForMention } from "@/lib/mentions";

export async function GET(req: NextRequest) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const limited = await rateLimitPublicApi(req, "mobile-mention-search", 80);
  if (limited) return limited;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ ok: true, users: [] });
  }
  if (q.length > 64) {
    return NextResponse.json({ error: "Search query is too long." }, { status: 400 });
  }

  try {
    const users = await searchUsersForMention(auth.user.id, q);
    return NextResponse.json({ ok: true, query: q, users });
  } catch (e) {
    console.error("[api/mobile/users/mention-search]", e);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
