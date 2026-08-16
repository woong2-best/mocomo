import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type LiveHost = {
  id: string;
  username: string;
  image: string | null;
  name?: string | null;
  isPartner?: boolean;
  followerCount?: number;
};

export type LiveListItem = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  viewerCount: number;
  category: string;
  tags?: string[];
  broadcastMode: string | null;
  host: LiveHost;
};

export type LivePopularCategory = {
  id: string;
  viewerCount: number;
};

export type LiveRecommendedHost = {
  id: string;
  username: string;
  image: string | null;
  isPartner: boolean;
  followerCount: number;
};

export type LiveScheduledItem = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  category: string;
  scheduledAt: string | null;
  broadcastMode: string | null;
  hostId: string;
};

export type LiveHubResponse = {
  items: LiveListItem[];
  popularCategories: LivePopularCategory[];
  followed: LiveListItem[];
  recommended: LiveRecommendedHost[];
  scheduled: LiveScheduledItem[];
  category: string | null;
};

export type LiveExternalInfo = {
  provider: string;
  embedUrl: string | null;
  watchUrl: string;
  embedSupported: boolean;
};

export type LiveDetail = LiveListItem & {
  description?: string | null;
  isLive: boolean;
  liveStatus?: string;
  canEnter?: boolean;
  isHost?: boolean;
  isExternal?: boolean;
  mediaSourceType?: string | null;
  external?: LiveExternalInfo | null;
  paymentsEnabled?: boolean;
  streamStartedAt?: string;
  donationAlertsOnStream?: boolean;
};

export type LiveToken = {
  token: string;
  serverUrl: string;
  role: string;
  canPublish: boolean;
  hostUserId?: string;
  audioOnly?: boolean;
};

export type LiveChatMessage = {
  id: string;
  userId: string;
  username: string;
  content: string;
  at: number;
  image: string | null;
  supportTierSent?: string;
};

export type StreamingAccount = {
  id: string;
  platform: string;
  channelId: string;
  channelName: string;
  channelUrl: string;
  profileImage: string | null;
};

export async function fetchLiveHub(opts?: { category?: string | null }) {
  const params = new URLSearchParams();
  if (opts?.category) params.set("category", opts.category);
  const suffix = params.toString() ? `?${params}` : "";
  return apiRequest<LiveHubResponse>(`${MobileApi.live}${suffix}`, { auth: true });
}

/** @deprecated use fetchLiveHub */
export async function fetchLiveList() {
  const hub = await fetchLiveHub();
  return { items: hub.items };
}

export async function fetchLiveDetail(id: string) {
  return apiRequest<{ item: LiveDetail }>(`${MobileApi.live}/${id}`, { auth: true });
}

export async function fetchLiveToken(id: string) {
  return apiRequest<LiveToken>(`${MobileApi.live}/${id}/token`, { auth: true });
}

export async function fetchLiveChat(
  id: string,
  opts?: { since?: number; initial?: boolean; signal?: AbortSignal }
) {
  const params = new URLSearchParams();
  if (opts?.initial) params.set("initial", "1");
  if (opts?.since != null) params.set("since", new Date(opts.since).toISOString());
  const suffix = params.toString() ? `?${params}` : "";
  return apiRequest<{ ok: boolean; viewerCount: number; messages: LiveChatMessage[] }>(
    `${MobileApi.live}/${id}/chat${suffix}`,
    { auth: true, signal: opts?.signal, timeoutMs: 12_000 }
  );
}

export async function sendLiveChat(id: string, content: string) {
  return apiRequest<{ ok: boolean; message: LiveChatMessage }>(`${MobileApi.live}/${id}/chat`, {
    method: "POST",
    auth: true,
    body: { content },
  });
}

export type LiveAlertItem = {
  id: string;
  kind: "tip" | "cheer";
  username: string;
  amount: number;
  message: string | null;
  at: string;
  eventType?: string;
  rouletteLabel?: string;
  viaLivePage?: boolean;
};

export async function fetchLiveAlerts(channelId: string, sinceMs?: number) {
  const params = sinceMs ? `?since=${sinceMs}` : "";
  return apiRequest<{ alerts: LiveAlertItem[]; serverTime: number }>(
    `${MobileApi.liveAlerts(channelId)}${params}`,
    { auth: true, timeoutMs: 12_000 }
  );
}

export async function fetchStreamingAccounts() {
  return apiRequest<{ accounts: StreamingAccount[] }>(`${MobileApi.live}/accounts`, {
    auth: true,
  });
}

export async function createExternalLive(input: {
  name: string;
  connectedAccountId: string;
  category?: string;
  goLive?: boolean;
}) {
  return apiRequest<{
    channel: { id: string; name: string };
    provider: string;
    watchUrl: string;
    embedSupported: boolean;
  }>(`${MobileApi.live}/external`, {
    method: "POST",
    auth: true,
    body: input,
  });
}
