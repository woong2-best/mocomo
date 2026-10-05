import { NextRequest, NextResponse } from "next/server";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { P2P_STUN_ICE_CONFIG } from "@/lib/peer-call/p2p-ice";

/** GET /api/mobile/webrtc/ice-servers — Google STUN only for mobile DM P2P (Bearer). */
export async function GET(req: NextRequest) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const limited = await rateLimitPublicApi(req, `mobile-webrtc-ice:${auth.user.id}`, 60);
  if (limited) return limited;

  return NextResponse.json({
    ...P2P_STUN_ICE_CONFIG,
    turnEnabled: false,
    provider: "none",
  });
}
