import { db } from "@/lib/db";
import { isLivekitIngestChannel, preferredLiveIngestEngine } from "@/lib/live-ingest";
import { createObsRtmpIngress, deleteObsRtmpIngress } from "@/lib/livekit-ingress";
import { parseRtmpForObs } from "@/lib/obs-rtmp-parse";
import { buildHlsPlaybackUrl, getSrsRtmpUrl, isSrsConfigured, srsConfigError } from "@/lib/srs";
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

export type ProvisionObsResult =
  | { data: ObsRtmpCredentials; warning?: string }
  | { error: string };

type ChannelObsRow = {
  createdBy: string;
  liveStatus: string;
  name: string;
  rtmpIngressId: string | null;
  rtmpUrl: string | null;
  rtmpStreamKey: string | null;
};

function formatForObs(rtmpUrl: string, streamKey: string): Pick<ObsRtmpCredentials, "obsServer" | "obsStreamKey"> {
  const parsed = parseRtmpForObs(rtmpUrl, streamKey);
  if (parsed) {
    return { obsServer: parsed.server, obsStreamKey: parsed.streamKey };
  }
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

function credentialsFromChannel(channel: ChannelObsRow): ObsRtmpCredentials | null {
  const url = channel.rtmpUrl?.trim();
  const key = channel.rtmpStreamKey?.trim();
  if (!url || !key) return null;

  const obs = formatForObs(url, key);
  if (channel.rtmpIngressId?.startsWith("srs:")) {
    return wrapSrsCredentials(key, url);
  }

  return {
    url,
    streamKey: key,
    ingressId: channel.rtmpIngressId?.trim() || "",
    obsServer: obs.obsServer,
    obsStreamKey: obs.obsStreamKey,
    hlsPlaybackUrl: null,
    ingestEngine: isLivekitIngestChannel(channel) ? "livekit" : "srs",
    accountKey: false,
  };
}

export function obsConfigError(): string | null {
  if (isSrsConfigured() || preferredLiveIngestEngine() === "livekit") return null;
  return srsConfigError();
}

async function provisionSrsIngress(
  channelId: string,
  userId: string,
  options?: { force?: boolean }
): Promise<{ data: ObsRtmpCredentials } | { error: string }> {
  const configErr = srsConfigError();
  if (configErr) return { error: configErr };

  const rtmpUrl = getSrsRtmpUrl();
  let streamKey: string;
  try {
    streamKey = await getOrCreateUserObsStreamKey(userId, { rotate: options?.force });
  } catch (e) {
    console.error("[provisionSrsIngress] user key", e);
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
    console.error("[provisionSrsIngress] channel bind", e);
  }

  return { data: wrapSrsCredentials(streamKey, rtmpUrl) };
}

/** OBS RTMP — LiveKit Ingress 우선, 실패 시 SRS VPS, DB에 있으면 재사용 */
export async function provisionObsIngress(
  channelId: string,
  userId: string,
  options?: { force?: boolean }
): Promise<ProvisionObsResult> {
  const engine = preferredLiveIngestEngine();

  let channel: ChannelObsRow | null;

  try {
    channel = await db.voiceChannel.findUnique({
      where: { id: channelId },
      select: {
        createdBy: true,
        liveStatus: true,
        name: true,
        rtmpIngressId: true,
        rtmpUrl: true,
        rtmpStreamKey: true,
      },
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

  if (!options?.force) {
    const cached = credentialsFromChannel(channel);
    if (cached) return { data: cached };
  }

  const host = await db.user.findUnique({
    where: { id: userId },
    select: { username: true, name: true },
  });
  const hostName = host?.name || host?.username || "host";

  if (engine === "livekit") {
    if (options?.force && channel.rtmpIngressId && !channel.rtmpIngressId.startsWith("srs:")) {
      await deleteObsRtmpIngress(channel.rtmpIngressId);
    }

    const lk = await createObsRtmpIngress(channelId, hostName, {
      cleanupFirst: !!options?.force,
    });

    if ("error" in lk) {
      console.warn("[provisionObsIngress] livekit failed, trying SRS", lk.error);
      if (isSrsConfigured()) {
        const srs = await provisionSrsIngress(channelId, userId, options);
        if ("data" in srs) {
          return {
            data: srs.data,
            warning: `LiveKit 연결 실패 — VPS(SRS) 주소로 대체했습니다. (${lk.error})`,
          };
        }
      }
      return { error: lk.error };
    }

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

  return provisionSrsIngress(channelId, userId, options);
}

export async function teardownObsIngress(ingressId: string | null | undefined) {
  const id = ingressId?.trim();
  if (!id || id.startsWith("srs:")) return;
  await deleteObsRtmpIngress(id);
}
