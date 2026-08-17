import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { formatUsd, MIN_CALL_BOOKING_KRW, MAX_CALL_BOOKING_KRW } from "@/lib/money";
import {
  calcDurationMinutesFromAmount,
  getCreatorCallSettings,
  serializeCallBooking,
  validateBookingSchedule,
} from "@/lib/call-booking";
import { db } from "@/lib/db";
import { assertRoomMember } from "@/lib/call-booking-guards";

const createSchema = z.object({
  creatorId: z.string().min(1).max(64),
  chatRoomId: z.string().min(1).max(64),
  callType: z.enum(["AUDIO", "VIDEO"]),
  scheduledStartAt: z.string().datetime(),
  amountKrw: z.number().int().positive(),
  fanNote: z.string().max(500).optional(),
});

/** POST /api/mobile/call-bookings — create paid call booking (payment pending) */
export async function POST(req: NextRequest) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const limited = await rateLimitPublicApi(req, `call-booking-create:${auth.user.id}`, 15);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
  }

  const { creatorId, chatRoomId, callType, amountKrw, fanNote } = parsed.data;
  if (auth.user.id === creatorId) {
    return NextResponse.json({ error: "본인에게는 예약할 수 없습니다." }, { status: 400 });
  }

  const settings = await getCreatorCallSettings(creatorId);
  if (!settings.bookable || !settings.rateKrwPerHour) {
    return NextResponse.json({ error: "이 크리에이터는 통화 예약을 받지 않습니다." }, { status: 422 });
  }

  if (amountKrw < MIN_CALL_BOOKING_KRW || amountKrw > MAX_CALL_BOOKING_KRW) {
    return NextResponse.json(
      { error: `Amount must be between ${formatUsd(MIN_CALL_BOOKING_KRW)} and ${formatUsd(MAX_CALL_BOOKING_KRW)}.` },
      { status: 422 }
    );
  }

  const scheduledStartAt = new Date(parsed.data.scheduledStartAt);
  const scheduleError = validateBookingSchedule(scheduledStartAt);
  if (scheduleError) {
    return NextResponse.json({ error: scheduleError }, { status: 422 });
  }

  const durationMinutes = calcDurationMinutesFromAmount(amountKrw, settings.rateKrwPerHour);
  if (durationMinutes < 15) {
    return NextResponse.json({ error: "금액이 너무 적어 최소 통화 시간(15분)을 채우지 못합니다." }, { status: 422 });
  }

  const room = await db.chatRoom.findUnique({
    where: { id: chatRoomId },
    select: { id: true, type: true },
  });
  if (!room || room.type !== "DM") {
    return NextResponse.json({ error: "DM 방에서만 예약할 수 있습니다." }, { status: 400 });
  }

  const [fanMember, creatorMember] = await Promise.all([
    assertRoomMember(chatRoomId, auth.user.id),
    assertRoomMember(chatRoomId, creatorId),
  ]);
  if (!fanMember || !creatorMember) {
    return NextResponse.json({ error: "대화방 멤버가 아닙니다." }, { status: 403 });
  }

  const booking = await db.creatorCallBooking.create({
    data: {
      fanId: auth.user.id,
      creatorId,
      chatRoomId,
      callType,
      scheduledStartAt,
      durationMinutes,
      amountKrw,
      fanNote: fanNote?.trim() || null,
      status: "PAYMENT_PENDING",
    },
  });

  const callTypeLabel = callType === "VIDEO" ? "영상" : "음성";
  const orderName = `${callTypeLabel} 통화 예약 (${durationMinutes}분)`;

  return NextResponse.json({
    booking: serializeCallBooking(booking),
    checkout: {
      type: "CALL_BOOKING",
      amount: amountKrw,
      orderName,
      metadata: { bookingId: booking.id, creatorId, chatRoomId },
    },
  });
}
