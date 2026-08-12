import { NextRequest, NextResponse } from "next/server";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { serializeCallBooking } from "@/lib/call-booking";
import { loadBookingForUser } from "@/lib/call-booking-guards";

/** GET /api/mobile/call-bookings/[id] */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const limited = await rateLimitPublicApi(req, `call-booking-get:${auth.user.id}`, 60);
  if (limited) return limited;

  const { id } = await params;
  const result = await loadBookingForUser(id, auth.user.id);
  if ("error" in result) {
    const status = result.error === "NOT_FOUND" ? 404 : 403;
    return NextResponse.json(
      { error: result.error === "NOT_FOUND" ? "예약을 찾을 수 없습니다." : "권한이 없습니다." },
      { status }
    );
  }

  return NextResponse.json({ booking: serializeCallBooking(result.booking) });
}
