import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildLiveInputHlsUrlAsync,
  getCloudflareWhipPublishUrl,
  liveInputUidFromIngressId,
} from "@/lib/cloudflare-stream";
import { resolveChannelIngestEngine } from "@/lib/live-ingest";
import { obsConfigError, provisionObsIngress } from "@/lib/obs-ingress-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 호스트 — 브라우저 방송용 ingest (Cloudflare WHIP + HLS, OBS 키 미노출) */
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

  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true, liveStatus: true, rtmpIngressId: true, rtmpUrl: true },
  });
  if (!channel || channel.createdBy !== session.user.id) {
    return NextResponse.json({ error: "호스트만 방송 설정을 받을 수 있습니다." }, { status: 403 });
  }
  if (channel.liveStatus === "ENDED") {
    return NextResponse.json({ error: "종료된 방송입니다." }, { status: 400 });
  }

  const configErr = obsConfigError();
  if (configErr) {
    return NextResponse.json({ error: configErr, configured: false }, { status: 503 });
  }

  const prov = await provisionObsIngress(channelId, session.user.id);
  if ("error" in prov) {
    return NextResponse.json({ error: prov.error }, { status: 400 });
  }

  const engine = resolveChannelIngestEngine({
    rtmpIngressId: prov.data.ingressId,
    rtmpUrl: prov.data.url,
    broadcastMode: "BROWSER",
  });

  if (engine === "cloudflare") {
    const cfUid = liveInputUidFromIngressId(prov.data.ingressId);
    const whipPublishUrl = cfUid ? await getCloudflareWhipPublishUrl(cfUid) : null;
    const hlsUrl = cfUid ? await buildLiveInputHlsUrlAsync(cfUid) : null;

    if (!whipPublishUrl) {
      return NextResponse.json(
        {
          error:
            "Cloudflare WHIP URL을 받지 못했습니다. Stream Live Input·API 토큰을 확인하세요.",
          ingestEngine: "cloudflare",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      ingestEngine: "cloudflare",
      whipPublishUrl,
      hlsUrl,
      liveInputUid: cfUid,
      message: "브라우저에서 방송 시작 → Cloudflare CDN으로 송출됩니다.",
    });
  }

  return NextResponse.json({
    ok: true,
    ingestEngine: engine,
    hlsUrl: prov.data.hlsPlaybackUrl,
    message:
      engine === "srs"
        ? "Vultr(SRS)는 브라우저 송출을 지원하지 않습니다. Vercel에 Cloudflare Stream을 설정해 주세요."
        : "이 엔진은 브라우저 송출을 지원하지 않습니다. Cloudflare Stream을 사용해 주세요.",
    configured: false,
  });
}
