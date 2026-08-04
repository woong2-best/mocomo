import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { createLivekitToken, getLivekitUrl, isLivekitConfigured } from "@/lib/livekit";
import { db } from "@/lib/db";
import { rejectIfFirstPartyLiveDisabled } from "@/lib/live-first-party-guard";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = rejectIfFirstPartyLiveDisabled();
  if (blocked) return blocked;

  const limited = await rateLimitPublicApi(req, "mobile-live-token", 30);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!isLivekitConfigured()) {
    return NextResponse.json({ error: "라이브 서버가 설정되지 않았습니다." }, { status: 503 });
  }

  const access = await resolveLiveChannelAccess(id, authResult.user.id);
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.reason, minViewerTier: access.minViewerTier },
      { status: 403 }
    );
  }

  const channelRow = await db.voiceChannel.findUnique({
    where: { id },
    select: { broadcastMode: true },
  });
  const isVoiceLive = channelRow?.broadcastMode === "VOICE";
  const hostObsMode = access.isHost && channelRow?.broadcastMode === "OBS";
  const member = await db.voiceMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: authResult.user.id } },
    select: { role: true },
  });
  const canPublish =
    !isVoiceLive &&
    ((access.isHost && !hostObsMode) || member?.role === "CO_HOST" || !!access.canPublish);
  const voiceHostPublish = isVoiceLive && access.isHost;

  const token = await createLivekitToken(
    id,
    authResult.user.id,
    authResult.user.username,
    { publish: canPublish || voiceHostPublish, audioOnly: isVoiceLive }
  );
  if (!token) {
    return NextResponse.json({ error: "토큰 발급에 실패했습니다." }, { status: 500 });
  }

  const serverUrl = getLivekitUrl();
  if (!serverUrl) {
    return NextResponse.json({ error: "LiveKit URL이 필요합니다." }, { status: 503 });
  }

  return NextResponse.json({
    token,
    serverUrl,
    role: access.isHost ? "host" : "viewer",
    canPublish: canPublish || voiceHostPublish,
    hostUserId: access.hostUserId,
    audioOnly: isVoiceLive,
  });
}
