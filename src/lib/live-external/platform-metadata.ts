import type { LiveExternalProvider } from "./types";
import { fetchYoutubeVideoMetadata } from "./youtube-metadata";

export type ExternalPlatformMetadata = {
  title: string | null;
  description: string | null;
};

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

async function fetchTwitchStreamMetadata(
  channelLogin: string
): Promise<ExternalPlatformMetadata> {
  const creds = twitchCreds();
  if (!creds) return { title: null, description: null };

  const token = await twitchAppToken(creds);
  if (!token) return { title: null, description: null };

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
    if (!res.ok) return { title: null, description: null };
    const json = (await res.json()) as {
      data?: Array<{ title?: string }>;
    };
    return {
      title: json.data?.[0]?.title?.trim() || null,
      description: null,
    };
  } catch {
    return { title: null, description: null };
  }
}

type ChzzkLiveDetail = {
  liveTitle?: string | null;
  liveCategoryValue?: string | null;
};

async function fetchChzzkLiveDetail(channelId: string): Promise<ChzzkLiveDetail | null> {
  try {
    const res = await fetch(
      `https://api.chzzk.naver.com/service/v2/channels/${encodeURIComponent(channelId)}/live-detail`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Referer: "https://chzzk.naver.com/",
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { content?: ChzzkLiveDetail | null };
    return json.content ?? null;
  } catch {
    return null;
  }
}

async function fetchChzzkChannelDescription(channelId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.chzzk.naver.com/service/v1/channels/${encodeURIComponent(channelId)}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Referer: "https://chzzk.naver.com/",
          Origin: "https://chzzk.naver.com",
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      content?: { channelDescription?: string | null };
    };
    return json.content?.channelDescription?.trim() || null;
  } catch {
    return null;
  }
}

async function fetchChzzkStreamMetadata(
  channelId: string
): Promise<ExternalPlatformMetadata> {
  const [live, description] = await Promise.all([
    fetchChzzkLiveDetail(channelId),
    fetchChzzkChannelDescription(channelId),
  ]);
  return {
    title: live?.liveTitle?.trim() || null,
    description: description || live?.liveCategoryValue?.trim() || null,
  };
}

/** Fetch live title + description from the external platform (best-effort). */
export async function fetchExternalPlatformMetadata(
  provider: LiveExternalProvider,
  externalId: string
): Promise<ExternalPlatformMetadata> {
  if (provider === "YOUTUBE") {
    return fetchYoutubeVideoMetadata(externalId);
  }
  if (provider === "TWITCH") {
    return fetchTwitchStreamMetadata(externalId);
  }
  if (provider === "CHZZK") {
    return fetchChzzkStreamMetadata(externalId);
  }
  return { title: null, description: null };
}

export function providerDisplayName(provider: LiveExternalProvider): string {
  if (provider === "YOUTUBE") return "YouTube";
  if (provider === "TWITCH") return "Twitch";
  return "치지직";
}
