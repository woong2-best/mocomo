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
  const clientId = (
    process.env.YOUTUBE_STREAMING_CLIENT_ID ||
    process.env.AUTH_GOOGLE_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    ""
  ).trim();
  const clientSecret = (
    process.env.YOUTUBE_STREAMING_CLIENT_SECRET ||
    process.env.AUTH_GOOGLE_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    ""
  ).trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/**
 * youtube.readonly is sensitive — Google may show "Unverified app" until verified.
 * Users continue via Advanced → Go to mocomo.net (same pattern as many apps).
 */
const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "openid",
  "profile",
].join(" ");

const YT_CHANNEL_ID = /^UC[\w-]{22}$/;
const YT_HANDLE = /^@[\w.-]{3,30}$/;

function parseYoutubeChannelRef(raw: string): {
  channelId?: string;
  handle?: string;
  customUrl?: string;
} | { error: string } {
  const input = raw.trim();
  if (!input) return { error: "YouTube 채널 URL 또는 @핸들을 입력해 주세요." };
  if (YT_CHANNEL_ID.test(input)) return { channelId: input };
  if (YT_HANDLE.test(input)) return { handle: input.slice(1) };
  if (/^[\w.-]{3,30}$/.test(input) && !input.includes(".")) {
    return { handle: input };
  }

  try {
    const parsed = new URL(input.startsWith("http") ? input : `https://${input}`);
    const host = parsed.hostname.replace(/^www\./, "");
    if (
      host !== "youtube.com" &&
      host !== "m.youtube.com" &&
      host !== "youtube-nocookie.com"
    ) {
      return { error: "youtube.com 채널 URL만 지원합니다." };
    }
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts[0]?.startsWith("@")) return { handle: parts[0].slice(1) };
    if (parts[0] === "channel" && parts[1] && YT_CHANNEL_ID.test(parts[1])) {
      return { channelId: parts[1] };
    }
    if (parts[0] === "c" && parts[1]) return { customUrl: parts[1] };
    if (parts[0] === "user" && parts[1]) return { customUrl: parts[1] };
  } catch {
    return { error: "유효한 YouTube 채널 URL이 아닙니다." };
  }
  return { error: "YouTube 채널 URL 또는 @핸들을 입력해 주세요. (영상 URL 아님)" };
}

async function fetchYoutubeChannelByApi(params: {
  channelId?: string;
  handle?: string;
}): Promise<StreamingChannelInfo & { description: string } | null> {
  const key = youtubeApiKey();
  if (!key) return null;

  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("key", key);
  if (params.channelId) url.searchParams.set("id", params.channelId);
  else if (params.handle) url.searchParams.set("forHandle", params.handle);
  else return null;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    items?: Array<{
      id: string;
      snippet?: {
        title?: string;
        description?: string;
        customUrl?: string;
        thumbnails?: { default?: { url?: string } };
      };
    }>;
  };
  const item = json.items?.[0];
  if (!item?.id) return null;
  return {
    channelId: item.id,
    channelName: item.snippet?.title?.trim() || item.id,
    channelUrl: item.snippet?.customUrl
      ? `https://www.youtube.com/${item.snippet.customUrl.replace(/^@/, "@")}`
      : `https://www.youtube.com/channel/${item.id}`,
    profileImage: item.snippet?.thumbnails?.default?.url ?? null,
    description: item.snippet?.description ?? "",
  };
}

/** Public channel page — prefer og tags; also keep raw HTML for code search */
async function fetchYoutubeChannelFromPage(
  ref: { channelId?: string; handle?: string; customUrl?: string }
): Promise<(StreamingChannelInfo & { description: string; rawHtml: string }) | null> {
  const path = ref.channelId
    ? `/channel/${ref.channelId}/about`
    : ref.handle
      ? `/@${ref.handle}/about`
      : ref.customUrl
        ? `/c/${ref.customUrl}/about`
        : null;
  if (!path) return null;

  try {
    const res = await fetch(`https://www.youtube.com${path}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
      cache: "no-store",
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (html.length < 2000) return null;

    const idMatch =
      html.match(/"externalId":"(UC[\w-]{22})"/) ||
      html.match(/"channelId":"(UC[\w-]{22})"/) ||
      html.match(/\/channel\/(UC[\w-]{22})/);
    const channelId = idMatch?.[1] ?? ref.channelId;
    if (!channelId || !YT_CHANNEL_ID.test(channelId)) return null;

    const unescape = (s: string) =>
      s
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\u0026/g, "&")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&");

    const ogTitle = html.match(
      /<meta\s+property="og:title"\s+content="([^"]*)"/i
    );
    const pageTitle = html.match(/<title>([^<]+)<\/title>/i);
    const ogDesc = html.match(
      /<meta\s+property="og:description"\s+content="([^"]*)"/i
    );
    const metaDesc = html.match(
      /<meta\s+name="description"\s+content="([^"]*)"/i
    );
    const jsonDesc =
      html.match(/"description":\{"simpleText":"((?:\\.|[^"\\])*)"/) ||
      html.match(/"shortDescription":"((?:\\.|[^"\\])*)"/);

    let channelName =
      (ogTitle?.[1] && unescape(ogTitle[1])) ||
      (pageTitle?.[1] && unescape(pageTitle[1]).replace(/\s*-\s*YouTube$/i, "")) ||
      channelId;
    // Avoid YouTube chrome labels mistakenly captured as the channel name
    if (channelName === "홈" || channelName === "Home" || channelName.length < 1) {
      channelName = channelId;
    }

    const description = unescape(
      ogDesc?.[1] || metaDesc?.[1] || jsonDesc?.[1] || ""
    );

    return {
      channelId,
      channelName: channelName.trim(),
      channelUrl: `https://www.youtube.com/channel/${channelId}`,
      profileImage: null,
      description,
      rawHtml: html,
    };
  } catch {
    return null;
  }
}

