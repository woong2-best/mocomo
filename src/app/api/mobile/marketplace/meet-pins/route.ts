import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { listMobileUsedMeetPins } from "@/lib/used-market-mobile";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-used-meet-pins", 60);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const result = await listMobileUsedMeetPins(auth.user.id);
  return NextResponse.json(result);
}
