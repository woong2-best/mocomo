import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { P2P_STUN_ICE_CONFIG } from "@/lib/peer-call/p2p-ice";

export const runtime = "nodejs";

/** GET /api/webrtc/ice-servers — Google STUN only for DM P2P (session cookie). */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  const limited = await rateLimitPublicApi(req, `webrtc-ice:${session.user.id}`, 120);
  if (limited) return limited;

  return NextResponse.json({
    ...P2P_STUN_ICE_CONFIG,
    turnEnabled: false,
    provider: "none",
  });
}
