import { NextRequest, NextResponse } from "next/server";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { serializeCallBooking, settleCallBooking } from "@/lib/call-booking";
import { loadBookingForUser } from "@/lib/call-booking-guards";
import { db } from "@/lib/db";

/** POST /api/mobile/call-bookings/[id]/complete — mark call done & settle creator */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const limited = await rateLimitPublicApi(req, `call-booking-complete:${auth.user.id}`, 20);
  if (limited) return limited;

  const { id } = await params;
  const result = await loadBookingForUser(id, auth.user.id);
  if ("error" in result) {
    const status = result.error === "NOT_FOUND" ? 404 : 403;
    return NextResponse.json({ error: status === 404 ? "예약을 찾을 수 없습니다." : "권한이 없습니다." }, { status });
  }

  const booking = result.booking;
  if (booking.creatorId !== auth.user.id && booking.fanId !== auth.user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  if (booking.status !== "CONFIRMED") {
    return NextResponse.json({ error: "완료 처리할 수 없는 상태입니다." }, { status: 422 });
  }

  const settle = await settleCallBooking(booking.id);
  if ("error" in settle) {
    return NextResponse.json({ error: settle.error }, { status: 422 });
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
