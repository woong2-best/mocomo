import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { normalizeOAuthCode, safeOAuthReturnTo } from "@/lib/meta-oauth-shared";

const STATE_TTL_MS = 15 * 60 * 1000;
export const TIKTOK_PROVIDER = "tiktok" as const;
export const TIKTOK_OAUTH_SCOPE = "user.info.basic";
export const DEFAULT_TIKTOK_REDIRECT_URI = "https://mocomo.net/api/auth/callback/tiktok";
export const TIKTOK_REGISTERED_REDIRECT_URIS = [
  "https://mocomo.net/api/auth/callback/tiktok",
  "https://www.mocomo.net/api/auth/callback/tiktok",
  "http://localhost:3000/api/auth/callback/tiktok",
  "https://localhost:3000/api/auth/callback/tiktok",
] as const;

export type TikTokOAuthState = {
  v: 1;
  provider: "tiktok";
  nonce: string;
  exp: number;
  returnTo?: string;
  linkUserId?: string;
  redirectUri?: string;
};

function readEnv(key: string): string | undefined {
  return process.env[key]?.trim() || undefined;
}

export function requireTikTokEnv() {
  const clientKey =
    readEnv("TIKTOK_CLIENT_KEY") ??
    readEnv("NEXT_PUBLIC_TIKTOK_CLIENT_KEY") ??
    readEnv("AUTH_TIKTOK_ID") ??
    readEnv("TIKTOK_CLIENT_ID");
  const clientSecret = readEnv("TIKTOK_CLIENT_SECRET") ?? readEnv("AUTH_TIKTOK_SECRET");
  const redirectUri = resolveTikTokRedirectUri();
  if (!clientKey || !clientSecret) {
    throw new Error("TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET are required");
  }
  return { clientKey, clientSecret, redirectUri };
}

export function isAllowedTikTokRedirectUri(uri: string): boolean {
  const extra = readEnv("TIKTOK_REDIRECT_URI");
  return (
    (TIKTOK_REGISTERED_REDIRECT_URIS as readonly string[]).includes(uri) ||
    (extra != null && extra === uri)
  );
}

export function resolveTikTokRedirectUri(requestOrigin?: string | null): string {
  const extra = readEnv("TIKTOK_REDIRECT_URI");
  const origin = requestOrigin?.trim() || "";
  const host = (() => {
    try {
      return origin ? new URL(origin).hostname : "";
    } catch {
      return "";
    }
  })();
  if (host === "localhost" || host === "127.0.0.1") {
    return origin.startsWith("https://")
      ? "https://localhost:3000/api/auth/callback/tiktok"
      : "http://localhost:3000/api/auth/callback/tiktok";
  }
  if (extra && isAllowedTikTokRedirectUri(extra) && !extra.includes("localhost")) {
    return extra;
  }
  return DEFAULT_TIKTOK_REDIRECT_URI;
}

function stateSecret(): string {
  const s = readEnv("AUTH_SECRET") ?? readEnv("NEXTAUTH_SECRET");
  if (!s) throw new Error("AUTH_SECRET required");
  return `tiktok-oauth:${s}`;
}

function sign(data: string): string {
  return createHmac("sha256", stateSecret()).update(data).digest("base64url");
}

export function mintTikTokOAuthState(
  returnTo?: string | null,
  linkUserId?: string | null,
  redirectUri?: string | null
): string {
  const resolved = redirectUri && isAllowedTikTokRedirectUri(redirectUri)
    ? redirectUri
    : resolveTikTokRedirectUri();
  const payload: TikTokOAuthState = {
    v: 1,
    provider: "tiktok",
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + STATE_TTL_MS,
    returnTo: safeOAuthReturnTo(returnTo),
    linkUserId: linkUserId || undefined,
    redirectUri: resolved,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyTikTokOAuthState(state: string): TikTokOAuthState | { error: string } {
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
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TikTokOAuthState;
    if (payload.provider !== "tiktok" || payload.exp < Date.now()) {
      return { error: "OAuth session expired." };
    }
    return payload;
  } catch {
    return { error: "Could not parse OAuth state." };
  }
}

export function buildTikTokAuthorizeUrl(
  returnTo?: string | null,
  linkUserId?: string | null,
  requestOrigin?: string | null
): string {
  const { clientKey } = requireTikTokEnv();
  const redirectUri = resolveTikTokRedirectUri(requestOrigin);
  const state = mintTikTokOAuthState(returnTo, linkUserId, redirectUri);
  const params = new URLSearchParams({
    client_key: clientKey,
    scope: TIKTOK_OAUTH_SCOPE,
    response_type: "code",
    redirect_uri: redirectUri,
    state,
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

export async function exchangeTikTokCode(
  code: string,
  redirectUri?: string | null
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  openId?: string;
}> {
  const { clientKey, clientSecret, redirectUri: fallbackRedirect } = requireTikTokEnv();
  const usedRedirect =
    redirectUri && isAllowedTikTokRedirectUri(redirectUri) ? redirectUri : fallbackRedirect;
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: usedRedirect,
  });
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    open_id?: string;
    error?: string;
    error_description?: string;
    message?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? data.message ?? "TikTok token exchange failed");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    openId: data.open_id,
  };
}

export async function fetchTikTokProfile(accessToken: string): Promise<{
  openId: string;
  unionId: string | null;
  name: string | null;
  username: string | null;
  image: string | null;
}> {
  const url = new URL("https://open.tiktokapis.com/v2/user/info/");
  url.searchParams.set("fields", "open_id,union_id,avatar_url,display_name");
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = (await res.json()) as {
    data?: {
      user?: {
        open_id?: string;
        union_id?: string;
        avatar_url?: string;
        display_name?: string;
        username?: string;
      };
    };
    error?: { code?: string; message?: string };
  };
  const user = data.data?.user;
  if (!res.ok || !user?.open_id) {
    throw new Error(data.error?.message ?? "TikTok profile fetch failed");
  }
  return {
    openId: user.open_id,
    unionId: user.union_id ?? null,
    name: user.display_name?.trim() || null,
    username: user.username?.trim() || null,
    image: user.avatar_url?.trim() || null,
  };
}

export { normalizeOAuthCode };
