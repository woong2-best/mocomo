import type { LiveExternalProvider } from "./types";

export type PlatformLiveStatus = {
  onAir: boolean;
  /** false when the platform API could not be queried — avoid auto-ending */
  confident: boolean;
};

function youtubeApiKey(): string | null {
  return (
    process.env.YOUTUBE_DATA_API_KEY?.trim() ||
    process.env.GOOGLE_YOUTUBE_API_KEY?.trim() ||
    null
  );
}

const YT_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

async function checkYoutubeVideoLiveApi(
  videoId: string,
  accessToken?: string | null
): Promise<PlatformLiveStatus> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,liveStreamingDetails");
  url.searchParams.set("id", videoId);

  const headers: Record<string, string> = {};
  if (accessToken?.trim()) {
    headers.Authorization = `Bearer ${accessToken.trim()}`;
  } else {
    const key = youtubeApiKey();
    if (!key) return { onAir: true, confident: false };
    url.searchParams.set("key", key);
  }

  try {
    const res = await fetch(url.toString(), { headers, cache: "no-store" });
    if (!res.ok) return { onAir: true, confident: false };

    const json = (await res.json()) as {
      items?: Array<{
        snippet?: { liveBroadcastContent?: string };
        liveStreamingDetails?: { actualEndTime?: string };
      }>;
    };
    const item = json.items?.[0];
    if (!item) return { onAir: false, confident: true };

    const broadcast = item.snippet?.liveBroadcastContent;
    if (broadcast === "live" || broadcast === "upcoming") {
      return { onAir: true, confident: true };
    }
    if (item.liveStreamingDetails?.actualEndTime) {
      return { onAir: false, confident: true };
    }
    if (broadcast === "none") {
      return { onAir: false, confident: true };
    }
    return { onAir: false, confident: true };
  } catch {
    return { onAir: true, confident: false };
  }
}

/** No API key required — parse watch page player response. */
async function checkYoutubeVideoLiveFromWatchPage(
  videoId: string
): Promise<PlatformLiveStatus> {
  try {
    const res = await fetch(
      `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
      { headers: YT_FETCH_HEADERS, cache: "no-store" }
    );
    if (!res.ok) return { onAir: true, confident: false };
    const html = await res.text();

    if (/"isLiveContent"\s*:\s*true/.test(html)) {
      return { onAir: true, confident: true };
    }
    if (/"isLiveContent"\s*:\s*false/.test(html)) {
      return { onAir: false, confident: true };
    }
    if (/"isLive"\s*:\s*true/.test(html) && /liveBroadcastDetails/.test(html)) {
      return { onAir: true, confident: true };
    }
    if (/"isLive"\s*:\s*false/.test(html)) {
      return { onAir: false, confident: true };
    }
    if (/"postLiveDvr"\s*:\s*true/.test(html) || /"isPostLiveDvr"\s*:\s*true/.test(html)) {
      return { onAir: false, confident: true };
    }

    return { onAir: true, confident: false };
  } catch {
    return { onAir: true, confident: false };
  }
}

async function findYoutubeChannelLiveVideoId(
  channelId: string,
  accessToken?: string | null
): Promise<string | null | undefined> {
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("channelId", channelId);
  searchUrl.searchParams.set("eventType", "live");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("maxResults", "1");

  const headers: Record<string, string> = {};
  if (accessToken?.trim()) {
    headers.Authorization = `Bearer ${accessToken.trim()}`;
  } else {
    const key = youtubeApiKey();
    if (!key) return undefined;
    searchUrl.searchParams.set("key", key);
  }

  try {
    const res = await fetch(searchUrl, { headers, cache: "no-store" });
    if (!res.ok) return undefined;
    const json = (await res.json()) as {
      items?: Array<{ id?: { videoId?: string } }>;
    };
    return json.items?.[0]?.id?.videoId ?? null;
  } catch {
    return undefined;
  }
}

async function checkYoutubeVideoLive(
  videoId: string,
  opts?: { accessToken?: string | null; channelId?: string | null }
): Promise<PlatformLiveStatus> {
  const api = await checkYoutubeVideoLiveApi(videoId, opts?.accessToken);
  if (api.confident) return api;

  const page = await checkYoutubeVideoLiveFromWatchPage(videoId);
  if (page.confident) return page;

  const ytChannelId = opts?.channelId?.trim();
  if (ytChannelId) {
    const currentLiveId = await findYoutubeChannelLiveVideoId(
      ytChannelId,
      opts?.accessToken
    );
    if (currentLiveId === null) {
      return { onAir: false, confident: true };
    }
    if (currentLiveId && currentLiveId !== videoId) {
      return { onAir: false, confident: true };
    }
  }

  return page.confident ? page : api.confident ? api : { onAir: true, confident: false };
}

function twitchCreds(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

async function twitchAppToken(creds: {
  clientId: string;
  clientSecret: string;
}): Promise<string | null> {
  try {
    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        grant_type: "client_credentials",
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { access_token?: string };
    return json.access_token ?? null;
  } catch {
    return null;
  }
}

async function checkTwitchChannelLive(channelLogin: string): Promise<PlatformLiveStatus> {
  const creds = twitchCreds();
  if (!creds) return { onAir: true, confident: false };

  const token = await twitchAppToken(creds);
  if (!token) return { onAir: true, confident: false };

  try {
    const url = new URL("https://api.twitch.tv/helix/streams");
    url.searchParams.set("user_login", channelLogin.toLowerCase());
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Client-Id": creds.clientId,
      },
      cache: "no-store",
    });
    if (!res.ok) return { onAir: true, confident: false };
    const json = (await res.json()) as { data?: unknown[] };
    return { onAir: (json.data?.length ?? 0) > 0, confident: true };
  } catch {
    return { onAir: true, confident: false };
  }
}

async function checkChzzkChannelLive(channelId: string): Promise<PlatformLiveStatus> {
  try {
    const res = await fetch(
      `https://api.chzzk.naver.com/service/v1/channels/${encodeURIComponent(channelId)}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": YT_FETCH_HEADERS["User-Agent"],
          Referer: "https://chzzk.naver.com/",
          Origin: "https://chzzk.naver.com",
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return { onAir: true, confident: false };
    const json = (await res.json()) as { content?: { openLive?: boolean } | null };
    const openLive = json.content?.openLive;
    if (typeof openLive !== "boolean") return { onAir: true, confident: false };
    return { onAir: openLive, confident: true };
  } catch {
    return { onAir: true, confident: false };
  }
}

/** Best-effort check whether the external platform stream is still live. */
export async function checkExternalPlatformLiveStatus(params: {
  provider: LiveExternalProvider;
  externalId: string;
  externalChannelId?: string | null;
  accessToken?: string | null;
}): Promise<PlatformLiveStatus> {
  const { provider, externalId, externalChannelId, accessToken } = params;
  if (provider === "YOUTUBE") {
    return checkYoutubeVideoLive(externalId, { accessToken, channelId: externalChannelId });
  }
  if (provider === "TWITCH") {
    return checkTwitchChannelLive(externalId);
  }
  if (provider === "CHZZK") {
    return checkChzzkChannelLive(externalId);
  }
  return { onAir: true, confident: false };
}
