import type {
  StreamingChannelInfo,
  StreamingPlatformProvider,
  StreamingTokenPayload,
} from "../types";
import { buildYoutubeEmbedUrl } from "@/lib/live-external/parse";

function youtubeApiKey(): string | null {
  return (
    process.env.YOUTUBE_DATA_API_KEY?.trim() ||
    process.env.GOOGLE_YOUTUBE_API_KEY?.trim() ||
    null
  );
}

function googleClientCreds(): { clientId: string; clientSecret: string } | null {
  const clientId =
    process.env.YOUTUBE_STREAMING_CLIENT_ID?.trim() ||
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.AUTH_GOOGLE_ID?.trim();
  const clientSecret =
    process.env.YOUTUBE_STREAMING_CLIENT_SECRET?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    process.env.AUTH_GOOGLE_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

export const youtubeStreamingProvider: StreamingPlatformProvider = {
  platform: "YOUTUBE",
  supportsOAuth: true,

  getConnectUrl(state, redirectUri) {
    const creds = googleClientCreds();
    if (!creds) return null;
    const q = new URLSearchParams({
      client_id: creds.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: YOUTUBE_SCOPES,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
  },

  async exchangeOAuthCode(code, redirectUri) {
    const creds = googleClientCreds();
    if (!creds) throw new Error("YouTube OAuth가 설정되지 않았습니다.");

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      const err = await tokenRes.text().catch(() => "");
      throw new Error(`YouTube 토큰 교환 실패: ${err.slice(0, 200)}`);
    }
    const tokenJson = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };

    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      { headers: { Authorization: `Bearer ${tokenJson.access_token}` } }
    );
    if (!channelRes.ok) {
      throw new Error("YouTube 채널 정보를 가져올 수 없습니다.");
    }
    const channelJson = (await channelRes.json()) as {
      items?: Array<{
        id: string;
        snippet?: { title?: string; thumbnails?: { default?: { url?: string } } };
      }>;
    };
    const item = channelJson.items?.[0];
    if (!item?.id) {
      throw new Error("YouTube 채널이 연결되지 않았습니다. 채널을 만든 뒤 다시 시도해 주세요.");
    }

    const channel: StreamingChannelInfo = {
      channelId: item.id,
      channelName: item.snippet?.title?.trim() || item.id,
      channelUrl: `https://www.youtube.com/channel/${item.id}`,
      profileImage: item.snippet?.thumbnails?.default?.url ?? null,
    };

    const tokens: StreamingTokenPayload = {
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token ?? null,
      expiresAt: tokenJson.expires_in
        ? new Date(Date.now() + tokenJson.expires_in * 1000)
        : null,
      scope: tokenJson.scope ?? null,
    };

    return { tokens, channel };
  },

  parseManualChannelInput() {
    return { error: "YouTube는 OAuth로만 연결할 수 있습니다." };
  },

  async verifyProfileCode() {
    return false;
  },

  async refreshTokens(tokens) {
    const creds = googleClientCreds();
    if (!creds || !tokens.refreshToken) return null;
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        refresh_token: tokens.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      access_token: string;
      expires_in?: number;
      scope?: string;
    };
    return {
      accessToken: json.access_token,
      refreshToken: tokens.refreshToken,
      expiresAt: json.expires_in
        ? new Date(Date.now() + json.expires_in * 1000)
        : null,
      scope: json.scope ?? tokens.scope,
    };
  },

  async resolveLiveSource(account, tokens) {
    if (!tokens?.accessToken) {
      return { error: "YouTube OAuth 토큰이 없습니다. 계정을 다시 연결해 주세요." };
    }

    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("channelId", account.channelId);
    searchUrl.searchParams.set("eventType", "live");
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", "1");

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (res.ok) {
      const json = (await res.json()) as {
        items?: Array<{ id?: { videoId?: string } }>;
      };
      const videoId = json.items?.[0]?.id?.videoId;
      if (videoId) {
        return {
          provider: "YOUTUBE" as const,
          externalId: videoId,
          watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
          embedUrl: buildYoutubeEmbedUrl(videoId),
          embedSupported: true,
        };
      }
    }

    const apiKey = youtubeApiKey();
    if (apiKey) {
      const fallback = new URL("https://www.googleapis.com/youtube/v3/search");
      fallback.searchParams.set("part", "snippet");
      fallback.searchParams.set("channelId", account.channelId);
      fallback.searchParams.set("eventType", "live");
      fallback.searchParams.set("type", "video");
      fallback.searchParams.set("maxResults", "1");
      fallback.searchParams.set("key", apiKey);
      const fb = await fetch(fallback);
      if (fb.ok) {
        const json = (await fb.json()) as {
          items?: Array<{ id?: { videoId?: string } }>;
        };
        const videoId = json.items?.[0]?.id?.videoId;
        if (videoId) {
          return {
            provider: "YOUTUBE" as const,
            externalId: videoId,
            watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
            embedUrl: buildYoutubeEmbedUrl(videoId),
            embedSupported: true,
          };
        }
      }
    }

    return {
      error:
        "YouTube에서 진행 중인 라이브를 찾을 수 없습니다. YouTube에서 방송을 시작한 뒤 다시 시도해 주세요.",
    };
  },
};

export async function verifyYoutubeVideoBelongsToChannel(
  videoId: string,
  channelId: string,
  accessToken?: string | null
): Promise<boolean> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("id", videoId);
  if (!accessToken) {
    const key = youtubeApiKey();
    if (!key) return false;
    url.searchParams.set("key", key);
  }
  const res = await fetch(url, { headers });
  if (!res.ok) return false;
  const json = (await res.json()) as {
    items?: Array<{ snippet?: { channelId?: string } }>;
  };
  return json.items?.[0]?.snippet?.channelId === channelId;
}
