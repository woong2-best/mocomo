import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const GRAPH_VERSION = "v21.0";
const STATE_TTL_MS = 15 * 60 * 1000;
/** Facebook Login — standard user auth (not Instagram Login). */
export const FACEBOOK_OAUTH_SCOPE = "public_profile,email";
export const FACEBOOK_PROVIDER = "facebook" as const;

export type FacebookEnv = {
  clientId: string;
  clientSecret: string;
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
  nonce: string;
  exp: number;
  returnTo?: string;
  addAccount?: boolean;
};

function readEnv(key: string): string | undefined {
  return process.env[key]?.trim() || undefined;
}

/** Supports FACEBOOK_* with legacy INSTAGRAM_* fallback during env migration. */
export function resolveFacebookEnvKeys(): {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
} {
  return {
    clientId: readEnv("FACEBOOK_CLIENT_ID") ?? readEnv("INSTAGRAM_CLIENT_ID"),
    clientSecret:
      readEnv("FACEBOOK_CLIENT_SECRET") ?? readEnv("INSTAGRAM_CLIENT_SECRET"),
    redirectUri:
      readEnv("FACEBOOK_REDIRECT_URI") ?? readEnv("INSTAGRAM_REDIRECT_URI"),
  };
}

export function isFacebookOAuthConfigured(): boolean {
  const { clientId, clientSecret, redirectUri } = resolveFacebookEnvKeys();
  return Boolean(clientId && clientSecret && redirectUri);
}

export function requireFacebookEnv(): FacebookEnv {
  const { clientId, clientSecret, redirectUri } = resolveFacebookEnvKeys();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "FACEBOOK_CLIENT_ID, FACEBOOK_CLIENT_SECRET, FACEBOOK_REDIRECT_URI are required"
    );
  }
  return { clientId, clientSecret, redirectUri };
}

function stateSecret(): string {
  const s =
    readEnv("FACEBOOK_OAUTH_STATE_SECRET") ??
    readEnv("INSTAGRAM_OAUTH_STATE_SECRET") ??
    readEnv("AUTH_SECRET") ??
    readEnv("NEXTAUTH_SECRET");
  if (!s) throw new Error("AUTH_SECRET or FACEBOOK_OAUTH_STATE_SECRET required");
  return s;
}

function sign(data: string): string {
  return createHmac("sha256", stateSecret()).update(data).digest("base64url");
}

export function safeFacebookReturnTo(raw: string | null | undefined): string | undefined {
  const path = raw?.trim();
  if (!path?.startsWith("/") || path.startsWith("//")) return undefined;
  return path;
}

export function mintFacebookOAuthState(opts?: {
  returnTo?: string | null;
  addAccount?: boolean;
}): string {
  const payload: FacebookOAuthState = {
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + STATE_TTL_MS,
    returnTo: safeFacebookReturnTo(opts?.returnTo),
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
    if (!payload.nonce || typeof payload.exp !== "number") {
      return { error: "Could not parse OAuth state." };
    }
    if (payload.exp < Date.now()) return { error: "OAuth session expired." };
    return {
      nonce: payload.nonce,
      exp: payload.exp,
      returnTo: safeFacebookReturnTo(payload.returnTo),
      addAccount: Boolean(payload.addAccount),
    };
  } catch {
    return { error: "Could not parse OAuth state." };
  }
}

export function buildFacebookAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = requireFacebookEnv();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: FACEBOOK_OAUTH_SCOPE,
    state,
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

export function normalizeOAuthCode(raw: string | null): string | null {
  if (!raw) return null;
  return raw.replace(/#_+$/, "").trim() || null;
}

type GraphErrorBody = {
  error?: { message?: string; type?: string; code?: number };
  error_message?: string;
};

function tokenErrorMessage(data: GraphErrorBody, status: number): string {
  return data.error?.message ?? data.error_message ?? `Token exchange failed (${status})`;
}

export async function exchangeFacebookCodeForToken(
  code: string
): Promise<FacebookTokenResponse> {
  const { clientId, clientSecret, redirectUri } = requireFacebookEnv();
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
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
  const { clientId, clientSecret } = requireFacebookEnv();
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
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
