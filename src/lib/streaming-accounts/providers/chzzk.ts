import type { StreamingChannelInfo, StreamingPlatformProvider } from "../types";
import { parseExternalLiveSource } from "@/lib/live-external/parse";

async function fetchChzzkChannelDescription(channelId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.chzzk.naver.com/service/v1/channels/${encodeURIComponent(channelId)}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "MoCoMo/1.0",
        },
        next: { revalidate: 0 },
      }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      content?: { channelDescription?: string };
    };
    return json.content?.channelDescription ?? null;
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
      channelUrl: parsed.watchUrl,
      profileImage: null,
    };
  },

  async verifyProfileCode(channel, verificationCode) {
    const desc = await fetchChzzkChannelDescription(channel.channelId);
    if (!desc) return false;
    return desc.includes(verificationCode);
  },

  async refreshTokens() {
    return null;
  },

  async resolveLiveSource(account) {
    const parsed = parseExternalLiveSource(account.channelUrl, {
      providerHint: "CHZZK",
    });
    if ("error" in parsed) return parsed;
    if (parsed.externalId !== account.channelId) {
      return { error: "치지직 채널 ID가 일치하지 않습니다." };
    }
    return parsed;
  },
};
