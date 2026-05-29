import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { srsConfigError } from "@/lib/srs";
import { buildProxiedHlsPlaybackPath, probeSrsManifest } from "@/lib/srs-hls-proxy";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";

/** 시청자 HLS 재생 URL (접근 권한 검사 후 m3u8 주소 반환) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { channelId } = await params;
  if (!channelId || channelId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const configErr = srsConfigError();
  if (configErr) {
    return NextResponse.json({ error: configErr, configured: false }, { status: 503 });
  }

  const access = await resolveLiveChannelAccess(channelId, session.user.id);
  if (!access.allowed) {
    const status =
      access.reason === "TIER_REQUIRED" ? 403 : access.reason === "NOT_FOUND" ? 404 : 403;
    return NextResponse.json(
      { error: "시청 권한이 없습니다.", reason: access.reason, minViewerTier: access.minViewerTier },
      { status }
    );
  }

  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { isLive: true, rtmpStreamKey: true, liveStatus: true },
  });

  if (!channel?.isLive) {
    return NextResponse.json({ error: "방송이 종료되었습니다." }, { status: 404 });
  }

  if (!channel.rtmpStreamKey) {
    return NextResponse.json({
      hlsUrl: null,
      waiting: true,
      message: "OBS에서 키를 발급한 뒤 방송을 시작해 주세요.",
    });
  }

  const probe = await probeSrsManifest(channel.rtmpStreamKey);
  const hlsUrl = buildProxiedHlsPlaybackPath(channelId);

  if (!probe.live) {
    return NextResponse.json({
      ok: true,
      hlsUrl,
      waiting: true,
      message:
        "OBS에서 방송을 시작하면 3~10초 뒤 화면이 나타납니다. 키가 맞는지·방송 시작 여부를 확인해 주세요.",
      probeError: probe.error,
      probeStatus: probe.status,
    });
  }

  return NextResponse.json({
    ok: true,
    hlsUrl,
    waiting: false,
    proxied: true,
  });
}
