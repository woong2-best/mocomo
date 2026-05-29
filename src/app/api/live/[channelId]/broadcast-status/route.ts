import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { probeSrsManifest, buildProxiedHlsPlaybackPath, upstreamHlsManifestUrl } from "@/lib/srs-hls-proxy";
import { srsConfigError, getSrsHlsBaseUrl } from "@/lib/srs";
import { resolveObsStreamKeyForChannel } from "@/lib/user-obs-stream-key";

/** 호스트 — SRS에 실제 송출이 올라왔는지 확인 */
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
    select: { createdBy: true, isLive: true },
  });

  if (!channel) {
    return NextResponse.json({ error: "방송을 찾을 수 없습니다." }, { status: 404 });
  }
  if (channel.createdBy !== session.user.id) {
    return NextResponse.json({ error: "호스트만 확인할 수 있습니다." }, { status: 403 });
  }

  const configErr = srsConfigError();
  if (configErr) {
    return NextResponse.json({ ok: false, configured: false, error: configErr });
  }

  const { streamKey } = await resolveObsStreamKeyForChannel(channelId);

  if (!streamKey) {
    return NextResponse.json({
      ok: true,
      hasStreamKey: false,
      onAir: false,
      accountKey: true,
      message: "계정 방송 키를 불러오지 못했습니다. OBS 패널을 열어 키를 확인하세요.",
    });
  }

  const probe = await probeSrsManifest(streamKey);
  const keyTail = streamKey.length > 8 ? `…${streamKey.slice(-8)}` : "****";

  return NextResponse.json({
    ok: true,
    hasStreamKey: true,
    onAir: probe.live,
    accountKey: true,
    streamKeyHint: keyTail,
    hlsPathExample: `/live/${streamKey}.m3u8`,
    upstreamManifest: upstreamHlsManifestUrl(streamKey),
    sitePlayback: buildProxiedHlsPlaybackPath(channelId),
    hlsBase: getSrsHlsBaseUrl(),
    probeStatus: probe.status,
    probeError: probe.error,
    message: probe.live
      ? "SRS에 방송 신호가 올라왔습니다. 미리보기에 곧 표시됩니다."
      : "OBS에서 「방송 시작」 상태인데 SRS에 신호가 없습니다. 서버·방송 키를 다시 붙여넣고 방송을 재시작하세요.",
    note: "브라우저에서 http://IP:8080/live/ 만 열면 Not Found가 정상입니다. 방송 중일 때 /live/방송키.m3u8 주소로 확인하세요.",
  });
}
