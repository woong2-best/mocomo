import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import {
  safeOAuthReturnTo,
  type GraphErrorBody,
  tokenErrorMessage,
} from "@/lib/meta-oauth-shared";

const GRAPH_VERSION = "v21.0";
const STATE_TTL_MS = 15 * 60 * 1000;
export const FACEBOOK_OAUTH_SCOPE = "public_profile,email";
export const FACEBOOK_PROVIDER = "facebook" as const;
export const DEFAULT_FACEBOOK_REDIRECT_URI =
  "https://mocomo.net/api/auth/facebook/callback";

export type FacebookEnv = {
  appId: string;
  appSecret: string;
  redirectUri: string;
};

export type FacebookTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

export type FacebookProfile = {
  id: string;
  name?: string;
  email?: string;
  pictureUrl?: string;
};

export type FacebookOAuthState = {
  v: 1;
  provider: "facebook";
  nonce: string;
  exp: number;
  returnTo?: string;
  addAccount?: boolean;
};

function readEnv(key: string): string | undefined {
  return process.env[key]?.trim() || undefined;
}

export function resolveFacebookEnvKeys(): {
  appId?: string;
  appSecret?: string;
  redirectUri?: string;
} {
  return {
    appId: readEnv("FACEBOOK_APP_ID") ?? readEnv("FACEBOOK_CLIENT_ID"),
    appSecret:
      readEnv("FACEBOOK_APP_SECRET") ?? readEnv("FACEBOOK_CLIENT_SECRET"),
    redirectUri:
      readEnv("FACEBOOK_REDIRECT_URI") ?? DEFAULT_FACEBOOK_REDIRECT_URI,
  };
}

export function isFacebookOAuthConfigured(): boolean {
  const { appId, appSecret, redirectUri } = resolveFacebookEnvKeys();
  return Boolean(appId && appSecret && redirectUri);
}

export function requireFacebookEnv(): FacebookEnv {
  const { appId, appSecret, redirectUri } = resolveFacebookEnvKeys();
  if (!appId || !appSecret || !redirectUri) {
    throw new Error("FACEBOOK_APP_ID, FACEBOOK_APP_SECRET are required");
  }
  return { appId, appSecret, redirectUri };
}

function stateSecret(): string {
  const s =
    readEnv("FACEBOOK_OAUTH_STATE_SECRET") ??
    readEnv("AUTH_SECRET") ??
    readEnv("NEXTAUTH_SECRET");
  if (!s) throw new Error("AUTH_SECRET or FACEBOOK_OAUTH_STATE_SECRET required");
  return `facebook-oauth:${s}`;
}

function sign(data: string): string {
  return createHmac("sha256", stateSecret()).update(data).digest("base64url");
}

export function safeFacebookReturnTo(raw: string | null | undefined): string | undefined {
  return safeOAuthReturnTo(raw);
}

export function mintFacebookOAuthState(opts?: {
  returnTo?: string | null;
  addAccount?: boolean;
}): string {
  const payload: FacebookOAuthState = {
    v: 1,
    provider: "facebook",
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + STATE_TTL_MS,
    returnTo: safeOAuthReturnTo(opts?.returnTo),
    addAccount: opts?.addAccount || undefined,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyFacebookOAuthState(
  state: string
): FacebookOAuthState | { error: string } {
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
    ) as FacebookOAuthState;
    if (payload.provider !== "facebook") return { error: "Invalid OAuth state." };
    if (!payload.nonce || typeof payload.exp !== "number") {
      return { error: "Could not parse OAuth state." };
    }
    if (payload.exp < Date.now()) return { error: "OAuth session expired." };
    return {
      v: 1,
      provider: "facebook",
      nonce: payload.nonce,
      exp: payload.exp,
      returnTo: safeOAuthReturnTo(payload.returnTo),
      addAccount: Boolean(payload.addAccount),
    };
  } catch {
    return { error: "Could not parse OAuth state." };
  }
}

export function buildFacebookAuthorizeUrl(state: string): string {
  const { appId, redirectUri } = requireFacebookEnv();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: FACEBOOK_OAUTH_SCOPE,
    state,
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

export async function exchangeFacebookCodeForToken(
  code: string
): Promise<FacebookTokenResponse> {
  const { appId, appSecret, redirectUri } = requireFacebookEnv();
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("grant_type", "authorization_code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);

  const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const data = (await res.json()) as FacebookTokenResponse & GraphErrorBody;
  if (!res.ok || data.error || !data.access_token) {
    throw new Error(tokenErrorMessage(data, res.status));
  }
  return data;
}

type GraphMeResponse = {
  id?: string;
  name?: string;
  email?: string;
  picture?: { data?: { url?: string } };
  error?: { message?: string };
};

export async function fetchFacebookProfile(accessToken: string): Promise<FacebookProfile> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/me`);
  url.searchParams.set("fields", "id,name,email,picture.type(large)");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = (await res.json()) as GraphMeResponse;
  if (!res.ok || data.error || !data.id) {
    throw new Error(data.error?.message ?? `Profile fetch failed (${res.status})`);
  }
  return {
    id: String(data.id),
    name: data.name,
    email: data.email?.trim().toLowerCase() || undefined,
    pictureUrl: data.picture?.data?.url?.trim() || undefined,
  };
}

export async function exchangeLongLivedFacebookToken(
  shortLivedToken: string
): Promise<FacebookTokenResponse> {
  const { appId, appSecret } = requireFacebookEnv();
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = (await res.json()) as FacebookTokenResponse & GraphErrorBody;
  if (!res.ok || data.error || !data.access_token) {
    throw new Error(data.error?.message ?? "Long-lived token exchange failed");
  }
  return data;
}

export function facebookDisplayName(profile: FacebookProfile): string | null {
  return profile.name?.trim() || null;
}

export { normalizeOAuthCode } from "@/lib/meta-oauth-shared";
