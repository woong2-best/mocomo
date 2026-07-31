import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { issueMobileTokenPair } from "@/lib/mobile-auth-tokens";

const HANDOFF_TTL_MS = 2 * 60 * 1000;
const DEFAULT_MOBILE_REDIRECT = "mocomo://oauth";

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

export type MobileOAuthHandoffPayload = {
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

function signPayload(bodyB64: string): string {
  return createHmac("sha256", handoffSecret()).update(bodyB64).digest("base64url");
}

export function sealMobileOAuthHandoff(payload: Omit<MobileOAuthHandoffPayload, "exp">): string {
  const full: MobileOAuthHandoffPayload = {
    ...payload,
    exp: Date.now() + HANDOFF_TTL_MS,
  };
  const bodyB64 = Buffer.from(JSON.stringify(full), "utf8").toString("base64url");
  return `${bodyB64}.${signPayload(bodyB64)}`;
}

export function openMobileOAuthHandoff(sealed: string): MobileOAuthHandoffPayload | null {
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
    const parsed = JSON.parse(
      Buffer.from(bodyB64, "base64url").toString("utf8")
    ) as MobileOAuthHandoffPayload;
    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.user?.id) return null;
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
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

/** Allow only MoCoMo app / Expo auth-session return URLs. */
export function sanitizeMobileRedirectUri(raw?: string | null): string | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const okScheme =
    u.protocol === "mocomo:" ||
    u.protocol === "exp:" ||
    u.protocol === "exps:" ||
    // Expo Go / dev client sometimes uses https auth proxy — reject generic https
    false;
  if (!okScheme) return null;
  // Strip any attacker-supplied handoff
  u.searchParams.delete("handoff");
  return u.toString().replace(/\?$/, "");
}

export const MOBILE_OAUTH_COOKIE = "mocomo_mobile_oauth";
export const MOBILE_OAUTH_REDIRECT_COOKIE = "mocomo_mobile_redirect";
export const MOBILE_OAUTH_REDIRECT = DEFAULT_MOBILE_REDIRECT;

/** After web auth succeeds, land here to issue app tokens + deep-link back. */
export function mobileAuthCompletePath(platform: "android" | "ios" = "android") {
  return `/auth/mobile/oauth/complete?platform=${platform}&from=mobile`;
}

export type MobileOAuthProvider = "discord" | "twitter" | "line" | "gmail" | "naver";

export function isMobileOAuthProvider(v: string): v is MobileOAuthProvider {
  return (
    v === "discord" ||
    v === "twitter" ||
    v === "line" ||
    v === "gmail" ||
    v === "naver"
  );
}
