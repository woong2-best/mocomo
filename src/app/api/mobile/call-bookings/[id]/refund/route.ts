import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  processCallBookingRefundApproval,
  serializeCallBooking,
} from "@/lib/call-booking";
import { loadBookingForUser } from "@/lib/call-booking-guards";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

const requestSchema = z.object({
  reason: z.string().min(5).max(1000),
  action: z.enum(["request", "approve", "reject"]).optional(),
});

/** POST /api/mobile/call-bookings/[id]/refund */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const limited = await rateLimitPublicApi(req, `call-booking-refund:${auth.user.id}`, 15);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "환불 사유를 5자 이상 입력해 주세요." }, { status: 400 });
  }

  const { id } = await params;
  const result = await loadBookingForUser(id, auth.user.id);
  if ("error" in result) {
    const status = result.error === "NOT_FOUND" ? 404 : 403;
    return NextResponse.json({ error: status === 404 ? "예약을 찾을 수 없습니다." : "권한이 없습니다." }, { status });
  }

  const booking = result.booking;
  const action = parsed.data.action ?? "request";

  if (action === "approve") {
    if (booking.creatorId !== auth.user.id) {
      return NextResponse.json({ error: "크리에이터만 환불을 승인할 수 있습니다." }, { status: 403 });
    }
    const refundResult = await processCallBookingRefundApproval(booking.id, auth.user.id);
    if ("error" in refundResult) {
      return NextResponse.json({ error: refundResult.error }, { status: 422 });
    }
  } else if (action === "reject") {
    if (booking.creatorId !== auth.user.id) {
      return NextResponse.json({ error: "크리에이터만 환불을 거절할 수 있습니다." }, { status: 403 });
    }
    if (!booking.refund || booking.refund.status !== "REQUESTED") {
      return NextResponse.json({ error: "처리할 환불 요청이 없습니다." }, { status: 422 });
    }
    await db.callBookingRefund.update({
      where: { id: booking.refund.id },
      data: { status: "REJECTED", resolvedAt: new Date(), resolvedById: auth.user.id },
    });
    await db.creatorCallBooking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED" },
    });
    void createNotification({
      userId: booking.fanId,
      type: "SYSTEM",
      title: "환불 요청 거절",
      body: "크리에이터가 환불 요청을 거절했습니다.",
      link: `/messages?room=${booking.chatRoomId}`,
      actorId: auth.user.id,
    });
  } else {
    if (booking.fanId !== auth.user.id) {
      return NextResponse.json({ error: "예약자만 환불을 신청할 수 있습니다." }, { status: 403 });
    }
    const refundable = ["CONFIRMED", "EXPIRED", "PENDING_CREATOR"].includes(booking.status);
    if (!refundable) {
      return NextResponse.json({ error: "환불 신청할 수 없는 상태입니다." }, { status: 422 });
    }
    if (booking.refund) {
      return NextResponse.json({ error: "이미 환불 요청이 있습니다." }, { status: 409 });
    }

    await db.$transaction([
      db.callBookingRefund.create({
        data: {
          bookingId: booking.id,
          requestedById: auth.user.id,
          reason: parsed.data.reason.trim(),
          status: "REQUESTED",
        },
      }),
      db.creatorCallBooking.update({
        where: { id: booking.id },
        data: { status: "REFUND_REQUESTED" },
      }),
    ]);

    void createNotification({
      userId: booking.creatorId,
      type: "SYSTEM",
      title: "통화 예약 환불 요청",
      body: "팬이 통화 예약 환불을 요청했습니다.",
      link: `/messages?room=${booking.chatRoomId}`,
      actorId: auth.user.id,
    });
  }

  const updated = await db.creatorCallBooking.findUnique({
    where: { id: booking.id },
    include: {
      voiceCall: { select: { id: true, status: true } },
      refund: { select: { id: true, status: true, reason: true } },
    },
  });

  return NextResponse.json({ booking: serializeCallBooking(updated!) });
}
