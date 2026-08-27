import { NextRequest, NextResponse } from "next/server";
import { CallStatus } from "@prisma/client";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";

/** POST /api/mobile/calls/[callId]/accept — callee accepts ringing call. */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ callId: string }> }
) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const { callId } = await ctx.params;

  const limited = await rateLimitPublicApi(req, `mobile-call-accept:${user.id}`, 30);
  if (limited) return limited;

  const updatedCount = await db.voiceCall.updateMany({
    where: { id: callId, calleeId: user.id, status: CallStatus.RINGING },
    data: { status: CallStatus.ACTIVE, startedAt: new Date() },
  });
  if (updatedCount.count === 0) {
    const existing = await db.voiceCall.findUnique({
      where: { id: callId },
      select: { calleeId: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "통화를 찾을 수 없습니다." }, { status: 404 });
    }
    if (existing.calleeId !== user.id) {
      return NextResponse.json({ error: "수신자만 받을 수 있습니다." }, { status: 403 });
    }
    return NextResponse.json({ error: "이미 처리된 통화입니다." }, { status: 409 });
  }

  const call = await db.voiceCall.findUnique({
    where: { id: callId },
    include: {
      caller: { select: { id: true, username: true, image: true } },
      callee: { select: { id: true, username: true, image: true } },
    },
  });
  if (!call) {
    return NextResponse.json({ error: "통화를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    call: {
      id: call.id,
      signalingRoomId: call.signalingRoomId,
      chatRoomId: call.chatRoomId,
      callType: call.callType,
      status: call.status,
      caller: call.caller,
      callee: call.callee,
    },
  });
}
