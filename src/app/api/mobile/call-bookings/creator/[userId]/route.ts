import { NextRequest, NextResponse } from "next/server";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getCreatorCallSettings } from "@/lib/call-booking";

/** GET /api/mobile/call-bookings/creator/[userId] — bookable creator call settings */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const limited = await rateLimitPublicApi(req, "call-booking-creator-meta", 120);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const { userId } = await params;
  if (!userId?.trim()) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const settings = await getCreatorCallSettings(userId);
  return NextResponse.json(settings);
}
