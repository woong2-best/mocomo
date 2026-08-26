import type { PlatformChatMessage } from "./types";
import { platformUserId } from "./types";
import { findYoutubeChannelLiveVideoId } from "@/lib/live-external/platform-live-status";

const YT_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

function apiKey(): string | null {
  return (
    process.env.YOUTUBE_DATA_API_KEY?.trim() ||
    process.env.GOOGLE_YOUTUBE_API_KEY?.trim() ||
    null
  );
}

async function resolveLiveChatIdFromApi(
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
    const res = await fetch(url.toString(), { headers, cache: "no-store" });
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

/** Fallback when Data API returns no liveChatId (common for some live streams). */
async function resolveLiveChatIdFromWatchPage(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
      { headers: YT_FETCH_HEADERS, cache: "no-store" }
    );
    if (!res.ok) return null;
    const html = await res.text();
    const quoted = html.match(/"liveChatId"\s*:\s*"([^"]+)"/);
    if (quoted?.[1]) return quoted[1];
    const escaped = html.match(/"liveChatId\\":\\"([^\\"]+)\\"/);
    return escaped?.[1] ?? null;
  } catch {
    return null;
  }
}

async function resolveYoutubeChatTarget(params: {
  videoId: string;
  accessToken?: string | null;
  youtubeChannelId?: string | null;
  liveChatId?: string | null;
}): Promise<{ videoId: string; liveChatId: string | null; hint: string | null }> {
  if (params.liveChatId) {
    return { videoId: params.videoId, liveChatId: params.liveChatId, hint: null };
  }

  let videoId = params.videoId.trim();
  let liveChatId = await resolveLiveChatIdFromApi(videoId, params.accessToken);
  if (liveChatId) return { videoId, liveChatId, hint: null };

  liveChatId = await resolveLiveChatIdFromWatchPage(videoId);
  if (liveChatId) return { videoId, liveChatId, hint: null };

  const ytChannelId = params.youtubeChannelId?.trim();
  if (ytChannelId) {
    const currentVideoId = await findYoutubeChannelLiveVideoId(
      ytChannelId,
      params.accessToken
    );
    if (currentVideoId && currentVideoId !== videoId) {
      videoId = currentVideoId;
      liveChatId = await resolveLiveChatIdFromApi(videoId, params.accessToken);
      if (liveChatId) return { videoId, liveChatId, hint: null };
      liveChatId = await resolveLiveChatIdFromWatchPage(videoId);
      if (liveChatId) return { videoId, liveChatId, hint: null };
    }
  }

  if (!params.accessToken?.trim()) {
    return {
      videoId,
      liveChatId: null,
      hint: "YouTube 계정 재연결이 필요합니다 (설정 → 스트리밍 계정).",
    };
  }

  return {
    videoId,
    liveChatId: null,
    hint: "YouTube 채팅을 찾을 수 없습니다. YouTube에서 채팅이 켜져 있는지 확인하세요.",
  };
}

export async function fetchYoutubeLiveChatMessages(params: {
  videoId: string;
  accessToken?: string | null;
  youtubeChannelId?: string | null;
  pageToken?: string | null;
  liveChatId?: string | null;
}): Promise<{
  messages: PlatformChatMessage[];
  nextPageToken: string | null;
  liveChatId: string | null;
  pollingIntervalMs: number;
  platformError: string | null;
  resolvedVideoId: string;
}> {
  const target = await resolveYoutubeChatTarget(params);
  const liveChatId = target.liveChatId;

  if (!liveChatId) {
    return {
      messages: [],
      nextPageToken: null,
      liveChatId: null,
      pollingIntervalMs: 5000,
      platformError: target.hint,
      resolvedVideoId: target.videoId,
    };
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/liveChat/messages");
  url.searchParams.set("part", "snippet,authorDetails");
  url.searchParams.set("liveChatId", liveChatId);
  url.searchParams.set("maxResults", "200");
  if (params.pageToken) url.searchParams.set("pageToken", params.pageToken);

  if (!params.accessToken?.trim()) {
    return {
      messages: [],
      nextPageToken: null,
      liveChatId,
      pollingIntervalMs: 5000,
      platformError: "YouTube OAuth 토큰이 없습니다. 스트리밍 계정을 다시 연결하세요.",
      resolvedVideoId: target.videoId,
    };
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${params.accessToken.trim()}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => null)) as {
        error?: { message?: string; status?: string };
      } | null;
      const msg =
        errBody?.error?.message ??
        (res.status === 403
          ? "YouTube 채팅 API 권한이 없습니다. Google 계정을 다시 연결하세요."
          : `YouTube API 오류 (${res.status})`);
      return {
        messages: [],
        nextPageToken: params.pageToken ?? null,
        liveChatId,
        pollingIntervalMs: 5000,
        platformError: msg,
        resolvedVideoId: target.videoId,
      };
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
      messages.push({
        id: `youtube:${item.id}`,
        source: "YOUTUBE",
        username,
        content,
        at: item.snippet?.publishedAt
          ? new Date(item.snippet.publishedAt).getTime()
          : Date.now(),
        image: item.authorDetails?.profileImageUrl ?? null,
        userId: platformUserId("YOUTUBE", username),
      });
    }

    return {
      messages,
      nextPageToken: json.nextPageToken ?? null,
      liveChatId,
      pollingIntervalMs: Math.max(json.pollingIntervalMillis ?? 5000, 3000),
      platformError: null,
      resolvedVideoId: target.videoId,
    };
  } catch {
    return {
      messages: [],
      nextPageToken: params.pageToken ?? null,
      liveChatId,
      pollingIntervalMs: 5000,
      platformError: "YouTube 채팅 요청 실패",
      resolvedVideoId: target.videoId,
    };
  }
}
