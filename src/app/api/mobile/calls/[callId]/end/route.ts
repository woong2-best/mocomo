import { NextRequest, NextResponse } from "next/server";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { endVoiceCallForParticipant } from "@/lib/call-sync";

/** POST /api/mobile/calls/[callId]/end — end/decline a call. */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ callId: string }> }
) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const { callId } = await ctx.params;

  const limited = await rateLimitPublicApi(req, `mobile-call-end:${user.id}`, 40);
  if (limited) return limited;

  const result = await endVoiceCallForParticipant(user.id, callId);
  if (!result.ok) {
    const error = result.status === 404 ? "Call not found." : "Permission denied.";
    return NextResponse.json({ error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
