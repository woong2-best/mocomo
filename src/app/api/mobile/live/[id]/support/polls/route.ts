import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { getOpenLiveSupportPoll } from "@/lib/live-support/rest-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-live-polls-get", 60);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const { id: channelId } = await params;
  const access = await resolveLiveChannelAccess(channelId, authResult.user.id);
  if (!access.allowed) {
    return NextResponse.json({ error: "NOT_MEMBER" }, { status: 403 });
  }

  const poll = await getOpenLiveSupportPoll(channelId);
  return NextResponse.json({ ok: true, poll });
}
