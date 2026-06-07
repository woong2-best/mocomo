import {
  buildCloudflareWhepPlaybackUrl,
  buildLiveInputHlsUrlAsync,
  getCloudflareWhepPlaybackUrl,
  liveInputUidFromIngressId,
  probeCloudflareLiveInput,
} from "@/lib/cloudflare-stream";

type ChannelSlice = {
  rtmpIngressId?: string | null;
  broadcastMode?: string | null;
  isLive?: boolean;
  liveStatus?: string | null;
};

/** Cloudflare — 브라우저 WHIP은 WHEP, OBS/RTMP는 HLS lifecycle */
export async function buildCloudflarePlaybackFields(channel: ChannelSlice) {
  const cfUid = liveInputUidFromIngressId(channel.rtmpIngressId);
  const browser = channel.broadcastMode !== "OBS";
  const hostLive = !!channel.isLive && channel.liveStatus !== "ENDED";

  if (browser && hostLive && cfUid) {
    const whepPlaybackUrl =
      buildCloudflareWhepPlaybackUrl(cfUid) ?? (await getCloudflareWhepPlaybackUrl(cfUid));
    const playable = !!whepPlaybackUrl;
    return {
      useWhep: true as const,
      whepPlaybackUrl,
      hlsUrl: null as string | null,
      cloudflareLive: true,
      cloudflarePlayable: playable,
      hostBroadcasting: true,
      srsOnAir: true,
      srsPlayable: playable,
      waiting: !playable,
      tryLoad: playable,
      message: playable
        ? "브라우저 실시간 방송 연결됨."
        : "실시간 재생 URL 준비 중… 잠시만 기다려 주세요.",
      probeError: undefined as string | undefined,
    };
  }

  const probe = cfUid
    ? await probeCloudflareLiveInput(cfUid)
    : { onAir: false, playable: false, hlsUrl: null, videoUid: null, error: undefined as string | undefined };
  const hlsUrl = cfUid ? await buildLiveInputHlsUrlAsync(cfUid) : null;

  return {
    useWhep: false as const,
    whepPlaybackUrl: null as string | null,
    hlsUrl: probe.playable ? probe.hlsUrl ?? hlsUrl : hlsUrl,
    cloudflareLive: probe.onAir || (browser && hostLive),
    cloudflarePlayable: probe.playable,
    hostBroadcasting: browser && hostLive,
    srsOnAir: probe.onAir || (browser && hostLive),
    srsPlayable: probe.playable,
    waiting: !probe.playable && !(browser && hostLive),
    tryLoad: true,
    message: probe.playable
      ? "Cloudflare 방송 연결됨."
      : probe.onAir
        ? "송출 감지 · HLS 준비 중 (5~15초)…"
        : browser
          ? "「방송 시작」을 누르고 카메라·마이크를 허용해 주세요."
          : "방송이 시작되면 화면이 나타납니다.",
    probeError: probe.error,
  };
}
