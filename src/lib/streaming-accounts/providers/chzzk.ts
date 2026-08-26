import type {
  StreamingChannelInfo,
  StreamingPlatformProvider,
  StreamingTokenPayload,
} from "../types";

const CHZZK_OPEN_API = "https://openapi.chzzk.naver.com";
const CHZZK_ACCOUNT_INTERLOCK = "https://chzzk.naver.com/account-interlock";

function chzzkClientCreds(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.CHZZK_STREAMING_CLIENT_ID?.trim();
  const clientSecret = process.env.CHZZK_STREAMING_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

type ChzzkApiEnvelope<T> = {
  code?: number | string;
  message?: string | null;
  content?: T;
};

type ChzzkTokenContent = {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: string | number;
};

type ChzzkUserMe = {
  channelId?: string;
  channelName?: string;
};

function unwrapContent<T>(json: ChzzkApiEnvelope<T> | T): T {
  if (json && typeof json === "object" && "content" in json) {
    return (json as ChzzkApiEnvelope<T>).content as T;
  }
  return json as T;
}

async function exchangeChzzkToken(body: Record<string, string>): Promise<ChzzkTokenContent> {
  const creds = chzzkClientCreds();
  if (!creds) throw new Error("치지직 OAuth가 설정되지 않았습니다.");

  const res = await fetch(`${CHZZK_OPEN_API}/auth/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      ...body,
    }),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as ChzzkApiEnvelope<ChzzkTokenContent> | null;
  if (!res.ok) {
    const msg =
      (json && "message" in json && json.message) ||
      `치지직 토큰 교환 실패 (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : "치지직 토큰 교환 실패");
  }

  const content = unwrapContent(json ?? {});
  if (!content.accessToken) {
    throw new Error("치지직 Access Token을 받지 못했습니다.");
  }
  return content;
}

type ChzzkChannelContent = {
  channelId?: string | null;
  channelName?: string | null;
  channelImageUrl?: string | null;
};

async function fetchChzzkChannelPublic(channelId: string): Promise<ChzzkChannelContent | null> {
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
    const json = (await res.json()) as { content?: ChzzkChannelContent | null };
    return json.content ?? null;
  } catch {
    return null;
  }
}

/** 라이브 중이라면 방송 제목에서도 검증 코드 허용 (레거시 수동 검증) */
async function fetchChzzkLiveTitle(channelId: string): Promise<string | null> {
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
    const json = (await res.json()) as {
      content?: { liveTitle?: string | null; status?: string | null };
    };
    return json.content?.liveTitle ?? null;
  } catch {
    return null;
  }
}

