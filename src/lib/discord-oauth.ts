import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { normalizeOAuthCode, safeOAuthReturnTo } from "@/lib/meta-oauth-shared";

const STATE_TTL_MS = 15 * 60 * 1000;
export const DISCORD_PROVIDER = "discord" as const;
export const DISCORD_OAUTH_SCOPE = "identify";
export const DEFAULT_DISCORD_REDIRECT_URI = "https://mocomo.net/api/auth/callback/discord";

export type DiscordOAuthState = {
  v: 1;
  provider: "discord";
  nonce: string;
  exp: number;
  returnTo?: string;
  linkUserId?: string;
};

function readEnv(key: string): string | undefined {
  return process.env[key]?.trim() || undefined;
}

export function resolveDiscordEnvKeys(): {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
} {
  return {
    clientId: readEnv("AUTH_DISCORD_ID") ?? readEnv("DISCORD_CLIENT_ID"),
    clientSecret: readEnv("AUTH_DISCORD_SECRET") ?? readEnv("DISCORD_CLIENT_SECRET"),
    redirectUri: readEnv("DISCORD_REDIRECT_URI") ?? DEFAULT_DISCORD_REDIRECT_URI,
  };
}

export function isDiscordOAuthConfigured(): boolean {
  const { clientId, clientSecret } = resolveDiscordEnvKeys();
  return Boolean(clientId && clientSecret);
}

export function requireDiscordEnv() {
  const { clientId, clientSecret, redirectUri } = resolveDiscordEnvKeys();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("AUTH_DISCORD_ID and AUTH_DISCORD_SECRET are required");
  }
  return { clientId, clientSecret, redirectUri };
}

function stateSecret(): string {
  const s = readEnv("AUTH_SECRET") ?? readEnv("NEXTAUTH_SECRET");
  if (!s) throw new Error("AUTH_SECRET required");
  return `discord-oauth:${s}`;
}

function sign(data: string): string {
  return createHmac("sha256", stateSecret()).update(data).digest("base64url");
}

export function mintDiscordOAuthState(
  returnTo?: string | null,
  linkUserId?: string | null
): string {
  const payload: DiscordOAuthState = {
    v: 1,
    provider: "discord",
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + STATE_TTL_MS,
    returnTo: safeOAuthReturnTo(returnTo),
    linkUserId: linkUserId || undefined,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyDiscordOAuthState(state: string): DiscordOAuthState | { error: string } {
  const [body, sig] = state.split(".");
  if (!body || !sig) return { error: "Invalid OAuth state." };
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { error: "OAuth state signature is invalid." };
    }
  } catch {
    return { error: "OAuth state signature is invalid." };
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as DiscordOAuthState;
    if (payload.provider !== "discord" || payload.exp < Date.now()) {
      return { error: "OAuth session expired." };
    }
    return payload;
  } catch {
    return { error: "Could not parse OAuth state." };
  }
}

export function buildDiscordAuthorizeUrl(
  returnTo?: string | null,
  linkUserId?: string | null
): string {
  const { clientId, redirectUri } = requireDiscordEnv();
  const state = mintDiscordOAuthState(returnTo, linkUserId);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DISCORD_OAUTH_SCOPE,
    state,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeDiscordCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const { clientId, clientSecret, redirectUri } = requireDiscordEnv();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "Discord token exchange failed");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function fetchDiscordProfile(accessToken: string): Promise<{
  id: string;
  username: string;
  name: string | null;
  image: string | null;
}> {
  const res = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = (await res.json()) as {
    id?: string;
    username?: string;
    global_name?: string | null;
    avatar?: string | null;
    message?: string;
  };
  if (!res.ok || !data.id || !data.username) {
    throw new Error(data.message ?? "Discord profile fetch failed");
  }
  return {
    id: data.id,
    username: data.username,
    name: data.global_name?.trim() || data.username,
    image: data.avatar
      ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
      : null,
  };
}

export { normalizeOAuthCode };
