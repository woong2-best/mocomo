import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildProxiedFlvPlaybackPath, isSrsConfigured, srsConfigError } from "@/lib/srs";
import { buildProxiedHlsPlaybackPath, probeSrsManifest } from "@/lib/srs-hls-proxy";
import { buildHostPlaybackPayload } from "@/lib/live-host-playback";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { resolveObsStreamKeyForChannel } from "@/lib/user-obs-stream-key";
import { cloudflareStreamConfigError } from "@/lib/cloudflare-stream";
import { buildCloudflarePlaybackFields } from "@/lib/cloudflare-browser-playback";
import { preferredLiveIngestEngine, resolveChannelIngestEngine } from "@/lib/live-ingest";
import { probeLivekitRoomPublish } from "@/lib/livekit-room-status";

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

  try {
    const channel = await db.voiceChannel.findUnique({
      where: { id: channelId },
      select: {
        createdBy: true,
        rtmpIngressId: true,
        rtmpUrl: true,
        broadcastMode: true,
        isLive: true,
        liveStatus: true,
      },
    });
    if (!channel) {
      return NextResponse.json({ error: "방송을 찾을 수 없습니다." }, { status: 404 });
    }

    if (channel.createdBy === session.user.id) {
      const payload = await buildHostPlaybackPayload(channelId, session.user.id);
      return NextResponse.json(payload);
    }

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

    const ingestEngine = channel
      ? resolveChannelIngestEngine(channel)
      : preferredLiveIngestEngine();

    if (ingestEngine === "cloudflare") {
      const cfErr = cloudflareStreamConfigError();
      if (cfErr) {
        return NextResponse.json(
          { error: cfErr, configured: false, ingestEngine: "cloudflare" },
          { status: 503 }
        );
      }

      const cf = await buildCloudflarePlaybackFields(channel);

      return NextResponse.json({
        ok: true,
        ingestEngine: "cloudflare",
        engine: "cloudflare",
        hostUserId: channel.createdBy,
        flvUrl: null,
        ...cf,
      });
    }

    if (ingestEngine === "livekit") {
      const probe = await probeLivekitRoomPublish(channelId, channel.createdBy);
      return NextResponse.json({
        ok: true,
        ingestEngine: "livekit",
        engine: "livekit",
        hlsUrl: null,
        livekitRoom: channelId,
        hostUserId: channel.createdBy,
        srsOnAir: probe.onAir,
        srsPlayable: probe.playable,
        waiting: !probe.playable,
        tryLoad: true,
        message: probe.playable
          ? "방송 중"
          : "방송이 시작되면 화면이 나타납니다.",
      });
    }

    const srsErr = srsConfigError();
    if (srsErr || !isSrsConfigured()) {
      return NextResponse.json(
        {
          error: srsErr ?? "SRS 방송이 설정되지 않았습니다.",
          ingestEngine: "srs",
          configured: false,
        },
        { status: 503 }
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
        message: "방송이 시작되면 화면이 나타납니다.",
      });
    }

    const hlsUrl = buildProxiedHlsPlaybackPath(channelId, streamKey);
    const flvUrl = buildProxiedFlvPlaybackPath(channelId, streamKey);
    const probe = await probeSrsManifest(streamKey);

    return NextResponse.json({
      ok: true,
      ingestEngine: "srs",
      engine: "srs",
      hlsUrl,
      flvUrl,
      streamKeyHint: streamKey.length > 8 ? `…${streamKey.slice(-8)}` : "****",
      srsOnAir: probe.live,
      srsPlayable: probe.playable ?? false,
      waiting: !probe.playable,
      tryLoad: true,
      message: probe.playable
        ? "HLS 재생 가능"
        : probe.live
          ? "RTMP OK · FLV 자동 재생 중"
          : "다중 송출 대상 송출 대기",
      probeError: probe.error,
      probeStatus: probe.status,
    });
  } catch (e) {
    console.error("[playback]", channelId, e);
    return NextResponse.json(
      { error: "재생 정보 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
