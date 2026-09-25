import {
  encodeSessionFromPayload,
  setSessionCookie,
} from "@/lib/account-switch/server";
import { toCredentialsAuthUser } from "@/lib/auth-credentials";
import {
  openMobileOAuthHandoff,
  sealMobileOAuthNeedsSignup,
  type MobileOAuthSignupHandoff,
} from "@/lib/mobile-oauth-handoff";
import type { CreatedOAuthUser } from "@/lib/oauth-signup-completion";

export const WEB_OAUTH_PENDING_SIGNUP_COOKIE = "mocomo_oauth_pending_signup";
const PENDING_MAX_AGE_SEC = 30 * 60;

export async function setWebOAuthPendingSignupCookie(handoff: string): Promise<void> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";
  jar.set(WEB_OAUTH_PENDING_SIGNUP_COOKIE, handoff, {
    path: "/",
    maxAge: PENDING_MAX_AGE_SEC,
    sameSite: "lax",
    secure,
    httpOnly: true,
  });
}

export async function readWebOAuthPendingSignup(): Promise<MobileOAuthSignupHandoff | null> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const raw = jar.get(WEB_OAUTH_PENDING_SIGNUP_COOKIE)?.value;
  if (!raw) return null;
  const opened = openMobileOAuthHandoff(raw);
  if (!opened || opened.kind !== "needsSignup") return null;
  return opened;
}

export async function clearWebOAuthPendingSignupCookie(): Promise<void> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  jar.delete(WEB_OAUTH_PENDING_SIGNUP_COOKIE);
}

export function sealWebOAuthPendingSignup(
  payload: Omit<MobileOAuthSignupHandoff, "exp" | "kind">
): string {
  return sealMobileOAuthNeedsSignup(payload);
}

export async function establishWebSessionForUser(user: CreatedOAuthUser): Promise<boolean> {
  const authUser = toCredentialsAuthUser({
    ...user,
    passwordHash: null,
    deletedAt: null,
    scheduledPurgeAt: null,
    emailVerified: user.email ? new Date() : null,
  });
  const token = await encodeSessionFromPayload({
    ...authUser,
    sub: user.id,
    picture: user.image,
  });
  if (!token) return false;
  await setSessionCookie(token);
  return true;
}
