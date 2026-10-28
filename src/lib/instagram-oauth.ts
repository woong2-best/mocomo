import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import {
  safeOAuthReturnTo,
  type GraphErrorBody,
  tokenErrorMessage,
} from "@/lib/meta-oauth-shared";

const STATE_TTL_MS = 15 * 60 * 1000;
/** Instagram API with Instagram Login — use Instagram App ID from Business login settings. */
export const INSTAGRAM_OAUTH_SCOPE = "instagram_business_basic";
export const INSTAGRAM_PROVIDER = "instagram" as const;
export const DEFAULT_INSTAGRAM_REDIRECT_URI =
  "https://mocomo.net/api/auth/instagram/callback";

export type InstagramEnv = {
  appId: string;
  appSecret: string;
  redirectUri: string;
};

export type InstagramTokenResponse = {
  access_token: string;
  user_id?: string | number;
  token_type?: string;
  expires_in?: number;
};

export type InstagramProfile = {
  id: string;
  username?: string;
  name?: string;
  account_type?: string;
  profile_picture_url?: string;
};

export type InstagramOAuthState = {
  v: 1;
  provider: "instagram";
  nonce: string;
  exp: number;
  returnTo?: string;
  addAccount?: boolean;
  linkUserId?: string;
};

function readEnv(key: string): string | undefined {
  return process.env[key]?.trim() || undefined;
}

export function resolveInstagramEnvKeys(): {
  appId?: string;
  appSecret?: string;
  redirectUri?: string;
} {
  return {
    appId: readEnv("INSTAGRAM_APP_ID") ?? readEnv("INSTAGRAM_CLIENT_ID"),
    appSecret:
      readEnv("INSTAGRAM_APP_SECRET") ?? readEnv("INSTAGRAM_CLIENT_SECRET"),
    redirectUri:
      readEnv("INSTAGRAM_REDIRECT_URI") ?? DEFAULT_INSTAGRAM_REDIRECT_URI,
  };
}

export function isInstagramOAuthConfigured(): boolean {
  const { appId, appSecret, redirectUri } = resolveInstagramEnvKeys();
  return Boolean(appId && appSecret && redirectUri);
}

export function requireInstagramEnv(): InstagramEnv {
  const { appId, appSecret, redirectUri } = resolveInstagramEnvKeys();
  if (!appId || !appSecret || !redirectUri) {
    throw new Error("INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET are required");
  }
  return { appId, appSecret, redirectUri };
}

function stateSecret(): string {
  const s =
    readEnv("INSTAGRAM_OAUTH_STATE_SECRET") ??
    readEnv("AUTH_SECRET") ??
    readEnv("NEXTAUTH_SECRET");
  if (!s) throw new Error("AUTH_SECRET or INSTAGRAM_OAUTH_STATE_SECRET required");
  return `instagram-oauth:${s}`;
}

function sign(data: string): string {
  return createHmac("sha256", stateSecret()).update(data).digest("base64url");
}

export function safeInstagramReturnTo(raw: string | null | undefined): string | undefined {
  return safeOAuthReturnTo(raw);
}

export function mintInstagramOAuthState(opts?: {
  returnTo?: string | null;
  addAccount?: boolean;
  linkUserId?: string | null;
}): string {
  const payload: InstagramOAuthState = {
    v: 1,
    provider: "instagram",
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + STATE_TTL_MS,
    returnTo: safeOAuthReturnTo(opts?.returnTo),
    addAccount: opts?.addAccount || undefined,
    linkUserId: opts?.linkUserId || undefined,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyInstagramOAuthState(
  state: string
): InstagramOAuthState | { error: string } {
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
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as InstagramOAuthState;
    if (payload.provider !== "instagram") return { error: "Invalid OAuth state." };
    if (!payload.nonce || typeof payload.exp !== "number") {
      return { error: "Could not parse OAuth state." };
    }
    if (payload.exp < Date.now()) return { error: "OAuth session expired." };
    return {
      v: 1,
      provider: "instagram",
      nonce: payload.nonce,
      exp: payload.exp,
      returnTo: safeOAuthReturnTo(payload.returnTo),
      addAccount: Boolean(payload.addAccount),
      linkUserId: payload.linkUserId,
    };
  } catch {
    return { error: "Could not parse OAuth state." };
  }
}

/** Instagram Login — must use Instagram App ID (not Meta/Facebook app id). */
export function buildInstagramAuthorizeUrl(state: string): string {
  const { appId, redirectUri } = requireInstagramEnv();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: INSTAGRAM_OAUTH_SCOPE,
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeInstagramCodeForToken(
  code: string
): Promise<InstagramTokenResponse> {
  const { appId, appSecret, redirectUri } = requireInstagramEnv();
  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const data = (await res.json()) as InstagramTokenResponse & GraphErrorBody;
  if (!res.ok || data.error || !data.access_token) {
    throw new Error(tokenErrorMessage(data, res.status));
  }
  return data;
}

export async function fetchInstagramProfile(
  accessToken: string
): Promise<InstagramProfile> {
  const fields = ["id", "username", "name", "account_type", "profile_picture_url"].join(
    ","
  );
  const url = new URL("https://graph.instagram.com/me");
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = (await res.json()) as InstagramProfile & GraphErrorBody;
  if (!res.ok || data.error || !data.id) {
    throw new Error(
      data.error?.message ?? data.error_message ?? `Profile fetch failed (${res.status})`
    );
  }
  return {
    id: String(data.id),
    username: data.username,
    name: data.name,
    account_type: data.account_type,
    profile_picture_url: data.profile_picture_url,
  };
}

export async function exchangeLongLivedInstagramToken(
  shortLivedToken: string
): Promise<InstagramTokenResponse> {
  const { appSecret } = requireInstagramEnv();
  const url = new URL("https://graph.instagram.com/access_token");
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("access_token", shortLivedToken);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = (await res.json()) as InstagramTokenResponse & GraphErrorBody;
  if (!res.ok || data.error || !data.access_token) {
    throw new Error(data.error?.message ?? "Long-lived token exchange failed");
  }
  return data;
}

export function instagramDisplayName(profile: InstagramProfile): string | null {
  return profile.name?.trim() || profile.username?.trim() || null;
}

export { normalizeOAuthCode } from "@/lib/meta-oauth-shared";
