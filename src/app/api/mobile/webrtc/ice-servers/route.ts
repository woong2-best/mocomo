import { NextRequest, NextResponse } from "next/server";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { resolveIceServersForCall, isTurnConfigured } from "@/lib/webrtc-turn/resolve-ice-servers";
import { normalizeTurnProvider } from "@/lib/webrtc-turn/stun";

/** GET /api/mobile/webrtc/ice-servers — STUN + TURN for mobile DM P2P (Bearer). */
export async function GET(req: NextRequest) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const limited = await rateLimitPublicApi(req, `mobile-webrtc-ice:${auth.user.id}`, 60);
  if (limited) return limited;

  const config = await resolveIceServersForCall(auth.user.id);
  const provider = normalizeTurnProvider(process.env.TURN_PROVIDER);

  return NextResponse.json({
    ...config,
    turnEnabled: isTurnConfigured(),
    provider,
  });
}