async function resolveYoutubeChannel(
  raw: string
): Promise<(StreamingChannelInfo & { description: string; rawHtml?: string }) | { error: string }> {
  const ref = parseYoutubeChannelRef(raw);
  if ("error" in ref) return ref;

  const viaApi = await fetchYoutubeChannelByApi({
    channelId: ref.channelId,
    handle: ref.handle,
  });
  if (viaApi) return viaApi;

  const viaPage = await fetchYoutubeChannelFromPage(ref);
  if (viaPage) return viaPage;

  return {
    error:
      "YouTube 채널을 찾을 수 없습니다. 채널 URL(예: https://www.youtube.com/@핸들)을 확인해 주세요.",
  };
}

function channelContainsVerificationCode(
  channel: { description?: string; rawHtml?: string },
  verificationCode: string
): boolean {
  const code = verificationCode.trim();
  if (!code) return false;
  if (channel.description?.includes(code)) return true;
  if (channel.rawHtml?.includes(code)) return true;
  return false;
}

async function findLiveVideoId(channelId: string, accessToken?: string | null) {
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("channelId", channelId);
  searchUrl.searchParams.set("eventType", "live");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("maxResults", "1");

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  } else {
    const key = youtubeApiKey();
    if (!key) return null;
    searchUrl.searchParams.set("key", key);
  }

  const res = await fetch(searchUrl, { headers, cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    items?: Array<{ id?: { videoId?: string } }>;
  };
  return json.items?.[0]?.id?.videoId ?? null;
}

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
      { headers: { Authorization: `Bearer ${tokenJson.access_token}` }, cache: "no-store" }
    );
    const channelBody = await channelRes.text().catch(() => "");
    if (!channelRes.ok) {
      // Common: YouTube Data API v3 not enabled on the GCP project → 403
      const apiHint =
        /accessNotConfigured|has not been used|disabled/i.test(channelBody)
          ? " GCP에서 YouTube Data API v3를 사용 설정한 뒤 다시 시도해 주세요."
          : /insufficientPermissions|ACCESS_TOKEN_SCOPE_INSUFFICIENT/i.test(channelBody)
            ? " youtube.readonly 권한이 포함되지 않았습니다. Google 동의 화면에서 YouTube 권한을 허용해 주세요."
            : "";
      throw new Error(
        `YouTube 채널 정보를 가져올 수 없습니다.${apiHint} (${channelRes.status})`
      );
    }
    let channelJson: {
      items?: Array<{
        id: string;
        snippet?: { title?: string; thumbnails?: { default?: { url?: string } } };
      }>;
    };
    try {
      channelJson = JSON.parse(channelBody) as typeof channelJson;
    } catch {
      throw new Error("YouTube 채널 응답을 해석할 수 없습니다.");
    }
    const item = channelJson.items?.[0];
    if (!item?.id) {
      throw new Error(
        "이 Google 계정에 YouTube 채널이 없습니다. youtube.com에서 채널을 만든 뒤 같은 계정으로 다시 연결해 주세요."
      );
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
    return { error: "YouTube는 Google 로그인으로만 연결할 수 있습니다." };
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
    const videoId = await findLiveVideoId(account.channelId, tokens?.accessToken);
    if (videoId) {
      return {
        provider: "YOUTUBE" as const,
        externalId: videoId,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: buildYoutubeEmbedUrl(videoId),
        embedSupported: true,
      };
    }

    return {
      error:
        "YouTube에서 진행 중인 라이브를 찾을 수 없습니다. YouTube에서 방송을 시작한 뒤 다시 시도해 주세요.",
    };
  },
};

export async function enrichYoutubeChannel(
  channel: StreamingChannelInfo
): Promise<StreamingChannelInfo | { error: string }> {
  const resolved = await resolveYoutubeChannel(channel.channelUrl || channel.channelId);
  if ("error" in resolved) return resolved;
  return {
    channelId: resolved.channelId,
    channelName: resolved.channelName,
    channelUrl: resolved.channelUrl,
    profileImage: resolved.profileImage,
  };
}

export async function diagnoseYoutubeVerification(
  channelUrlOrId: string,
  verificationCode: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const resolved = await resolveYoutubeChannel(channelUrlOrId);
  if ("error" in resolved) return { ok: false, error: resolved.error };
  if (!channelContainsVerificationCode(resolved, verificationCode)) {
    return {
      ok: false,
      error:
        "YouTube 채널 설명에 검증 코드가 없습니다. YouTube 스튜디오 → 맞춤설정 → 기본 정보의 설명에 코드를 넣고 게시하세요.",
    };
  }
  return { ok: true };
}

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
