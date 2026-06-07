import { db } from "@/lib/db";
import {
  buildCloudflareWhepPlaybackUrl,
  ensureStreamCustomerHost,
  getCloudflareWhepPlaybackUrl,
  liveInputUidFromIngressId,
} from "@/lib/cloudflare-stream";
import { resolveChannelIngestEngine } from "@/lib/live-ingest";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";

type ChannelRow = {
  createdBy: string;
  rtmpIngressId: string | null;
  rtmpUrl: string | null;
  broadcastMode: string | null;
  isLive: boolean;
  liveStatus: string;
};

export async function resolveWhepPlaybackUrlForViewer(
  channelId: string,
  channel: ChannelRow,
  userId: string
): Promise<{ whepUrl: string } | { error: string; status: number; notReady?: boolean }> {
  if (channel.createdBy !== userId) {
    const access = await resolveLiveChannelAccess(channelId, userId);
    if (!access.allowed) {
      return { error: "시청 권한이 없습니다.", status: 403 };
    }
    if (resolveChannelIngestEngine(channel) !== "cloudflare") {
      return { error: "Cloudflare 방송이 아닙니다.", status: 400 };
    }
  }

  const cfUid = liveInputUidFromIngressId(channel.rtmpIngressId);
  if (!cfUid) {
    return { error: "재생 URL 준비 중", status: 409, notReady: true };
  }

  let whepUrl = buildCloudflareWhepPlaybackUrl(cfUid);
  if (!whepUrl) {
    await ensureStreamCustomerHost();
    whepUrl = buildCloudflareWhepPlaybackUrl(cfUid);
  }
  if (!whepUrl) {
    whepUrl = (await getCloudflareWhepPlaybackUrl(cfUid)) ?? "";
  }
  if (!whepUrl) {
    return { error: "재생 URL 준비 중", status: 409, notReady: true };
  }

  return { whepUrl };
}

export async function fetchChannelForWhep(channelId: string) {
  return db.voiceChannel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      createdBy: true,
      rtmpIngressId: true,
      rtmpUrl: true,
      broadcastMode: true,
      isLive: true,
      liveStatus: true,
    },
  });
}
