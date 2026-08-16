import { NextRequest, NextResponse } from "next/server";
import { CallStatus } from "@prisma/client";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";

/** POST /api/mobile/calls/[callId]/end — end/decline a call. */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ callId: string }> }
) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const { callId } = await ctx.params;

  const limited = await rateLimitPublicApi(req, `mobile-call-end:${user.id}`, 40);
  if (limited) return limited;

  const call = await db.voiceCall.findUnique({
    where: { id: callId },
    select: { id: true, callerId: true, calleeId: true, status: true },
  });
  if (!call) {
    return NextResponse.json({ error: "통화를 찾을 수 없습니다." }, { status: 404 });
  }
  if (call.callerId !== user.id && call.calleeId !== user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  if (call.status === CallStatus.ENDED || call.status === CallStatus.DECLINED) {
    return NextResponse.json({ ok: true });
  }

  await db.voiceCall.update({
    where: { id: callId },
    data: {
      status: call.status === CallStatus.RINGING ? CallStatus.DECLINED : CallStatus.ENDED,
      endedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
