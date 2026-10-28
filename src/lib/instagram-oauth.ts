import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const GRAPH_VERSION = "v21.0";
const STATE_TTL_MS = 15 * 60 * 1000;
export const INSTAGRAM_OAUTH_SCOPE = "instagram_graph_user_profile";
export const INSTAGRAM_PROVIDER = "instagram" as const;

export type InstagramEnv = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type InstagramTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  user_id?: string | number;
};

export type InstagramProfile = {
  id: string;
  username?: string;
  name?: string;
  account_type?: string;
  profile_picture_url?: string;
};

export type InstagramOAuthState = {
  nonce: string;
  exp: number;
  returnTo?: string;
  addAccount?: boolean;
};

export function isInstagramOAuthConfigured(): boolean {
  return Boolean(
    process.env.INSTAGRAM_CLIENT_ID?.trim() &&
      process.env.INSTAGRAM_CLIENT_SECRET?.trim() &&
      process.env.INSTAGRAM_REDIRECT_URI?.trim()
  );
}

export function requireInstagramEnv(): InstagramEnv {
  const clientId = process.env.INSTAGRAM_CLIENT_ID?.trim();
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET?.trim();
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "INSTAGRAM_CLIENT_ID, INSTAGRAM_CLIENT_SECRET, INSTAGRAM_REDIRECT_URI are required"
    );
  }
  return { clientId, clientSecret, redirectUri };
}

function stateSecret(): string {
  const s =
    process.env.INSTAGRAM_OAUTH_STATE_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();
  if (!s) throw new Error("AUTH_SECRET or INSTAGRAM_OAUTH_STATE_SECRET required");
  return s;
}

function sign(data: string): string {
  return createHmac("sha256", stateSecret()).update(data).digest("base64url");
}

export function safeInstagramReturnTo(raw: string | null | undefined): string | undefined {
  const path = raw?.trim();
  if (!path?.startsWith("/") || path.startsWith("//")) return undefined;
  return path;
}

export function mintInstagramOAuthState(opts?: {
  returnTo?: string | null;
  addAccount?: boolean;
}): string {
  const payload: InstagramOAuthState = {
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + STATE_TTL_MS,
    returnTo: safeInstagramReturnTo(opts?.returnTo),
    addAccount: opts?.addAccount || undefined,
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
    if (!payload.nonce || typeof payload.exp !== "number") {
      return { error: "Could not parse OAuth state." };
    }
    if (payload.exp < Date.now()) return { error: "OAuth session expired." };
    return {
      nonce: payload.nonce,
      exp: payload.exp,
      returnTo: safeInstagramReturnTo(payload.returnTo),
      addAccount: Boolean(payload.addAccount),
    };
  } catch {
    return { error: "Could not parse OAuth state." };
  }
}

/** Frontend / start-route URL for the Instagram Login window. */
export function buildInstagramAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = requireInstagramEnv();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: INSTAGRAM_OAUTH_SCOPE,
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

/** Meta sometimes appends `#_` to the authorization code. */
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

async function exchangeViaFacebookGraph(code: string): Promise<InstagramTokenResponse> {
  const { clientId, clientSecret, redirectUri } = requireInstagramEnv();
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("grant_type", "authorization_code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);

  const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const data = (await res.json()) as InstagramTokenResponse & GraphErrorBody;
  if (!res.ok || data.error || !data.access_token) {
    throw new Error(tokenErrorMessage(data, res.status));
  }
  return data;
}

/** Official Instagram Login short-lived token exchange. */
async function exchangeViaInstagramApi(code: string): Promise<InstagramTokenResponse> {
  const { clientId, clientSecret, redirectUri } = requireInstagramEnv();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
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

export async function exchangeInstagramCodeForToken(
  code: string
): Promise<InstagramTokenResponse> {
  try {
    return await exchangeViaFacebookGraph(code);
  } catch (graphError) {
    try {
      return await exchangeViaInstagramApi(code);
    } catch {
      throw graphError instanceof Error ? graphError : new Error("Token exchange failed");
    }
  }
}

export async function fetchInstagramProfile(
  accessToken: string
): Promise<InstagramProfile> {
  const fields = ["id", "username", "name", "account_type", "profile_picture_url"].join(",");
  const hosts = [
    "https://graph.instagram.com/me",
    `https://graph.facebook.com/${GRAPH_VERSION}/me`,
  ];

  let lastError: Error | null = null;
  for (const host of hosts) {
    const url = new URL(host);
    url.searchParams.set("fields", fields);
    url.searchParams.set("access_token", accessToken);
    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = (await res.json()) as InstagramProfile & GraphErrorBody;
    if (res.ok && data.id && !data.error) {
      return {
        id: String(data.id),
        username: data.username,
        name: data.name,
        account_type: data.account_type,
        profile_picture_url: data.profile_picture_url,
      };
    }
    lastError = new Error(
      data.error?.message ?? data.error_message ?? `Profile fetch failed (${res.status})`
    );
  }
  throw lastError ?? new Error("Instagram profile missing id");
}

export async function exchangeLongLivedInstagramToken(
  shortLivedToken: string
): Promise<InstagramTokenResponse> {
  const { clientSecret } = requireInstagramEnv();
  const url = new URL("https://graph.instagram.com/access_token");
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("access_token", shortLivedToken);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = (await res.json()) as InstagramTokenResponse & GraphErrorBody;
  if (!res.ok || data.error || !data.access_token) {
    throw new Error(data.error?.message ?? "Long-lived token exchange failed");
  }
  return data;
}

export function instagramDisplayName(profile: InstagramProfile): string | null {
  const name = profile.name?.trim() || profile.username?.trim();
  return name || null;
}
