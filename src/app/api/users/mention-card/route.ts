import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { loadMentionCard } from "@/lib/mentions";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "users-mention-card", 80);
  if (limited) return limited;

  const username = req.nextUrl.searchParams.get("username")?.trim() ?? "";
  if (username.length < 2 || username.length > 32) {
    return NextResponse.json({ missing: true }, { status: 404 });
  }

  const session = await auth();
  const card = await loadMentionCard(username, session?.user?.id ?? null);
  if ("missing" in card) {
    return NextResponse.json({ missing: true }, { status: 404 });
  }
  return NextResponse.json(
    { ok: true, user: card },
    { headers: { "Cache-Control": "private, max-age=30" } }
  );
}
