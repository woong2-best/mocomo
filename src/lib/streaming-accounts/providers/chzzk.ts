import type { StreamingChannelInfo, StreamingPlatformProvider } from "../types";
import { parseExternalLiveSource } from "@/lib/live-external/parse";

type ChzzkChannelContent = {
  channelId?: string | null;
  channelName?: string | null;
  channelImageUrl?: string | null;
  channelDescription?: string | null;
  openLive?: boolean;
};

async function fetchChzzkChannel(
  channelId: string
): Promise<ChzzkChannelContent | null> {
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
    const content = json.content;
    if (!content?.channelId) return null;
    return content;
  } catch {
    return null;
  }
}

/** 라이브 중이라면 방송 제목에서도 검증 코드 허용 */
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
  supportsOAuth: false,

  getConnectUrl() {
    return null;
  },

  async exchangeOAuthCode() {
    throw new Error("치지직 OAuth는 지원하지 않습니다.");
  },

  parseManualChannelInput(raw: string): StreamingChannelInfo | { error: string } {
    const parsed = parseExternalLiveSource(raw.trim(), { providerHint: "CHZZK" });
    if ("error" in parsed) return parsed;
    return {
      channelId: parsed.externalId,
      channelName: parsed.externalId,
      channelUrl: `https://chzzk.naver.com/${parsed.externalId}`,
      profileImage: null,
    };
  },

  async verifyProfileCode(channel, verificationCode) {
    const info = await fetchChzzkChannel(channel.channelId);
    if (!info) return false;

    const liveTitle = info.openLive
      ? await fetchChzzkLiveTitle(channel.channelId)
      : null;

    const haystack = [info.channelDescription, info.channelName, liveTitle]
      .filter((v): v is string => Boolean(v && v.trim()))
      .join("\n");

    return haystack.includes(verificationCode);
  },

  async refreshTokens() {
    return null;
  },

  async resolveLiveSource(account) {
    const parsed = parseExternalLiveSource(account.channelUrl || account.channelId, {
      providerHint: "CHZZK",
    });
    if ("error" in parsed) return parsed;
    if (parsed.externalId !== account.channelId) {
      return { error: "치지직 채널 ID가 일치하지 않습니다." };
    }
    return parsed;
  },
};

export async function enrichChzzkChannel(
  channel: StreamingChannelInfo
): Promise<StreamingChannelInfo | { error: string }> {
  const info = await fetchChzzkChannel(channel.channelId);
  if (!info?.channelId) {
    return {
      error:
        "치지직 채널을 찾을 수 없습니다. 채널 URL(예: https://chzzk.naver.com/채널ID)을 확인해 주세요.",
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
  const info = await fetchChzzkChannel(channelId);
  if (!info) {
    return {
      ok: false,
      error:
        "치지직에서 채널 정보를 읽지 못했습니다. 잠시 후 다시 시도하거나 채널 URL을 확인해 주세요.",
    };
  }
  const liveTitle = info.openLive ? await fetchChzzkLiveTitle(channelId) : null;
  const haystack = [info.channelDescription, info.channelName, liveTitle]
    .filter((v): v is string => Boolean(v && v.trim()))
    .join("\n");
  if (!haystack.includes(verificationCode)) {
    return {
      ok: false,
      error:
        "채널 설명(또는 방송 중이면 방송 제목)에 검증 코드가 없습니다. 코드를 붙여넣고 저장한 뒤 다시 확인해 주세요.",
    };
  }
  return { ok: true };
}
