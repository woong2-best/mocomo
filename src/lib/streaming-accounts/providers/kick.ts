import type { StreamingChannelInfo, StreamingPlatformProvider } from "../types";

const KICK_LOGIN = /^[a-zA-Z0-9_]{2,25}$/;

function parseKickChannel(raw: string): StreamingChannelInfo | { error: string } {
  const input = raw.trim();
  if (!input) return { error: "Kick 채널 URL 또는 사용자명을 입력해 주세요." };

  let slug: string | null = null;
  if (KICK_LOGIN.test(input) && !input.includes(".")) {
    slug = input.toLowerCase();
  } else {
    try {
      const parsed = new URL(input.startsWith("http") ? input : `https://${input}`);
      const host = parsed.hostname.replace(/^www\./, "");
      if (host !== "kick.com") return { error: "kick.com URL만 지원합니다." };
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] && KICK_LOGIN.test(parts[0])) slug = parts[0].toLowerCase();
    } catch {
      return { error: "유효한 Kick 채널 URL이 아닙니다." };
    }
  }

  if (!slug) return { error: "Kick 사용자명을 확인할 수 없습니다." };

  return {
    channelId: slug,
    channelName: slug,
    channelUrl: `https://kick.com/${slug}`,
    profileImage: null,
  };
}

async function fetchKickProfileBio(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`, {
      headers: { Accept: "application/json", "User-Agent": "MoCoMo/1.0" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { user?: { bio?: string }; bio?: string };
    return json.user?.bio ?? json.bio ?? null;
  } catch {
    return null;
  }
}

export const kickStreamingProvider: StreamingPlatformProvider = {
  platform: "KICK",
  supportsOAuth: false,

  getConnectUrl() {
    return null;
  },

  async exchangeOAuthCode() {
    throw new Error("Kick OAuth는 아직 지원하지 않습니다.");
  },

  parseManualChannelInput(raw) {
    return parseKickChannel(raw);
  },

  async verifyProfileCode(channel, verificationCode) {
    const bio = await fetchKickProfileBio(channel.channelId);
    if (!bio) return false;
    return bio.includes(verificationCode);
  },

  async refreshTokens() {
    return null;
  },

  async resolveLiveSource() {
    return {
      error:
        "Kick 외부 임베드 라이브는 아직 지원하지 않습니다. Twitch·YouTube·치지직 계정을 연결해 주세요.",
    };
  },
};
