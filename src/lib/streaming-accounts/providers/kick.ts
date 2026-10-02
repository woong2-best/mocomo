import type { StreamingChannelInfo, StreamingPlatformProvider } from "../types";

const KICK_LOGIN = /^[a-zA-Z0-9_]{2,25}$/;

function parseKickChannel(raw: string): StreamingChannelInfo | { error: string } {
  const input = raw.trim();
  if (!input) return { error: "Enter a Kick channel URL or username." };

  let slug: string | null = null;
  if (KICK_LOGIN.test(input) && !input.includes(".")) {
    slug = input.toLowerCase();
  } else {
    try {
      const parsed = new URL(input.startsWith("http") ? input : `https://${input}`);
      const host = parsed.hostname.replace(/^www\./, "");
      if (host !== "kick.com") return { error: "Only kick.com URLs are supported." };
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] && KICK_LOGIN.test(parts[0])) slug = parts[0].toLowerCase();
    } catch {
      return { error: "Not a valid Kick channel URL." };
    }
  }

  if (!slug) return { error: "Could not verify Kick username." };

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
    throw new Error("Kick OAuth is not supported yet.");
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
        "Kick external embed live is not supported yet. Connect Twitch or YouTube accounts.",
    };
  },
};
