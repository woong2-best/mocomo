import { db } from "@/lib/db";
import { buildHlsPlaybackUrl, getSrsRtmpUrl, srsConfigError } from "@/lib/srs";
import { getOrCreateUserObsStreamKey } from "@/lib/user-obs-stream-key";

export type ObsRtmpCredentials = {
  url: string;
  streamKey: string;
  ingressId: string;
  obsServer: string;
  obsStreamKey: string;
  hlsPlaybackUrl: string;
  /** 계정 고정 키 여부 */
  accountKey: boolean;
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
    accountKey: true,
  };
}

export function obsConfigError(): string | null {
  return srsConfigError();
}

/** 호스트 계정 고유 OBS 키 — 현재 라이브 방송에 연결 */
export async function provisionObsIngress(
  channelId: string,
  userId: string,
  options?: { force?: boolean }
): Promise<{ data: ObsRtmpCredentials } | { error: string }> {
  const configErr = obsConfigError();
  if (configErr) return { error: configErr };

  const rtmpUrl = getSrsRtmpUrl();

  let channel: { createdBy: string; isLive: boolean } | null;

  try {
    channel = await db.voiceChannel.findUnique({
      where: { id: channelId },
      select: { createdBy: true, isLive: true },
    });
  } catch (e) {
    console.error("[provisionObsIngress] db", e);
    const msg = e instanceof Error ? e.message : "";
    if (/rtmpUrl|rtmpStreamKey|obsRtmpStreamKey|broadcastMode|column/i.test(msg)) {
      return {
        error:
          "OBS DB 컬럼이 없습니다. Supabase SQL Editor에서 supabase-fix-all.sql을 실행해 주세요.",
      };
    }
    return { error: "방송 정보를 불러오지 못했습니다." };
  }

  if (!channel || channel.createdBy !== userId) {
    return { error: "호스트만 OBS 설정을 받을 수 있습니다." };
  }
  if (!channel.isLive) {
    return { error: "라이브 방송 중에만 OBS 키를 확인할 수 있습니다." };
  }

  let streamKey: string;
  try {
    streamKey = await getOrCreateUserObsStreamKey(userId, { rotate: options?.force });
  } catch (e) {
    console.error("[provisionObsIngress] user key", e);
    return { error: "계정 방송 키를 만들지 못했습니다." };
  }

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
    console.error("[provisionObsIngress] channel bind", e);
  }

  return { data: wrapCredentials(streamKey, rtmpUrl) };
}
