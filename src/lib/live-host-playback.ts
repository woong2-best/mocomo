import { db } from "@/lib/db";
import { ensureChannelBroadcastActive } from "@/lib/live-channel-active";
import { buildProxiedHlsPlaybackPath, probeSrsManifest } from "@/lib/srs-hls-proxy";
import { getOrCreateUserObsStreamKey } from "@/lib/user-obs-stream-key";

/** 호스트 스튜디오 — 권한 오류 없이 HLS URL 반환 */
export async function buildHostPlaybackPayload(channelId: string, hostUserId: string) {
  await ensureChannelBroadcastActive(channelId);

  const streamKey = await getOrCreateUserObsStreamKey(hostUserId);
  const hlsUrl = buildProxiedHlsPlaybackPath(channelId, streamKey);

  try {
    await db.voiceChannel.update({
      where: { id: channelId },
      data: { rtmpStreamKey: streamKey, broadcastMode: "OBS" },
    });
  } catch {
    /* 컬럼 미적용 시에도 재생 URL은 반환 */
  }

  const probe = await probeSrsManifest(streamKey);

  return {
    ok: true as const,
    hlsUrl,
    streamKeyHint: streamKey.length > 8 ? `…${streamKey.slice(-8)}` : "****",
    srsOnAir: probe.live,
    srsPlayable: probe.playable ?? false,
    waiting: !probe.live,
    tryLoad: true,
    message: probe.playable
      ? "방송 신호가 확인되었습니다."
      : probe.live
        ? "송출은 감지됐습니다. HLS 준비 중… OBS 방송을 유지해 주세요."
        : "OBS에서 「방송 시작」을 누르면 화면이 나타납니다.",
    probeError: probe.error,
    probeStatus: probe.status,
  };
}
