import { db } from "@/lib/db";
import {
  buildHlsPlaybackUrl,
  getSrsRtmpUrl,
  mintSrsStreamKey,
  srsConfigError,
} from "@/lib/srs";

export type ObsRtmpCredentials = {
  url: string;
  streamKey: string;
  ingressId: string;
  obsServer: string;
  obsStreamKey: string;
  hlsPlaybackUrl: string;
};

function formatForObs(rtmpUrl: string, streamKey: string): Pick<ObsRtmpCredentials, "obsServer" | "obsStreamKey"> {
  return {
    obsServer: rtmpUrl.trim().replace(/\/$/, ""),
    obsStreamKey: streamKey.trim(),
  };
}

function wrapCredentials(streamKey: string, rtmpUrl: string): ObsRtmpCredentials {
  const obs = formatForObs(rtmpUrl, streamKey);
  return {
    url: rtmpUrl,
    streamKey,
    ingressId: `srs:${streamKey}`,
    obsServer: obs.obsServer,
    obsStreamKey: obs.obsStreamKey,
    hlsPlaybackUrl: buildHlsPlaybackUrl(streamKey),
  };
}

export function obsConfigError(): string | null {
  return srsConfigError();
}

/** 호스트 라이브 방송용 SRS RTMP URL·스트림 키 발급/재발급 */
export async function provisionObsIngress(
  channelId: string,
  userId: string,
  options?: { force?: boolean }
): Promise<{ data: ObsRtmpCredentials } | { error: string }> {
  const configErr = obsConfigError();
  if (configErr) return { error: configErr };

  const rtmpUrl = getSrsRtmpUrl();

  let channel: {
    createdBy: string;
    isLive: boolean;
    rtmpIngressId: string | null;
    rtmpUrl: string | null;
    rtmpStreamKey: string | null;
  } | null;

  try {
    channel = await db.voiceChannel.findUnique({
      where: { id: channelId },
      select: {
        createdBy: true,
        isLive: true,
        rtmpIngressId: true,
        rtmpUrl: true,
        rtmpStreamKey: true,
      },
    });
  } catch (e) {
    console.error("[provisionObsIngress] db", e);
    const msg = e instanceof Error ? e.message : "";
    if (/rtmpUrl|rtmpStreamKey|broadcastMode|column/i.test(msg)) {
      return {
        error:
          "OBS DB 컬럼이 없습니다. Supabase SQL Editor에서 supabase-fix-all.sql U) OBS 섹션을 실행해 주세요.",
      };
    }
    return { error: "방송 정보를 불러오지 못했습니다." };
  }

  if (!channel || channel.createdBy !== userId) {
    return { error: "호스트만 OBS 설정을 받을 수 있습니다." };
  }
  if (!channel.isLive) {
    return { error: "라이브 방송 중에만 OBS 키를 발급할 수 있습니다." };
  }

  if (!options?.force && channel.rtmpUrl && channel.rtmpStreamKey) {
    return {
      data: wrapCredentials(channel.rtmpStreamKey, channel.rtmpUrl),
    };
  }

  const streamKey = mintSrsStreamKey(channelId);

  try {
    await db.voiceChannel.update({
      where: { id: channelId },
      data: {
        broadcastMode: "OBS",
        rtmpIngressId: `srs:${streamKey}`,
        rtmpUrl,
        rtmpStreamKey: streamKey,
      },
    });
  } catch (e) {
    console.error("[provisionObsIngress] save", e);
    return { data: wrapCredentials(streamKey, rtmpUrl) };
  }

  return { data: wrapCredentials(streamKey, rtmpUrl) };
}
