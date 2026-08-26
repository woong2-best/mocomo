import type { PlatformChatMessage } from "./types";
import { platformUserId } from "./types";

function apiKey(): string | null {
  return (
    process.env.YOUTUBE_DATA_API_KEY?.trim() ||
    process.env.GOOGLE_YOUTUBE_API_KEY?.trim() ||
    null
  );
}

async function resolveLiveChatId(
  videoId: string,
  accessToken?: string | null
): Promise<string | null> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "liveStreamingDetails");
  url.searchParams.set("id", videoId);

  const headers: Record<string, string> = {};
  if (accessToken?.trim()) {
    headers.Authorization = `Bearer ${accessToken.trim()}`;
  } else {
    const key = apiKey();
    if (!key) return null;
    url.searchParams.set("key", key);
  }

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      items?: Array<{
        liveStreamingDetails?: { activeLiveChatId?: string };
      }>;
    };
    return json.items?.[0]?.liveStreamingDetails?.activeLiveChatId ?? null;
  } catch {
    return null;
  }
}

export async function fetchYoutubeLiveChatMessages(params: {
  videoId: string;
  accessToken?: string | null;
  pageToken?: string | null;
  liveChatId?: string | null;
}): Promise<{
  messages: PlatformChatMessage[];
  nextPageToken: string | null;
  liveChatId: string | null;
  pollingIntervalMs: number;
}> {
  let liveChatId = params.liveChatId ?? null;
  if (!liveChatId) {
    liveChatId = await resolveLiveChatId(params.videoId, params.accessToken);
  }
  if (!liveChatId) {
    return { messages: [], nextPageToken: null, liveChatId: null, pollingIntervalMs: 5000 };
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/liveChat/messages");
  url.searchParams.set("part", "snippet,authorDetails");
  url.searchParams.set("liveChatId", liveChatId);
  url.searchParams.set("maxResults", "200");
  if (params.pageToken) url.searchParams.set("pageToken", params.pageToken);

  const headers: Record<string, string> = {};
  if (params.accessToken?.trim()) {
    headers.Authorization = `Bearer ${params.accessToken.trim()}`;
  } else {
    const key = apiKey();
    if (!key) {
      return { messages: [], nextPageToken: null, liveChatId, pollingIntervalMs: 5000 };
    }
    url.searchParams.set("key", key);
  }

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      return { messages: [], nextPageToken: params.pageToken ?? null, liveChatId, pollingIntervalMs: 5000 };
    }
    const json = (await res.json()) as {
      nextPageToken?: string;
      pollingIntervalMillis?: number;
      items?: Array<{
        id?: string;
        snippet?: {
          displayMessage?: string;
          publishedAt?: string;
          type?: string;
        };
        authorDetails?: {
          displayName?: string;
          profileImageUrl?: string;
          isChatModerator?: boolean;
        };
      }>;
    };

    const messages: PlatformChatMessage[] = [];
    for (const item of json.items ?? []) {
      const type = item.snippet?.type;
      if (type && type !== "textMessageEvent" && type !== "superChatEvent") continue;
      const content = item.snippet?.displayMessage?.trim();
      const username = item.authorDetails?.displayName?.trim();
      if (!content || !username || !item.id) continue;
      const at = item.snippet?.publishedAt
        ? new Date(item.snippet.publishedAt).getTime()
        : Date.now();
      messages.push({
        id: `youtube:${item.id}`,
        source: "YOUTUBE",
        username,
        content,
        at,
        image: item.authorDetails?.profileImageUrl ?? null,
        userId: platformUserId("YOUTUBE", username),
      });
    }

    return {
      messages,
      nextPageToken: json.nextPageToken ?? null,
      liveChatId,
      pollingIntervalMs: Math.max(json.pollingIntervalMillis ?? 5000, 3000),
    };
  } catch {
    return { messages: [], nextPageToken: params.pageToken ?? null, liveChatId, pollingIntervalMs: 5000 };
  }
}
