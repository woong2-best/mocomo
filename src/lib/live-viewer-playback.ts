import { db } from "@/lib/db";
import { buildCloudflarePlaybackFields } from "@/lib/cloudflare-browser-playback";
import { cloudflareStreamConfigError } from "@/lib/cloudflare-stream";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { resolveChannelIngestEngine } from "@/lib/live-ingest";
import { probeLivekitRoomPublish } from "@/lib/livekit-room-status";
import { buildHostPlaybackPayload } from "@/lib/live-host-playback";
import { isSrsConfigured, srsConfigError } from "@/lib/srs";
import { buildProxiedHlsPlaybackPath, probeSrsManifest } from "@/lib/srs-hls-proxy";
import { resolveObsStreamKeyForChannel } from "@/lib/user-obs-stream-key";

export type ViewerPlaybackPayload = {
  ok?: boolean;
  hlsUrl?: string | null;
  waiting?: boolean;
  tryLoad?: boolean;
  ingestEngine?: string;
  error?: string;
};

/** Viewer HLS playback — shared by web cookie auth and mobile bearer auth. */
export async function buildViewerPlaybackPayload(
  channelId: string,
  userId: string
): Promise<ViewerPlaybackPayload & { status: number }> {
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: {
      createdBy: true,
      rtmpIngressId: true,
      rtmpUrl: true,
      broadcastMode: true,
      isLive: true,
      liveStatus: true,
    },
  });

  if (!channel) {
    return { status: 404, error: "방송을 찾을 수 없습니다." };
  }

  if (channel.createdBy === userId) {
    const payload = await buildHostPlaybackPayload(channelId, userId);
    return { status: 200, ...payload };
  }

  const access = await resolveLiveChannelAccess(channelId, userId);
  if (!access.allowed) {
    return {
      status: access.reason === "NOT_FOUND" ? 404 : 403,
      error: "시청 권한이 없습니다.",
    };
  }

  const ingestEngine = resolveChannelIngestEngine(channel);

  if (ingestEngine === "cloudflare") {
    const cfErr = cloudflareStreamConfigError();
    if (cfErr) {
      return { status: 503, error: cfErr, ingestEngine: "cloudflare" };
    }
    const cf = await buildCloudflarePlaybackFields(channel);
    return {
      status: 200,
      ok: true,
      ingestEngine: "cloudflare",
      hlsUrl: cf.hlsUrl ?? null,
      tryLoad: !!cf.hlsUrl,
      waiting: !cf.hlsUrl,
    };
  }

  if (ingestEngine === "livekit") {
    const probe = await probeLivekitRoomPublish(channelId, channel.createdBy);
    return {
      status: 200,
      ok: true,
      ingestEngine: "livekit",
      hlsUrl: null,
      tryLoad: probe.playable,
      waiting: !probe.playable,
    };
  }

  const srsErr = srsConfigError();
  if (srsErr || !isSrsConfigured()) {
    return { status: 503, error: srsErr ?? "SRS 방송이 설정되지 않았습니다.", ingestEngine: "srs" };
  }

  const { streamKey } = await resolveObsStreamKeyForChannel(channelId, {
    viewerUserId: userId,
  });

  if (!streamKey) {
    return {
      status: 200,
      ok: false,
      hlsUrl: null,
      waiting: true,
      ingestEngine: "srs",
    };
  }

  const hlsUrl = buildProxiedHlsPlaybackPath(channelId, streamKey);
  const probe = await probeSrsManifest(streamKey);

  return {
    status: 200,
    ok: true,
    ingestEngine: "srs",
    hlsUrl,
    tryLoad: true,
    waiting: !probe.playable,
  };
}

/** Absolute HLS URL for mobile clients when playback returns a path. */
export function resolveMobileHlsUrl(
  payload: ViewerPlaybackPayload,
  apiOrigin: string
): string | null {
  const raw = payload.hlsUrl?.trim();
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `${apiOrigin.replace(/\/$/, "")}${raw.startsWith("/") ? "" : "/"}${raw}`;
}
