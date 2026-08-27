import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { resolveIceServersForCall, isTurnConfigured } from "@/lib/webrtc-turn/resolve-ice-servers";
import { normalizeTurnProvider } from "@/lib/webrtc-turn/stun";

export const runtime = "nodejs";

/** GET /api/webrtc/ice-servers — STUN + TURN for DM P2P (session cookie). */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const limited = await rateLimitPublicApi(req, `webrtc-ice:${session.user.id}`, 120);
  if (limited) return limited;

  const config = await resolveIceServersForCall(session.user.id);
  const provider = normalizeTurnProvider(process.env.TURN_PROVIDER);

  return NextResponse.json({
    ...config,
    turnEnabled: isTurnConfigured(),
    provider,
  });
}
