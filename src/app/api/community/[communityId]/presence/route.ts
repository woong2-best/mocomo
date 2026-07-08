import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/db";
import type { NextRequest } from "next/server";
import type { CommunityPresenceStatus } from "@prisma/client";

export const runtime = "nodejs";
export const maxDuration = 8;

function authCookieName() {
  return process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

/** Presence 업데이트 — 실패해도 204 (음성 입장을 막지 않음) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ communityId: string }> }
) {
  try {
    const { communityId } = await params;
    const jwt = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
      cookieName: authCookieName(),
    });
    const userId = (jwt?.id as string | undefined) ?? (jwt?.sub as string | undefined);
    if (!userId) return new NextResponse(null, { status: 204 });

    const body = await req.json().catch(() => ({}));
    const presence = body.presence as CommunityPresenceStatus;
    if (!["ONLINE", "IDLE", "DND", "OFFLINE"].includes(presence)) {
      return new NextResponse(null, { status: 204 });
    }

    await db.communityMember.updateMany({
      where: { communityId, userId },
      data: { presence, lastSeenAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
