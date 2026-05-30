import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { srsConfigError } from "@/lib/srs";
import { buildProxiedHlsPlaybackPath, probeSrsManifest } from "@/lib/srs-hls-proxy";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { resolveObsStreamKeyForChannel } from "@/lib/user-obs-stream-key";
import { ensureChannelBroadcastActive } from "@/lib/live-channel-active";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 시청자 HLS 재생 URL (HTTPS 프록시) */
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

  await ensureChannelBroadcastActive(channelId);

  const access = await resolveLiveChannelAccess(channelId, session.user.id);
  if (!access.allowed) {
    const status =
      access.reason === "TIER_REQUIRED" ? 403 : access.reason === "NOT_FOUND" ? 404 : 403;
    return NextResponse.json(
      {
        error: "시청 권한이 없습니다.",
        reason: access.reason,
        minViewerTier: access.minViewerTier,
      },
      { status }
    );
  }

  const { streamKey } = await resolveObsStreamKeyForChannel(channelId, {
    viewerUserId: session.user.id,
  });

  if (!streamKey) {
    return NextResponse.json({
      ok: false,
      hlsUrl: null,
      waiting: true,
      message:
        "방송 키를 찾지 못했습니다. 스튜디오 OBS 패널에서 키를 복사해 OBS에 붙인 뒤 「방송 시작」을 눌러 주세요.",
    });
  }

  const hlsUrl = buildProxiedHlsPlaybackPath(channelId, streamKey);
  const probe = await probeSrsManifest(streamKey);

  return NextResponse.json({
    ok: true,
    hlsUrl,
    streamKeyHint: streamKey.length > 8 ? `…${streamKey.slice(-8)}` : "****",
    srsOnAir: probe.live,
    srsPlayable: probe.playable ?? false,
    waiting: !probe.live,
    tryLoad: true,
    message: probe.playable
      ? "방송 신호가 확인되었습니다."
      : probe.live
        ? "송출은 감지됐습니다. HLS 준비 중… 잠시만 기다려 주세요."
        : "OBS에서 방송을 시작하면 화면이 나타납니다. (프록시로 자동 재시도)",
    probeError: probe.error,
    probeStatus: probe.status,
  });
}
