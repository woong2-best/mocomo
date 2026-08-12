import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { processCallBookingRefundApproval, serializeCallBooking } from "@/lib/call-booking";
import { loadBookingForUser } from "@/lib/call-booking-guards";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

const bodySchema = z.object({
  note: z.string().max(500).optional(),
});

/** POST /api/mobile/call-bookings/[id]/reject — creator rejects (auto refund) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const limited = await rateLimitPublicApi(req, `call-booking-reject:${auth.user.id}`, 30);
  if (limited) return limited;

  const { id } = await params;
  const result = await loadBookingForUser(id, auth.user.id);
  if ("error" in result) {
    const status = result.error === "NOT_FOUND" ? 404 : 403;
    return NextResponse.json({ error: status === 404 ? "예약을 찾을 수 없습니다." : "권한이 없습니다." }, { status });
  }

  const booking = result.booking;
  if (booking.creatorId !== auth.user.id) {
    return NextResponse.json({ error: "크리에이터만 거절할 수 있습니다." }, { status: 403 });
  }
  if (booking.status !== "PENDING_CREATOR") {
    return NextResponse.json({ error: "거절할 수 없는 상태입니다." }, { status: 422 });
  }

  let note: string | undefined;
  try {
    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    note = parsed.success ? parsed.data.note : undefined;
  } catch {
    /* empty body ok */
  }

  await db.creatorCallBooking.update({
    where: { id: booking.id },
    data: {
      status: "REJECTED",
      cancelledAt: new Date(),
      creatorNote: note?.trim() || booking.creatorNote,
    },
  });

  await db.callBookingRefund.create({
    data: {
      bookingId: booking.id,
      requestedById: booking.fanId,
      reason: note?.trim() || "크리에이터가 예약을 거절했습니다.",
      status: "REQUESTED",
    },
  });

  const refundResult = await processCallBookingRefundApproval(booking.id, auth.user.id);
  if ("error" in refundResult) {
    return NextResponse.json({ error: refundResult.error }, { status: 422 });
  }

  const updated = await db.creatorCallBooking.findUnique({
    where: { id: booking.id },
    include: {
      voiceCall: { select: { id: true, status: true } },
      refund: { select: { id: true, status: true, reason: true } },
    },
  });

  void createNotification({
    userId: booking.fanId,
    type: "SYSTEM",
    title: "통화 예약 거절",
    body: "크리에이터가 예약을 거절했습니다. 결제 금액이 환불됩니다.",
    link: `/messages?room=${booking.chatRoomId}`,
    actorId: auth.user.id,
  });

  return NextResponse.json({ booking: serializeCallBooking(updated!) });
}
