import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { recordProfileVisit } from "@/lib/follow-recommendations";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "profile-visit", 60);
  if (limited) return limited;

  const session = await auth();
  const visitorId = session?.user?.id;
  if (!visitorId) {
    return NextResponse.json({ ok: true, skipped: "guest" });
  }

  let body: { username?: string; profileUserId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let profileUserId = body.profileUserId?.trim();
  if (!profileUserId && body.username?.trim()) {
    const u = await db.user.findUnique({
      where: { username: body.username.trim() },
      select: { id: true },
    });
    profileUserId = u?.id;
  }
  if (!profileUserId) {
    return NextResponse.json({ error: "missing profile" }, { status: 400 });
  }

  try {
    await recordProfileVisit(visitorId, profileUserId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/signals/profile-visit]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
