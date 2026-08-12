import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { CallStatus } from "@prisma/client";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { issueCallLivekitCredentials } from "@/lib/call-livekit-credentials";
import { loadBookingForUser } from "@/lib/call-booking-guards";
import { db } from "@/lib/db";
import { notifyIncomingCall } from "@/lib/notifications";

const JOIN_WINDOW_BEFORE_MIN = 10;
const JOIN_WINDOW_AFTER_MIN = 30;

/** POST /api/mobile/call-bookings/[id]/join — start scheduled call within window */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const limited = await rateLimitPublicApi(req, `call-booking-join:${auth.user.id}`, 20);
  if (limited) return limited;

  const { id } = await params;
  const result = await loadBookingForUser(id, auth.user.id);
  if ("error" in result) {
    const status = result.error === "NOT_FOUND" ? 404 : 403;
    return NextResponse.json({ error: status === 404 ? "예약을 찾을 수 없습니다." : "권한이 없습니다." }, { status });
  }

  const booking = result.booking;
  if (booking.status !== "CONFIRMED") {
    return NextResponse.json({ error: "확정된 예약만 통화에 참여할 수 있습니다." }, { status: 422 });
  }

  const startMs = booking.scheduledStartAt.getTime();
  const endMs = startMs + booking.durationMinutes * 60_000;
  const now = Date.now();
  const windowStart = startMs - JOIN_WINDOW_BEFORE_MIN * 60_000;
  const windowEnd = endMs + JOIN_WINDOW_AFTER_MIN * 60_000;

  if (now < windowStart) {
    return NextResponse.json({ error: "아직 통화 시간이 아닙니다." }, { status: 422 });
  }
  if (now > windowEnd) {
    await db.creatorCallBooking.update({
      where: { id: booking.id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json({ error: "통화 가능 시간이 지났습니다." }, { status: 422 });
  }

  if (booking.voiceCall) {
    const existing = await db.voiceCall.findUnique({
      where: { id: booking.voiceCall.id },
      select: { id: true, status: true, livekitRoom: true, callType: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "통화 정보를 찾을 수 없습니다." }, { status: 404 });
    }
    const livekit = await issueCallLivekitCredentials(
      existing.livekitRoom,
      auth.user.id,
      auth.user.username,
      existing.callType
    );
    return NextResponse.json({
      call: { id: existing.id, callType: existing.callType, status: existing.status },
      livekit,
      role: booking.fanId === auth.user.id ? "fan" : "creator",
    });
  }

  const callerId = booking.fanId;
  const calleeId = booking.creatorId;
  const livekitRoom = `call-${randomUUID()}`;

  const call = await db.voiceCall.create({
    data: {
      callerId,
      calleeId,
      chatRoomId: booking.chatRoomId,
      livekitRoom,
      callType: booking.callType,
      status: CallStatus.RINGING,
      bookingId: booking.id,
    },
  });

  void notifyIncomingCall(calleeId, callerId, booking.callType, call.id, booking.chatRoomId);

  const livekit = await issueCallLivekitCredentials(
    livekitRoom,
    auth.user.id,
    auth.user.username,
    booking.callType
  );

  if (!livekit) {
    await db.voiceCall.update({
      where: { id: call.id },
      data: { status: CallStatus.ENDED, endedAt: new Date() },
    });
    return NextResponse.json({ error: "통화 서버가 설정되지 않았습니다." }, { status: 503 });
  }

  return NextResponse.json({
    call: { id: call.id, callType: call.callType, status: call.status },
    livekit,
    role: booking.fanId === auth.user.id ? "fan" : "creator",
  });
}
