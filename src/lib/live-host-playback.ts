import { db } from "@/lib/db";
import { isLivekitIngressConfigured } from "@/lib/livekit-ingress";
import { probeLivekitObsPublish } from "@/lib/livekit-room-status";
import { buildProxiedHlsPlaybackPath, probeSrsManifest } from "@/lib/srs-hls-proxy";
import { resolveObsStreamKeyForChannel } from "@/lib/user-obs-stream-key";

/** 호스트 스튜디오 재생 — LiveKit(WebRTC) 우선 */
export async function buildHostPlaybackPayload(channelId: string, hostUserId: string) {
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { rtmpIngressId: true, rtmpStreamKey: true },
  });

  if (isLivekitIngressConfigured()) {
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
          ? "OBS 신호 감지. 영상 트랙 준비 중…"
          : "OBS에서 「방송 시작」을 누르면 3~10초 안에 화면이 나타납니다.",
      note: "LiveKit 사용 중 — OBS에는 스튜디오에 표시된 LiveKit 서버/키를 넣으세요 (45.32.16.32 아님).",
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
      ? "방송 신호가 확인되었습니다."
      : probe.live
        ? "송출은 감지됐습니다. HLS 준비 중…"
        : "OBS에서 「방송 시작」을 누르면 화면이 나타납니다.",
    probeError: probe.error,
    probeStatus: probe.status,
    note: "VPS(SRS) 모드 — OBS 「설정→방송→사용자 지정」만 사용하세요. 다중 송출 플러그인은 끄세요.",
  };
}
