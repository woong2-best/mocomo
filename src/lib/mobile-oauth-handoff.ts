import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { issueMobileTokenPair } from "@/lib/mobile-auth-tokens";
import {
  MOBILE_OAUTH_REDIRECT,
  sanitizeMobileRedirectUri,
} from "@/lib/mobile-oauth-shared";

export {
  MOBILE_OAUTH_COOKIE,
  MOBILE_OAUTH_REDIRECT_COOKIE,
  MOBILE_OAUTH_REDIRECT,
  MOBILE_SIGNUP_HANDOFF_COOKIE,
  mobileAuthCompletePath,
  sanitizeMobileRedirectUri,
  isMobileOAuthProvider,
  type MobileOAuthProvider,
} from "@/lib/mobile-oauth-shared";

const HANDOFF_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MOBILE_REDIRECT = MOBILE_OAUTH_REDIRECT;

function handoffSecret(): string {
  const raw =
    process.env.MOBILE_JWT_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "";
  if (!raw || raw.length < 16) {
    throw new Error("MOBILE_JWT_SECRET or AUTH_SECRET required for mobile OAuth handoff");
  }
  return `mobile-oauth-handoff:${raw}`;
}

export type MobileOAuthTokensHandoff = {
  kind?: "tokens";
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
    locale: string | null;
  };
  exp: number;
};

export type MobileOAuthSignupHandoff = {
  kind: "needsSignup";
  provider: "discord" | "twitter" | "line" | "naver" | "google";
  sub: string;
  profile: {
    email: string | null;
    name: string | null;
    image: string | null;
  };
  exp: number;
};

export type MobileOAuthHandoffPayload = MobileOAuthTokensHandoff | MobileOAuthSignupHandoff;

function signPayload(bodyB64: string): string {
  return createHmac("sha256", handoffSecret()).update(bodyB64).digest("base64url");
}

function sealRaw(payload: object): string {
  const bodyB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${bodyB64}.${signPayload(bodyB64)}`;
}

function openRaw(sealed: string): unknown | null {
  const parts = sealed.split(".");
  if (parts.length !== 2) return null;
  const [bodyB64, sig] = parts;
  if (!bodyB64 || !sig) return null;
  const expected = signPayload(bodyB64);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(bodyB64, "base64url").toString("utf8")) as {
      exp?: number;
    };
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function sealMobileOAuthHandoff(
  payload: Omit<MobileOAuthTokensHandoff, "exp" | "kind">
): string {
  const full: MobileOAuthTokensHandoff = {
    kind: "tokens",
    ...payload,
    exp: Date.now() + HANDOFF_TTL_MS,
  };
  return sealRaw(full);
}

export function sealMobileOAuthNeedsSignup(
  payload: Omit<MobileOAuthSignupHandoff, "exp" | "kind">
): string {
  const full: MobileOAuthSignupHandoff = {
    kind: "needsSignup",
    ...payload,
    exp: Date.now() + HANDOFF_TTL_MS,
  };
  return sealRaw(full);
}

export function openMobileOAuthHandoff(sealed: string): MobileOAuthHandoffPayload | null {
  const parsed = openRaw(sealed) as MobileOAuthHandoffPayload | null;
  if (!parsed) return null;

  if (parsed.kind === "needsSignup") {
    if (!parsed.provider || !parsed.sub) return null;
    return parsed;
  }

  // Legacy tokens handoff (no kind) or kind: "tokens"
  if (!("accessToken" in parsed) || !parsed.accessToken || !parsed.refreshToken || !parsed.user?.id) {
    return null;
  }
  return parsed;
}

export function buildMobileNeedsSignupRedirectUrl(opts: {
  provider: MobileOAuthSignupHandoff["provider"];
  sub: string;
  profile: MobileOAuthSignupHandoff["profile"];
  redirectUri?: string | null;
}): { url: string; handoff: string } {
  const handoff = sealMobileOAuthNeedsSignup({
    provider: opts.provider,
    sub: opts.sub,
    profile: opts.profile,
  });
  const base = sanitizeMobileRedirectUri(opts.redirectUri) ?? DEFAULT_MOBILE_REDIRECT;
  const join = base.includes("?") ? "&" : "?";
  const url = `${base}${join}handoff=${encodeURIComponent(handoff)}`;
  return { url, handoff };
}

/** Issue mobile tokens for a logged-in web user and return deep-link URL. */
export async function buildMobileOAuthRedirectUrl(opts: {
  userId: string;
  platform?: string | null;
  redirectUri?: string | null;
}): Promise<{ url: string; handoff: string }> {
  const user = await db.user.findUnique({
    where: { id: opts.userId },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      locale: true,
    },
  });
  if (!user) throw new Error("user_not_found");

  const tokens = await issueMobileTokenPair({
    userId: user.id,
    platform: opts.platform ?? null,
    deviceId: null,
  });

  const handoff = sealMobileOAuthHandoff({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt.toISOString(),
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      locale: user.locale,
    },
  });

  const base = sanitizeMobileRedirectUri(opts.redirectUri) ?? DEFAULT_MOBILE_REDIRECT;
  const join = base.includes("?") ? "&" : "?";
  const url = `${base}${join}handoff=${encodeURIComponent(handoff)}`;
  return { url, handoff };
}
