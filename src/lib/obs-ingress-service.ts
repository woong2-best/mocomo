import { db } from "@/lib/db";
import { preferredLiveIngestEngine } from "@/lib/live-ingest";
import { createObsRtmpIngress, deleteObsRtmpIngress } from "@/lib/livekit-ingress";
import { buildHlsPlaybackUrl, getSrsRtmpUrl, srsConfigError } from "@/lib/srs";
import { getOrCreateUserObsStreamKey } from "@/lib/user-obs-stream-key";

export type ObsRtmpCredentials = {
  url: string;
  streamKey: string;
  ingressId: string;
  obsServer: string;
  obsStreamKey: string;
  hlsPlaybackUrl: string | null;
  ingestEngine: "livekit" | "srs";
  accountKey: boolean;
};

function formatForObs(rtmpUrl: string, streamKey: string): Pick<ObsRtmpCredentials, "obsServer" | "obsStreamKey"> {
  return {
    obsServer: rtmpUrl.trim().replace(/\/$/, ""),
    obsStreamKey: streamKey.trim(),
  };
}

function wrapSrsCredentials(streamKey: string, rtmpUrl: string): ObsRtmpCredentials {
  const obs = formatForObs(rtmpUrl, streamKey);
  return {
    url: rtmpUrl,
    streamKey,
    ingressId: `srs:${streamKey}`,
    obsServer: obs.obsServer,
    obsStreamKey: obs.obsStreamKey,
    hlsPlaybackUrl: buildHlsPlaybackUrl(streamKey),
    ingestEngine: "srs",
    accountKey: true,
  };
}

export function obsConfigError(): string | null {
  const engine = preferredLiveIngestEngine();
  if (engine === "livekit") return null;
  return srsConfigError();
}

/** OBS RTMP — LiveKit Ingress 우선, 없으면 SRS VPS */
export async function provisionObsIngress(
  channelId: string,
  userId: string,
  options?: { force?: boolean }
): Promise<{ data: ObsRtmpCredentials } | { error: string }> {
  const engine = preferredLiveIngestEngine();

  let channel: { createdBy: string; liveStatus: string; name: string; rtmpIngressId: string | null } | null;

  try {
    channel = await db.voiceChannel.findUnique({
      where: { id: channelId },
      select: { createdBy: true, liveStatus: true, name: true, rtmpIngressId: true },
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
  if (channel.liveStatus === "ENDED") {
    return { error: "종료된 방송입니다. 새 방송을 만들어 주세요." };
  }

  const host = await db.user.findUnique({
    where: { id: userId },
    select: { username: true, name: true },
  });
  const hostName = host?.name || host?.username || "host";

  if (engine === "livekit") {
    if (options?.force && channel.rtmpIngressId) {
      await deleteObsRtmpIngress(channel.rtmpIngressId);
    }

    const lk = await createObsRtmpIngress(channelId, hostName, {
      cleanupFirst: !!options?.force,
    });
    if ("error" in lk) return { error: lk.error };

    const obs = formatForObs(lk.url, lk.streamKey);
    try {
      await db.voiceChannel.update({
        where: { id: channelId },
        data: {
          broadcastMode: "OBS",
          rtmpIngressId: lk.ingressId,
          rtmpUrl: lk.url,
          rtmpStreamKey: lk.streamKey,
        },
      });
    } catch (e) {
      console.error("[provisionObsIngress] livekit channel bind", e);
    }

    return {
      data: {
        url: lk.url,
        streamKey: lk.streamKey,
        ingressId: lk.ingressId,
        obsServer: obs.obsServer,
        obsStreamKey: obs.obsStreamKey,
        hlsPlaybackUrl: null,
        ingestEngine: "livekit",
        accountKey: false,
      },
    };
  }

  const configErr = srsConfigError();
  if (configErr) return { error: configErr };

  const rtmpUrl = getSrsRtmpUrl();
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
    console.error("[provisionObsIngress] srs channel bind", e);
  }

  return { data: wrapSrsCredentials(streamKey, rtmpUrl) };
}

export async function teardownObsIngress(ingressId: string | null | undefined) {
  const id = ingressId?.trim();
  if (!id || id.startsWith("srs:")) return;
  await deleteObsRtmpIngress(id);
}
