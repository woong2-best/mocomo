import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { CallStatus, CallType } from "@prisma/client";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
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
    const existing = await loadCallPayload(booking.voiceCall.id);
    if (!existing) {
      return NextResponse.json({ error: "통화 정보를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({
      call: existing,
      role: booking.fanId === auth.user.id ? "fan" : "creator",
    });
  }

  const callerId = booking.fanId;
  const calleeId = booking.creatorId;
  const signalingRoomId = `call-${randomUUID()}`;

  const call = await db.voiceCall.create({
    data: {
      callerId,
      calleeId,
      chatRoomId: booking.chatRoomId,
      signalingRoomId,
      callType: CallType.AUDIO,
      status: CallStatus.RINGING,
      bookingId: booking.id,
    },
  });

  void notifyIncomingCall(calleeId, callerId, CallType.AUDIO, call.id, booking.chatRoomId);

  const payload = await loadCallPayload(call.id);
  if (!payload) {
    return NextResponse.json({ error: "통화 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    call: payload,
    role: booking.fanId === auth.user.id ? "fan" : "creator",
  });
}

async function loadCallPayload(id: string) {
  const call = await db.voiceCall.findUnique({
    where: { id },
    include: {
      caller: { select: { id: true, username: true, image: true } },
      callee: { select: { id: true, username: true, image: true } },
    },
  });
  if (!call) return null;
  return {
    id: call.id,
    signalingRoomId: call.signalingRoomId,
    chatRoomId: call.chatRoomId,
    callType: call.callType,
    status: call.status,
    caller: call.caller,
    callee: call.callee,
  };
}
