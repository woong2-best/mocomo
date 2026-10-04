import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { endHostBroadcastChannel } from "@/lib/live-broadcast/session-manager";
import { getVideoDonationRoomState } from "@/lib/moco-donation/room-api";

const PENDING_WARNING =
  "There are pending video donations in the queue. Are you sure you want to end the stream?";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-live-end", 20);
  if (limited) return limited;
  const authResult = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in authResult) return authResult.error;

  const { id: channelId } = await params;
  let body: { confirmPending?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const state = await getVideoDonationRoomState(channelId, authResult.user.id);
  if (!state?.isHost) {
    return NextResponse.json({ error: "Only the host can end the stream." }, { status: 403 });
  }
  if (state.pendingCount > 0 && body.confirmPending !== true) {
    return NextResponse.json(
      { error: PENDING_WARNING, code: "PENDING_VIDEO_DONATIONS", pendingCount: state.pendingCount, message: PENDING_WARNING },
      { status: 409 }
    );
  }

  const ended = await endHostBroadcastChannel(channelId, authResult.user.id);
  if (!ended) return NextResponse.json({ error: "Could not end the stream." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
