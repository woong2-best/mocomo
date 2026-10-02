import type {
  StreamingChannelInfo,
  StreamingPlatformProvider,
  StreamingTokenPayload,
} from "../types";
import { parseExternalLiveSource } from "@/lib/live-external/parse";

function twitchCreds(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

const TWITCH_SCOPES = ["user:read:email"].join(" ");

export const twitchStreamingProvider: StreamingPlatformProvider = {
  platform: "TWITCH",
  supportsOAuth: true,

  getConnectUrl(state, redirectUri) {
    const creds = twitchCreds();
    if (!creds) return null;
    const q = new URLSearchParams({
      client_id: creds.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: TWITCH_SCOPES,
      state,
    });
    return `https://id.twitch.tv/oauth2/authorize?${q}`;
  },

  async exchangeOAuthCode(code, redirectUri, _opts?) {
    const creds = twitchCreds();
    if (!creds) throw new Error("Twitch OAuth is not configured.");

    const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) {
      const err = await tokenRes.text().catch(() => "");
      throw new Error(`Twitch token exchange failed: ${err.slice(0, 200)}`);
    }
    const tokenJson = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string[];
    };

    const userRes = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        "Client-Id": creds.clientId,
      },
    });
    if (!userRes.ok) throw new Error("Could not fetch Twitch user information.");
    const userJson = (await userRes.json()) as {
      data?: Array<{
        id: string;
        login: string;
        display_name: string;
        profile_image_url?: string;
      }>;
    };
    const user = userJson.data?.[0];
    if (!user) throw new Error("Could not verify Twitch account.");

    const channel: StreamingChannelInfo = {
      channelId: user.login.toLowerCase(),
      channelName: user.display_name || user.login,
      channelUrl: `https://www.twitch.tv/${user.login.toLowerCase()}`,
      profileImage: user.profile_image_url ?? null,
    };

    const tokens: StreamingTokenPayload = {
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token ?? null,
      expiresAt: tokenJson.expires_in
        ? new Date(Date.now() + tokenJson.expires_in * 1000)
        : null,
      scope: tokenJson.scope?.join(" ") ?? null,
    };

    return { tokens, channel };
  },

  parseManualChannelInput() {
    return { error: "Twitch can only be connected via OAuth." };
  },

  async verifyProfileCode() {
    return false;
  },

  async refreshTokens(tokens) {
    const creds = twitchCreds();
    if (!creds || !tokens.refreshToken) return null;
    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string[];
    };
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? tokens.refreshToken,
      expiresAt: json.expires_in
        ? new Date(Date.now() + json.expires_in * 1000)
        : null,
      scope: json.scope?.join(" ") ?? tokens.scope,
    };
  },

  async resolveLiveSource(account) {
    const parsed = parseExternalLiveSource(account.channelUrl, {
      providerHint: "TWITCH",
    });
    if ("error" in parsed) return parsed;
    if (parsed.externalId.toLowerCase() !== account.channelId.toLowerCase()) {
      return { error: "Twitch channel ID does not match." };
    }
    return parsed;
  },
};
