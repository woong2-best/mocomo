import { db } from "@/lib/db";
import {
  createCloudflareLiveInput,
  deleteCloudflareLiveInput,
  getCloudflareLiveInput,
  buildLiveInputHlsUrlAsync,
  ensureStreamCustomerHost,
  cloudflareStreamConfigError,
  liveInputUidFromIngressId,
} from "@/lib/cloudflare-stream";
import {
  isLivekitIngestChannel,
  preferredLiveIngestEngine,
  type LiveIngestEngine,
} from "@/lib/live-ingest";
import {
  createObsRtmpIngress,
  deleteObsRtmpIngress,
  cleanupStaleProjectIngresses,
  isLivekitIngressConfigured,
} from "@/lib/livekit-ingress";
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
  ingestEngine: "cloudflare" | "livekit" | "srs";
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

function wrapCloudflareCredentials(
  input: { uid: string; rtmpsUrl: string; rtmpsStreamKey: string }
): ObsRtmpCredentials {
  const obs = formatForObs(input.rtmpsUrl, input.rtmpsStreamKey);
  return {
    url: input.rtmpsUrl,
    streamKey: input.rtmpsStreamKey,
    ingressId: `cf:${input.uid}`,
    obsServer: obs.obsServer,
    obsStreamKey: obs.obsStreamKey,
    hlsPlaybackUrl: null,
    ingestEngine: "cloudflare",
    accountKey: false,
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

  const cfUid = liveInputUidFromIngressId(channel.rtmpIngressId);
  if (cfUid) {
    return wrapCloudflareCredentials({
      uid: cfUid,
      rtmpsUrl: url,
      rtmpsStreamKey: key,
    });
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
  const engine = preferredLiveIngestEngine();
  if (engine === "cloudflare") return cloudflareStreamConfigError();
  if (engine === "livekit") {
    return isLivekitIngressConfigured()
      ? null
      : "LiveKit Ingress가 설정되지 않았습니다. LIVEKIT_* 환경 변수를 확인하세요.";
  }
  return srsConfigError();
}

async function provisionCloudflareStreamIngress(
  channelId: string,
  channel: ChannelObsRow,
  options?: { force?: boolean }
): Promise<ProvisionObsResult> {
  const configErr = cloudflareStreamConfigError();
  if (configErr) return { error: configErr };

  await ensureStreamCustomerHost();

  const existingUid = liveInputUidFromIngressId(channel.rtmpIngressId);

  if (!options?.force && existingUid) {
    const existing = await getCloudflareLiveInput(existingUid);
    if (existing) {
      const data = wrapCloudflareCredentials(existing);
      return { data };
    }
  }

  if (options?.force && existingUid) {
    await deleteCloudflareLiveInput(existingUid);
  }

  try {
    const input = await createCloudflareLiveInput({
      name: `mocomo-${channel.name?.slice(0, 40) || channelId.slice(0, 12)}`,
      channelId,
    });
    const data = wrapCloudflareCredentials(input);
    data.hlsPlaybackUrl = await buildLiveInputHlsUrlAsync(input.uid);

    await db.voiceChannel.update({
      where: { id: channelId },
      data: {
        broadcastMode: "OBS",
        rtmpIngressId: data.ingressId,
        rtmpUrl: data.url,
        rtmpStreamKey: data.streamKey,
      },
    });

    return { data };
  } catch (e) {
    console.error("[provisionCloudflareStreamIngress]", e);
    return {
      error:
        e instanceof Error
          ? e.message
          : "Cloudflare Live Input 생성에 실패했습니다. API 토큰·Stream 구독을 확인하세요.",
    };
  }
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

async function provisionLivekitIngress(
  channelId: string,
  userId: string,
  channel: ChannelObsRow,
  hostName: string,
  options?: { force?: boolean }
): Promise<ProvisionObsResult> {
  if (options?.force && channel.rtmpIngressId && !channel.rtmpIngressId.startsWith("srs:")) {
    await deleteObsRtmpIngress(channel.rtmpIngressId);
  }

  const lk = await createObsRtmpIngress(channelId, hostName, {
    cleanupFirst: !!options?.force || !channel.rtmpIngressId,
  });

  if ("error" in lk) {
    console.warn("[provisionLivekitIngress]", lk.error);
    const allowSrsFallback = process.env.LIVE_INGEST_FALLBACK_SRS === "1";
    if (allowSrsFallback && isSrsConfigured()) {
      const srs = await provisionSrsIngress(channelId, userId, options);
      if ("data" in srs) {
        return {
          data: srs.data,
          warning:
            "LiveKit 한도 초과 — 임시로 VPS(SRS)로 연결했습니다. LiveKit 대시보드에서 Ingress를 정리한 뒤 「키 다시 받기」를 권장합니다.",
        };
      }
    }
    const hint = /ingress|quota|limit|exceeded/i.test(lk.error)
      ? " LiveKit Cloud 대시보드 → Ingress에서 오래된 항목을 삭제하거나, MoCoMo에서 「키 다시 받기」를 눌러 주세요."
      : "";
    return { error: `${lk.error}${hint}` };
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
    console.error("[provisionLivekitIngress] channel bind", e);
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

/** OBS RTMP — 기본 Cloudflare Stream Live */
export async function provisionObsIngress(
  channelId: string,
  userId: string,
  options?: { force?: boolean; preferEngine?: LiveIngestEngine }
): Promise<ProvisionObsResult> {
  const engine = options?.preferEngine ?? preferredLiveIngestEngine();

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
    if (cached && cached.ingestEngine === engine) {
      return { data: cached };
    }
  }

  const host = await db.user.findUnique({
    where: { id: userId },
    select: { username: true, name: true },
  });
  const hostName = host?.name || host?.username || "host";

  if (engine === "cloudflare") {
    return provisionCloudflareStreamIngress(channelId, channel, options);
  }

  if (engine === "livekit") {
    if (options?.force) {
      await cleanupStaleProjectIngresses(channelId);
    }
    return provisionLivekitIngress(channelId, userId, channel, hostName, options);
  }

  return provisionSrsIngress(channelId, userId, options);
}

/** LiveKit 한도 정리 (관리·키 재발급 시) */
export async function releaseLivekitIngressQuota() {
  await cleanupStaleProjectIngresses();
}

export async function teardownObsIngress(ingressId: string | null | undefined) {
  const id = ingressId?.trim();
  if (!id || id.startsWith("srs:") || id.startsWith("cf:")) return;
  await deleteObsRtmpIngress(id);
}
