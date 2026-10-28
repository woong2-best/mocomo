import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { safeOAuthReturnTo } from "@/lib/meta-oauth-shared";

const STATE_TTL_MS = 15 * 60 * 1000;
export const NAVER_PROVIDER = "naver" as const;
export const DEFAULT_NAVER_REDIRECT_URI = "https://mocomo.net/api/auth/callback/naver";

export type NaverOAuthState = {
  v: 1;
  provider: "naver";
  nonce: string;
  exp: number;
  returnTo?: string;
  linkUserId?: string;
};

function readEnv(key: string): string | undefined {
  return process.env[key]?.trim() || undefined;
}

export function requireNaverEnv() {
  const clientId =
    readEnv("AUTH_NAVER_ID") ?? readEnv("NAVER_CLIENT_ID") ?? readEnv("NAVER_ID");
  const clientSecret =
    readEnv("AUTH_NAVER_SECRET") ??
    readEnv("NAVER_CLIENT_SECRET") ??
    readEnv("NAVER_SECRET");
  const redirectUri = readEnv("NAVER_REDIRECT_URI") ?? DEFAULT_NAVER_REDIRECT_URI;
  if (!clientId || !clientSecret) {
    throw new Error("AUTH_NAVER_ID and AUTH_NAVER_SECRET are required");
  }
  return { clientId, clientSecret, redirectUri };
}

function stateSecret(): string {
  const s = readEnv("AUTH_SECRET") ?? readEnv("NEXTAUTH_SECRET");
  if (!s) throw new Error("AUTH_SECRET required");
  return `naver-oauth:${s}`;
}

function sign(data: string): string {
  return createHmac("sha256", stateSecret()).update(data).digest("base64url");
}

export function mintNaverOAuthState(
  returnTo?: string | null,
  linkUserId?: string | null
): string {
  const payload: NaverOAuthState = {
    v: 1,
    provider: "naver",
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + STATE_TTL_MS,
    returnTo: safeOAuthReturnTo(returnTo),
    linkUserId: linkUserId || undefined,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyNaverOAuthState(state: string): NaverOAuthState | { error: string } {
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
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as NaverOAuthState;
    if (payload.provider !== "naver" || payload.exp < Date.now()) {
      return { error: "OAuth session expired." };
    }
    return payload;
  } catch {
    return { error: "Could not parse OAuth state." };
  }
}

export function buildNaverAuthorizeUrl(
  returnTo?: string | null,
  linkUserId?: string | null
): string {
  const { clientId, redirectUri } = requireNaverEnv();
  const state = mintNaverOAuthState(returnTo, linkUserId);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });
  return `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`;
}

export async function exchangeNaverCode(code: string, state: string): Promise<{
  accessToken: string;
  refreshToken?: string;
}> {
  const { clientId, clientSecret, redirectUri } = requireNaverEnv();
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
    state,
  });
  const res = await fetch(`https://nid.naver.com/oauth2.0/token?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "Naver token exchange failed");
  }
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

export async function fetchNaverProfile(accessToken: string): Promise<{
  id: string;
  name: string | null;
  email: string | null;
}> {
  const res = await fetch("https://openapi.naver.com/v1/nid/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = (await res.json()) as {
    resultcode?: string;
    response?: { id?: string; name?: string; nickname?: string; email?: string };
    message?: string;
  };
  if (!res.ok || !data.response?.id) {
    throw new Error(data.message ?? "Naver profile fetch failed");
  }
  return {
    id: data.response.id,
    name: data.response.nickname ?? data.response.name ?? null,
    email: data.response.email?.trim().toLowerCase() || null,
  };
}
