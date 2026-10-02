import { NextRequest, NextResponse } from "next/server";
import { getCachedAuthUserMinimal } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { endVoiceCallForParticipant } from "@/lib/call-sync";

/** POST /api/calls/[callId]/end — cookie session. Used when the tab is actually closed. */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ callId: string }> }
) {
  const user = await getCachedAuthUserMinimal();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.isBanned) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limited = await rateLimitPublicApi(req, `call-end:${user.id}`, 40);
  if (limited) return limited;

  const { callId } = await ctx.params;
  const result = await endVoiceCallForParticipant(user.id, callId);
  if (!result.ok) {
    const error = result.status === 404 ? "통화를 찾을 수 없습니다." : "Permission denied.";
    return NextResponse.json({ error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
