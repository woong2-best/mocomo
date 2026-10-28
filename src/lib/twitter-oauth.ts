import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { normalizeOAuthCode, safeOAuthReturnTo } from "@/lib/meta-oauth-shared";

const STATE_TTL_MS = 15 * 60 * 1000;
const PKCE_COOKIE = "mocomo_twitter_pkce";
export const TWITTER_PROVIDER = "twitter" as const;
export const DEFAULT_TWITTER_REDIRECT_URI = "https://mocomo.net/api/auth/callback/twitter";

export type TwitterOAuthState = {
  v: 1;
  provider: "twitter";
  nonce: string;
  exp: number;
  returnTo?: string;
};

function readEnv(key: string): string | undefined {
  return process.env[key]?.trim() || undefined;
}

export function requireTwitterEnv() {
  const clientId = readEnv("AUTH_TWITTER_ID") ?? readEnv("TWITTER_CLIENT_ID");
  const clientSecret = readEnv("AUTH_TWITTER_SECRET") ?? readEnv("TWITTER_CLIENT_SECRET");
  const redirectUri = readEnv("TWITTER_REDIRECT_URI") ?? DEFAULT_TWITTER_REDIRECT_URI;
  if (!clientId || !clientSecret) {
    throw new Error("AUTH_TWITTER_ID and AUTH_TWITTER_SECRET are required");
  }
  return { clientId, clientSecret, redirectUri };
}

function stateSecret(): string {
  const s = readEnv("AUTH_SECRET") ?? readEnv("NEXTAUTH_SECRET");
  if (!s) throw new Error("AUTH_SECRET required");
  return `twitter-oauth:${s}`;
}

function sign(data: string): string {
  return createHmac("sha256", stateSecret()).update(data).digest("base64url");
}

export function mintTwitterOAuthState(returnTo?: string | null): string {
  const payload: TwitterOAuthState = {
    v: 1,
    provider: "twitter",
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + STATE_TTL_MS,
    returnTo: safeOAuthReturnTo(returnTo),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyTwitterOAuthState(state: string): TwitterOAuthState | { error: string } {
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
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TwitterOAuthState;
    if (payload.provider !== "twitter" || payload.exp < Date.now()) {
      return { error: "OAuth session expired." };
    }
    return payload;
  } catch {
    return { error: "Could not parse OAuth state." };
  }
}

function pkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export async function buildTwitterAuthorizeUrl(returnTo?: string | null): Promise<string> {
  const { clientId, redirectUri } = requireTwitterEnv();
  const { verifier, challenge } = pkcePair();
  const state = mintTwitterOAuthState(returnTo);
  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";
  jar.set(PKCE_COOKIE, verifier, {
    path: "/",
    maxAge: 900,
    sameSite: "lax",
    secure,
    httpOnly: true,
  });
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "users.read tweet.read offline.access",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}

export async function exchangeTwitterCode(code: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const { clientId, clientSecret, redirectUri } = requireTwitterEnv();
  const jar = await cookies();
  const verifier = jar.get(PKCE_COOKIE)?.value;
  jar.delete(PKCE_COOKIE);
  if (!verifier) throw new Error("Missing PKCE verifier");

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });
  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
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
    throw new Error(data.error_description ?? data.error ?? "Twitter token exchange failed");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function fetchTwitterProfile(accessToken: string): Promise<{
  id: string;
  username: string;
  name: string | null;
  image: string | null;
}> {
  const url = new URL("https://api.twitter.com/2/users/me");
  url.searchParams.set("user.fields", "profile_image_url,name,username");
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = (await res.json()) as {
    data?: { id?: string; username?: string; name?: string; profile_image_url?: string };
    errors?: { detail?: string }[];
  };
  if (!res.ok || !data.data?.id || !data.data.username) {
    throw new Error(data.errors?.[0]?.detail ?? "Twitter profile fetch failed");
  }
  return {
    id: data.data.id,
    username: data.data.username,
    name: data.data.name ?? null,
    image: data.data.profile_image_url ?? null,
  };
}

export { normalizeOAuthCode };
