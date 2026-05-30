import { db } from "@/lib/db";
import { isLivekitIngestChannel } from "@/lib/live-ingest";
import { probeLivekitObsPublish } from "@/lib/livekit-room-status";
import { buildProxiedHlsPlaybackPath, probeSrsManifest } from "@/lib/srs-hls-proxy";
import { getOrCreateUserObsStreamKey } from "@/lib/user-obs-stream-key";

/** 호스트 스튜디오 재생 정보 */
export async function buildHostPlaybackPayload(channelId: string, hostUserId: string) {
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { rtmpIngressId: true, rtmpStreamKey: true },
  });

  if (channel && isLivekitIngestChannel(channel)) {
    const probe = await probeLivekitObsPublish(channelId);
    return {
      ok: true as const,
      ingestEngine: "livekit" as const,
      engine: "livekit" as const,
      hlsUrl: null,
      livekitRoom: channelId,
      streamKeyHint: channel.rtmpStreamKey?.length
        ? `…${channel.rtmpStreamKey.slice(-8)}`
        : "****",
      srsOnAir: probe.onAir,
      srsPlayable: probe.playable,
      waiting: !probe.playable,
      tryLoad: true,
      message: probe.playable
        ? "LiveKit 방송이 연결되었습니다."
        : probe.onAir
          ? "OBS 신호 감지. 영상 트랙 준비 중…"
          : "OBS에서 「방송 시작」을 누르면 화면이 나타납니다.",
    };
  }

  const streamKey = await getOrCreateUserObsStreamKey(hostUserId);
  const hlsUrl = buildProxiedHlsPlaybackPath(channelId, streamKey);

  try {
    await db.voiceChannel.update({
      where: { id: channelId },
      data: { rtmpStreamKey: streamKey, broadcastMode: "OBS" },
    });
  } catch {
    /* ignore */
  }

  const probe = await probeSrsManifest(streamKey);

  return {
    ok: true as const,
    ingestEngine: "srs" as const,
    engine: "srs" as const,
    hlsUrl,
    streamKeyHint: streamKey.length > 8 ? `…${streamKey.slice(-8)}` : "****",
    srsOnAir: probe.live,
    srsPlayable: probe.playable ?? false,
    waiting: !probe.live,
    tryLoad: true,
    message: probe.playable
      ? "방송 신호가 확인되었습니다."
      : probe.live
        ? "송출은 감지됐습니다. HLS 준비 중…"
        : "OBS에서 「방송 시작」을 누르면 화면이 나타납니다.",
    probeError: probe.error,
    probeStatus: probe.status,
  };
}
