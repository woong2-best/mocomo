import {
  buildCloudflareWhipPublishUrl,
  ensureStreamCustomerHost,
  getCloudflareWhipPublishUrl,
  liveInputUidFromIngressId,
} from "@/lib/cloudflare-stream";
import { resolveChannelIngestEngine } from "@/lib/live-ingest";
import {
  publisherLockError,
  resolveHostPublishState,
  type HostPublishState,
} from "@/lib/live-publisher-lock";

type ChannelRow = {
  createdBy: string;
  rtmpIngressId: string | null;
  rtmpUrl: string | null;
  broadcastMode: string | null;
  isLive: boolean;
  liveStatus: string;
  livePublisherTabId?: string | null;
};

export async function resolveWhipPublishUrlForHost(
  channel: ChannelRow,
  userId: string,
  tabId: string | null
): Promise<
  | { whipUrl: string; publishState: HostPublishState }
  | { error: string; status: number; publishState?: HostPublishState }
> {
  if (channel.createdBy !== userId) {
    return { error: "호스트만 송출할 수 있습니다.", status: 403 };
  }
  if (channel.liveStatus === "ENDED") {
    return { error: "종료된 방송입니다.", status: 400 };
  }

  const publishState = resolveHostPublishState(channel, tabId);
  if (publishState === "live_elsewhere") {
    return { error: publisherLockError(), status: 409, publishState };
  }

  if (resolveChannelIngestEngine(channel) !== "cloudflare") {
    return {
      error: "브라우저 방송은 Cloudflare Stream이 필요합니다.",
      status: 503,
    };
  }

  const cfUid = liveInputUidFromIngressId(channel.rtmpIngressId);
  if (!cfUid) {
    return { error: "송출 URL 준비 중입니다. 잠시 후 다시 시도해 주세요.", status: 409 };
  }

  let whipUrl = buildCloudflareWhipPublishUrl(cfUid);
  if (!whipUrl) {
    await ensureStreamCustomerHost();
    whipUrl = buildCloudflareWhipPublishUrl(cfUid);
  }
  if (!whipUrl) {
    whipUrl = (await getCloudflareWhipPublishUrl(cfUid)) ?? "";
  }
  if (!whipUrl) {
    return {
      error: "Cloudflare WHIP URL을 받지 못했습니다. Stream 설정을 확인하세요.",
      status: 503,
    };
  }

  return { whipUrl, publishState };
}
