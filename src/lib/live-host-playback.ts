import { db } from "@/lib/db";
import { buildCloudflarePlaybackFields } from "@/lib/cloudflare-browser-playback";
import { resolveChannelIngestEngine } from "@/lib/live-ingest";
import { probeLivekitRoomPublish } from "@/lib/livekit-room-status";
import { buildProxiedFlvPlaybackPath } from "@/lib/srs";
import { buildProxiedHlsPlaybackPath, probeSrsManifest } from "@/lib/srs-hls-proxy";
import { resolveObsStreamKeyForChannel } from "@/lib/user-obs-stream-key";

/** 호스트 스튜디오 재생 */
export async function buildHostPlaybackPayload(channelId: string, hostUserId: string) {
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: {
      rtmpIngressId: true,
      rtmpUrl: true,
      rtmpStreamKey: true,
      broadcastMode: true,
      isLive: true,
    },
  });

  const engine = channel ? resolveChannelIngestEngine(channel) : resolveChannelIngestEngine({});

  if (engine === "cloudflare") {
    const cf = await buildCloudflarePlaybackFields(channel ?? {});

    return {
      ok: true as const,
      ingestEngine: "cloudflare" as const,
      engine: "cloudflare" as const,
      ...cf,
      flvUrl: null,
      streamKeyHint: channel?.rtmpStreamKey?.length
        ? `…${channel.rtmpStreamKey.slice(-8)}`
        : "****",
      note:
        channel?.broadcastMode === "BROWSER"
          ? "브라우저 WHIP 송출 · 시청 WHEP (HLS와 병행 불가)"
          : "Cloudflare Stream Live — OBS 서버는 live.cloudflare.com",
    };
  }

  if (engine === "livekit") {
    const probe = await probeLivekitRoomPublish(channelId, hostUserId);
    return {
      ok: true as const,
      ingestEngine: "livekit" as const,
      engine: "livekit" as const,
      hlsUrl: null,
      livekitRoom: channelId,
      streamKeyHint: channel?.rtmpStreamKey?.length
        ? `…${channel.rtmpStreamKey.slice(-8)}`
        : "****",
      srsOnAir: probe.onAir,
      srsPlayable: probe.playable,
      waiting: !probe.playable,
      tryLoad: true,
      message: probe.playable
        ? "LiveKit 방송이 연결되었습니다."
        : probe.onAir
          ? "영상 준비 중…"
          : "OBS에서 「방송 시작」을 누르면 화면이 나타납니다.",
    };
  }

  const { streamKey } = await resolveObsStreamKeyForChannel(channelId, {
    viewerUserId: hostUserId,
  });

  if (!streamKey) {
    return {
      ok: false as const,
      ingestEngine: "srs" as const,
      engine: "srs" as const,
      hlsUrl: null,
      waiting: true,
      tryLoad: false,
      message: "방송 키를 불러오지 못했습니다. OBS 키를 다시 받으세요.",
    };
  }

  const hlsUrl = buildProxiedHlsPlaybackPath(channelId, streamKey);
  const flvUrl = buildProxiedFlvPlaybackPath(channelId, streamKey);
  const probe = await probeSrsManifest(streamKey);

  return {
    ok: true as const,
    ingestEngine: "srs" as const,
    engine: "srs" as const,
    hlsUrl,
    flvUrl,
    streamKeyHint: streamKey.length > 8 ? `…${streamKey.slice(-8)}` : "****",
    srsOnAir: probe.live,
    srsPlayable: probe.playable ?? false,
    waiting: !probe.playable,
    tryLoad: true,
    message: probe.playable
      ? "VPS 방송 신호 확인. 미리보기 재생 중."
      : probe.live
        ? "VPS 송출 감지. FLV 미리보기 연결 중…"
        : "다중 송출이 MoCoMo 서버·키로 나가면 화면이 나타납니다.",
    probeError: probe.error,
    probeStatus: probe.status,
    note: "Vultr VPS — 다중 송출 「새 대상」에 아래와 동일한 서버·키 입력",
  };
}
