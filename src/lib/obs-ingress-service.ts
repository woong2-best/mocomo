import { db } from "@/lib/db";
import {
  createObsRtmpIngress,
  deleteObsRtmpIngress,
  isLivekitIngressConfigured,
} from "@/lib/livekit-ingress";
import { isLivekitConfigured } from "@/lib/livekit";

export type ObsRtmpCredentials = {
  url: string;
  streamKey: string;
  ingressId: string;
  /** OBS 「서버」칸 */
  obsServer: string;
  /** OBS 「방송 키」칸 */
  obsStreamKey: string;
};

function formatForObs(url: string, streamKey: string): Pick<ObsRtmpCredentials, "obsServer" | "obsStreamKey"> {
  const trimmedUrl = url.trim();
  const trimmedKey = streamKey.trim();
  // LiveKit: url=rtmps://…/live, key=별도. OBS는 서버+키 분리 입력.
  return {
    obsServer: trimmedUrl.replace(/\/$/, ""),
    obsStreamKey: trimmedKey,
  };
}

function wrapCredentials(
  ingressId: string,
  url: string,
  streamKey: string
): ObsRtmpCredentials {
  const obs = formatForObs(url, streamKey);
  return {
    url,
    streamKey,
    ingressId,
    obsServer: obs.obsServer,
    obsStreamKey: obs.obsStreamKey,
  };
}

export function obsConfigError(): string | null {
  if (!isLivekitConfigured()) {
    return "LiveKit이 설정되지 않았습니다. Vercel에 LIVEKIT_API_KEY, LIVEKIT_API_SECRET, NEXT_PUBLIC_LIVEKIT_URL을 넣어 주세요.";
  }
  if (!isLivekitIngressConfigured()) {
    return "LiveKit Ingress URL을 확인할 수 없습니다. NEXT_PUBLIC_LIVEKIT_URL(wss://…)을 설정해 주세요.";
  }
  return null;
}

/** 호스트 라이브 방송용 RTMP URL·스트림 키 발급/재발급 */
export async function provisionObsIngress(
  channelId: string,
  userId: string,
  options?: { force?: boolean }
): Promise<{ data: ObsRtmpCredentials } | { error: string }> {
  const configErr = obsConfigError();
  if (configErr) return { error: configErr };

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

  if (
    !options?.force &&
    channel.rtmpUrl &&
    channel.rtmpStreamKey &&
    channel.rtmpIngressId
  ) {
    return {
      data: wrapCredentials(channel.rtmpIngressId, channel.rtmpUrl, channel.rtmpStreamKey),
    };
  }

  if (options?.force && channel.rtmpIngressId) {
    await deleteObsRtmpIngress(channel.rtmpIngressId);
  }

  const hostName =
    (await db.user.findUnique({ where: { id: userId }, select: { username: true } }))?.username ??
    "host";

  const created = await createObsRtmpIngress(channelId, hostName, {
    cleanupFirst: !!options?.force,
  });
  if ("error" in created) {
    if (/ingress|quota|limit/i.test(created.error)) {
      return {
        error: `${created.error} (LiveKit Ingress 한도 2개 — 예전 방송 키를 LiveKit 대시보드 Ingresses에서 삭제해 보세요.)`,
      };
    }
    return { error: created.error };
  }

  try {
    await db.voiceChannel.update({
      where: { id: channelId },
      data: {
        broadcastMode: "OBS",
        rtmpIngressId: created.ingressId,
        rtmpUrl: created.url,
        rtmpStreamKey: created.streamKey,
      },
    });
  } catch (e) {
    console.error("[provisionObsIngress] save", e);
    return {
      data: wrapCredentials(created.ingressId, created.url, created.streamKey),
    };
  }

  return {
    data: wrapCredentials(created.ingressId, created.url, created.streamKey),
  };
}
