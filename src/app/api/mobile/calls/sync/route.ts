import { NextRequest, NextResponse } from "next/server";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getCallSyncForUser } from "@/lib/call-sync";

/** GET /api/mobile/calls/sync — ringing/active call for the signed-in user. */
export async function GET(req: NextRequest) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const limited = await rateLimitPublicApi(req, `mobile-call-sync:${auth.user.id}`, 60);
  if (limited) return limited;

  return NextResponse.json(await getCallSyncForUser(auth.user.id));
}
