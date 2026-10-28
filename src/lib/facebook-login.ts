import { recoverDeletedAccount } from "@/lib/account-deletion-server";
import { canRecoverAccount, isAccountPastRecovery } from "@/lib/account-deletion";
import { isServiceBanned } from "@/lib/account-status";
import { getCachedSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isOAuthEncryptionConfigured } from "@/lib/encryption";
import {
  exchangeFacebookCodeForToken,
  exchangeLongLivedFacebookToken,
  facebookDisplayName,
  FACEBOOK_OAUTH_SCOPE,
  FACEBOOK_PROVIDER,
  fetchFacebookProfile,
  type FacebookOAuthState,
  type FacebookProfile,
  type FacebookTokenResponse,
} from "@/lib/facebook-oauth";
import type { CreatedOAuthUser } from "@/lib/oauth-signup-completion";
import { findOAuthAccountBySub, persistEncryptedOAuthAccount } from "@/lib/oauth-vault";
import { recordUserAccessLog } from "@/lib/user-access-log";
import {
  establishWebSessionForUser,
  sealWebOAuthPendingSignup,
  setWebOAuthPendingSignupCookie,
} from "@/lib/web-oauth-pending-signup";

const SESSION_USER_SELECT = {
  id: true,
  username: true,
  name: true,
  image: true,
  email: true,
  locale: true,
  countryCode: true,
  timeZone: true,
  role: true,
  premiumTier: true,
  supportTierSent: true,
  earnedMocoTier: true,
  isBanned: true,
  accountStatus: true,
  deletedAt: true,
  scheduledPurgeAt: true,
} as const;

export type FacebookLoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; redirectTo: string };

function signinError(reason: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ reason, ...extra });
  return `/auth/signin?${params.toString()}`;
}

async function resolveTokens(
  short: FacebookTokenResponse
): Promise<{ accessToken: string; expiresIn?: number; tokenType?: string }> {
  try {
    const long = await exchangeLongLivedFacebookToken(short.access_token);
    return {
      accessToken: long.access_token,
      expiresIn: long.expires_in,
      tokenType: long.token_type ?? short.token_type,
    };
  } catch {
    return {
      accessToken: short.access_token,
      expiresIn: short.expires_in,
      tokenType: short.token_type,
    };
  }
}

function profileForVault(profile: FacebookProfile) {
  return {
    email: profile.email ?? null,
    name: facebookDisplayName(profile),
    image: profile.pictureUrl ?? null,
  };
}

async function persistFacebookAccount(opts: {
  userId: string;
  accountId?: string;
  profile: FacebookProfile;
  accessToken: string;
  expiresIn?: number;
  tokenType?: string;
}): Promise<void> {
  if (!isOAuthEncryptionConfigured()) {
    throw new Error("OAuth isn't configured.");
  }
  await persistEncryptedOAuthAccount({
    provider: FACEBOOK_PROVIDER,
    accountId: opts.accountId,
    userId: opts.userId,
    sub: opts.profile.id,
    email: opts.profile.email ?? null,
    name: facebookDisplayName(opts.profile),
    image: opts.profile.pictureUrl ?? null,
    accessToken: opts.accessToken,
    expiresAt: opts.expiresIn ? Math.floor(Date.now() / 1000) + opts.expiresIn : null,
    tokenType: opts.tokenType ?? "bearer",
    scope: FACEBOOK_OAUTH_SCOPE,
  });
}

async function loadSessionUser(userId: string): Promise<CreatedOAuthUser | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: SESSION_USER_SELECT,
  });
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    image: user.image,
    email: user.email,
    locale: user.locale,
    countryCode: user.countryCode,
    timeZone: user.timeZone,
    role: user.role,
    premiumTier: user.premiumTier,
    supportTierSent: user.supportTierSent,
    earnedMocoTier: user.earnedMocoTier,
    isBanned: user.isBanned,
    accountStatus: user.accountStatus,
  };
}

async function signInExistingUser(
  userId: string,
  dest: string
): Promise<FacebookLoginResult> {
  const row = await db.user.findUnique({
    where: { id: userId },
    select: SESSION_USER_SELECT,
  });
  if (!row) return { ok: false, redirectTo: signinError("oauth_failed") };
  if (isServiceBanned(row)) {
    return { ok: false, redirectTo: "/auth/signin?error=banned" };
  }
  if (row.deletedAt) {
    if (isAccountPastRecovery(row)) {
      return { ok: false, redirectTo: "/auth/signin?error=account_deleted" };
    }
    if (canRecoverAccount(row)) {
      await recoverDeletedAccount(userId);
    } else {
      return { ok: false, redirectTo: "/auth/signin?error=account_deleted" };
    }
  }

  const sessionUser = await loadSessionUser(userId);
  if (!sessionUser) return { ok: false, redirectTo: signinError("oauth_failed") };
  const sessionOk = await establishWebSessionForUser(sessionUser);
  if (!sessionOk) return { ok: false, redirectTo: signinError("oauth_failed") };

  void recordUserAccessLog({
    userId: sessionUser.id,
    username: sessionUser.username,
    email: sessionUser.email,
    success: true,
    channel: "web",
    provider: FACEBOOK_PROVIDER,
  });

  return { ok: true, redirectTo: dest };
}

async function startPendingSignup(
  profile: FacebookProfile,
  dest: string,
  addAccount: boolean
): Promise<FacebookLoginResult> {
  const handoff = sealWebOAuthPendingSignup({
    provider: FACEBOOK_PROVIDER,
    sub: profile.id,
    profile: profileForVault(profile),
  });
  await setWebOAuthPendingSignupCookie(handoff);
  const qs = new URLSearchParams();
  if (dest.startsWith("/") && !dest.startsWith("//")) qs.set("dest", dest);
  if (addAccount) qs.set("addAccount", "1");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return { ok: true, redirectTo: `/auth/complete-oauth-signup${suffix}` };
}

/** Account lookup uses Facebook user id (`profile.id`); email is optional profile data only. */
export async function completeFacebookLogin(opts: {
  code: string;
  state: FacebookOAuthState;
}): Promise<FacebookLoginResult> {
  const dest = opts.state.returnTo ?? "/";
  const addAccount = Boolean(opts.state.addAccount);

  const short = await exchangeFacebookCodeForToken(opts.code);
  const tokens = await resolveTokens(short);
  const profile = await fetchFacebookProfile(tokens.accessToken);
  if (!profile.id) {
    return { ok: false, redirectTo: signinError("oauth_failed") };
  }

  const linked = await findOAuthAccountBySub(FACEBOOK_PROVIDER, profile.id);
  const session = await getCachedSession();
  const currentUserId = session?.user?.id ?? null;

  if (linked?.userId) {
    if (currentUserId && currentUserId !== linked.userId && addAccount) {
      return { ok: false, redirectTo: signinError("account_exists") };
    }
    try {
      await persistFacebookAccount({
        userId: linked.userId,
        accountId: linked.id,
        profile,
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType,
      });
    } catch {
      /* existing link is enough to sign in */
    }
    return signInExistingUser(linked.userId, dest);
  }

  if (currentUserId) {
    const already = await db.account.findFirst({
      where: { userId: currentUserId, provider: FACEBOOK_PROVIDER },
      select: { id: true },
    });
    if (already) {
      return { ok: false, redirectTo: signinError("account_exists") };
    }
    try {
      await persistFacebookAccount({
        userId: currentUserId,
        profile,
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType,
      });
    } catch {
      return { ok: false, redirectTo: signinError("oauth_failed") };
    }
    return { ok: true, redirectTo: dest };
  }

  return startPendingSignup(profile, dest, addAccount);
}
