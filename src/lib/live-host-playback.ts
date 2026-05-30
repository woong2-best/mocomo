import { db } from "@/lib/db";
import { isLivekitIngestChannel, preferredLiveIngestEngine } from "@/lib/live-ingest";
import { probeLivekitObsPublish } from "@/lib/livekit-room-status";
import { buildProxiedHlsPlaybackPath, probeSrsManifest } from "@/lib/srs-hls-proxy";
import { resolveObsStreamKeyForChannel } from "@/lib/user-obs-stream-key";

/** 호스트 스튜디오 재생 — 채널/설정에 맞는 엔진 (기본 VPS HLS) */
export async function buildHostPlaybackPayload(channelId: string, hostUserId: string) {
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { rtmpIngressId: true, rtmpStreamKey: true },
  });

  const engine =
    channel && isLivekitIngestChannel(channel) ? "livekit" : preferredLiveIngestEngine();

  if (engine === "livekit") {
    const probe = await probeLivekitObsPublish(channelId);
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
          ? "OBS 신호 감지. 영상 준비 중…"
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
  const probe = await probeSrsManifest(streamKey);

  return {
    ok: true as const,
    ingestEngine: "srs" as const,
    engine: "srs" as const,
    hlsUrl,
    streamKeyHint: streamKey.length > 8 ? `…${streamKey.slice(-8)}` : "****",
    srsOnAir: probe.live,
    srsPlayable: probe.playable ?? false,
    waiting: !probe.playable,
    tryLoad: true,
    message: probe.playable
      ? "VPS 방송 신호 확인. 미리보기 재생 중."
      : probe.live
        ? "VPS 송출 감지. HLS 준비 중…"
        : "OBS에서 「방송 시작」을 누르면 화면이 나타납니다.",
    probeError: probe.error,
    probeStatus: probe.status,
    note: "Vultr VPS — 서버 rtmp://45.32.16.32:1935/live · 다중 송출 플러그인 끄고 메인 「방송 시작」",
  };
}
