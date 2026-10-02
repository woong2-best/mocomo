import {
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
    return { error: "Only the host can publish.", status: 403 };
  }
  if (channel.liveStatus === "ENDED") {
    return { error: "This broadcast has ended.", status: 400 };
  }

  const publishState = resolveHostPublishState(channel, tabId);
  if (publishState === "live_elsewhere") {
    return { error: publisherLockError(), status: 409, publishState };
  }

  if (resolveChannelIngestEngine(channel) !== "cloudflare") {
    return {
      error: "Browser broadcasting requires Cloudflare Stream.",
      status: 503,
    };
  }

  const cfUid = liveInputUidFromIngressId(channel.rtmpIngressId);
  if (!cfUid) {
    return { error: "Publish URL is being prepared. Try again shortly.", status: 409 };
  }

  await ensureStreamCustomerHost();
  const whipUrl = (await getCloudflareWhipPublishUrl(cfUid)) ?? "";
  if (!whipUrl) {
    return {
      error: "Couldn't get Cloudflare WHIP URL. Tap Refresh keys and try again.",
      status: 503,
    };
  }

  return { whipUrl, publishState };
}
