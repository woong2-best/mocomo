import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isLivekitIngestChannel, preferredLiveIngestEngine } from "@/lib/live-ingest";
import { probeLivekitObsPublish } from "@/lib/livekit-room-status";
import { probeSrsManifest, buildProxiedHlsPlaybackPath, upstreamHlsManifestUrl } from "@/lib/srs-hls-proxy";
import { getSrsHlsBaseUrl } from "@/lib/srs";
import { resolveObsStreamKeyForChannel } from "@/lib/user-obs-stream-key";
import { obsConfigError } from "@/lib/obs-ingress-service";

/** 호스트 — 송출 신호 확인 (LiveKit / SRS) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { channelId } = await params;
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true, isLive: true, rtmpIngressId: true, rtmpStreamKey: true },
  });

  if (!channel) {
    return NextResponse.json({ error: "방송을 찾을 수 없습니다." }, { status: 404 });
  }
  if (channel.createdBy !== session.user.id) {
    return NextResponse.json({ error: "호스트만 확인할 수 있습니다." }, { status: 403 });
  }

  const configErr = obsConfigError();
  if (configErr) {
    return NextResponse.json({ ok: false, configured: false, error: configErr });
  }

  if (isLivekitIngestChannel(channel) && preferredLiveIngestEngine() === "livekit") {
    const probe = await probeLivekitObsPublish(channelId);
    const keyTail = channel.rtmpStreamKey?.length
      ? `…${channel.rtmpStreamKey.slice(-8)}`
      : "****";

    return NextResponse.json({
      ok: true,
      ingestEngine: "livekit",
      hasStreamKey: !!channel.rtmpStreamKey,
      onAir: probe.onAir,
      playable: probe.playable,
      streamKeyHint: keyTail,
      message: probe.playable
        ? "LiveKit 방송 연결됨. 미리보기 재생 중."
        : probe.onAir
          ? "OBS 신호 감지. 영상 준비 중…"
          : "OBS에서 「방송 시작」을 누르세요. (메인 OBS 방송 버튼)",
      note: "LiveKit Cloud 사용 — VPS RTMP(45.32.16.32)가 아닌, 위에 표시된 LiveKit 서버/키를 OBS에 넣으세요.",
    });
  }

  const { streamKey } = await resolveObsStreamKeyForChannel(channelId, {
    viewerUserId: session.user.id,
  });

  if (!streamKey) {
    return NextResponse.json({
      ok: true,
      hasStreamKey: false,
      onAir: false,
      ingestEngine: "srs",
      message: "방송 키를 불러오지 못했습니다. 설정에서 키를 다시 받으세요.",
    });
  }

  const probe = await probeSrsManifest(streamKey);
  const keyTail = streamKey.length > 8 ? `…${streamKey.slice(-8)}` : "****";

  return NextResponse.json({
    ok: true,
    ingestEngine: "srs",
    hasStreamKey: true,
    onAir: probe.live,
    playable: probe.playable ?? false,
    rtmpPublish: probe.rtmpPublish ?? false,
    streamKeyHint: keyTail,
    upstreamManifest: upstreamHlsManifestUrl(streamKey),
    sitePlayback: buildProxiedHlsPlaybackPath(channelId, streamKey),
    hlsBase: getSrsHlsBaseUrl(),
    probeStatus: probe.status,
    probeError: probe.error,
    message: probe.playable
      ? "방송 신호 확인. 미리보기 재생 중."
      : probe.live
        ? "RTMP OK · HLS 준비 중 (안 되면 FLV 자동 시도)"
        : "다중 송출 대상에 MoCoMo 서버·키가 맞는지 확인하세요. (메인 방송 시작 없이도 됨)",
  });
}