export const chzzkStreamingProvider: StreamingPlatformProvider = {
  platform: "CHZZK",
  supportsOAuth: true,

  getConnectUrl(state, redirectUri) {
    const creds = chzzkClientCreds();
    if (!creds) return null;
    const q = new URLSearchParams({
      clientId: creds.clientId,
      redirectUri,
      state,
    });
    return `${CHZZK_ACCOUNT_INTERLOCK}?${q}`;
  },

  async exchangeOAuthCode(code, redirectUri, opts) {
    const state = opts?.state?.trim();
    if (!state) throw new Error("치지직 OAuth state가 없습니다.");

    const tokenContent = await exchangeChzzkToken({
      grantType: "authorization_code",
      code,
      state,
      redirectUri,
    });

    const creds = chzzkClientCreds();
    if (!creds) throw new Error("치지직 OAuth가 설정되지 않았습니다.");

    const userRes = await fetch(`${CHZZK_OPEN_API}/open/v1/users/me`, {
      headers: {
        Authorization: `Bearer ${tokenContent.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!userRes.ok) {
      throw new Error("치지직 채널 정보를 가져올 수 없습니다.");
    }

    const userJson = (await userRes.json()) as ChzzkApiEnvelope<ChzzkUserMe>;
    const me = unwrapContent(userJson);
    if (!me.channelId?.trim()) {
      throw new Error("치지직 채널을 확인할 수 없습니다.");
    }

    const channelId = me.channelId.trim();
    const publicInfo = await fetchChzzkChannelPublic(channelId);

    const channel: StreamingChannelInfo = {
      channelId,
      channelName: me.channelName?.trim() || publicInfo?.channelName?.trim() || channelId,
      channelUrl: `https://chzzk.naver.com/${channelId}`,
      profileImage: publicInfo?.channelImageUrl ?? null,
    };

    const expiresSec = Number(tokenContent.expiresIn);
    const tokens: StreamingTokenPayload = {
      accessToken: tokenContent.accessToken!,
      refreshToken: tokenContent.refreshToken ?? null,
      expiresAt:
        Number.isFinite(expiresSec) && expiresSec > 0
          ? new Date(Date.now() + expiresSec * 1000)
          : null,
      scope: "user",
    };

    return { tokens, channel };
  },

  parseManualChannelInput() {
    return { error: "치지직은 네이버(치지직) 계정 OAuth로만 연결할 수 있습니다." };
  },

  async verifyProfileCode(channel, verificationCode) {
    const info = await fetchChzzkChannelPublic(channel.channelId);
    if (!info) return false;

    const liveTitle = info.channelId
      ? await fetchChzzkLiveTitle(channel.channelId)
      : null;

    const haystack = [info.channelName, liveTitle]
      .filter((v): v is string => Boolean(v && v.trim()))
      .join("\n");

    return haystack.includes(verificationCode);
  },

  async refreshTokens(tokens) {
    if (!tokens.refreshToken) return null;
    try {
      const content = await exchangeChzzkToken({
        grantType: "refresh_token",
        refreshToken: tokens.refreshToken,
      });
      const expiresSec = Number(content.expiresIn);
      return {
        accessToken: content.accessToken!,
        refreshToken: content.refreshToken ?? tokens.refreshToken,
        expiresAt:
          Number.isFinite(expiresSec) && expiresSec > 0
            ? new Date(Date.now() + expiresSec * 1000)
            : null,
        scope: tokens.scope,
      };
    } catch {
      return null;
    }
  },

  async resolveLiveSource(account) {
    const channelId = account.channelId.trim();
    if (!channelId) {
      return { error: "치지직 채널 ID가 없습니다." };
    }
    return {
      provider: "CHZZK" as const,
      externalId: channelId,
      watchUrl: `https://chzzk.naver.com/live/${channelId}`,
      embedUrl: `https://chzzk.naver.com/live/${channelId}`,
      embedSupported: true,
    };
  },
};

export async function enrichChzzkChannel(
  channel: StreamingChannelInfo
): Promise<StreamingChannelInfo | { error: string }> {
  const info = await fetchChzzkChannelPublic(channel.channelId);
  if (!info?.channelId) {
    return {
      error:
        "치지직 채널을 찾을 수 없습니다. OAuth로 다시 연결해 주세요.",
    };
  }
  return {
    channelId: info.channelId,
    channelName: info.channelName?.trim() || info.channelId,
    channelUrl: `https://chzzk.naver.com/${info.channelId}`,
    profileImage: info.channelImageUrl ?? null,
  };
}

export async function diagnoseChzzkVerification(
  channelId: string,
  verificationCode: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const info = await fetchChzzkChannelPublic(channelId);
  if (!info) {
    return {
      ok: false,
      error:
        "치지직에서 채널 정보를 읽지 못했습니다. OAuth로 다시 연결해 주세요.",
    };
  }
  const liveTitle = await fetchChzzkLiveTitle(channelId);
  const haystack = [info.channelName, liveTitle]
    .filter((v): v is string => Boolean(v && v.trim()))
    .join("\n");
  if (!haystack.includes(verificationCode)) {
    return {
      ok: false,
      error:
        "검증 코드가 일치하지 않습니다. 치지직 OAuth 연결을 사용해 주세요.",
    };
  }
  return { ok: true };
}
