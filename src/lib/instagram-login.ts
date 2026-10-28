import { recoverDeletedAccount } from "@/lib/account-deletion-server";
import { canRecoverAccount, isAccountPastRecovery } from "@/lib/account-deletion";
import { isServiceBanned } from "@/lib/account-status";
import { getCachedSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isOAuthEncryptionConfigured } from "@/lib/encryption";
import {
  exchangeInstagramCodeForToken,
  exchangeLongLivedInstagramToken,
  fetchInstagramProfile,
  instagramDisplayName,
  INSTAGRAM_OAUTH_SCOPE,
  INSTAGRAM_PROVIDER,
  type InstagramOAuthState,
  type InstagramProfile,
  type InstagramTokenResponse,
} from "@/lib/instagram-oauth";
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

export type InstagramLoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; redirectTo: string };

function signinError(reason: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ reason, ...extra });
  return `/auth/signin?${params.toString()}`;
}

async function resolveTokens(
  short: InstagramTokenResponse
): Promise<{ accessToken: string; expiresIn?: number; tokenType?: string }> {
  try {
    const long = await exchangeLongLivedInstagramToken(short.access_token);
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

function profileForVault(profile: InstagramProfile) {
  return {
    email: null as string | null,
    name: instagramDisplayName(profile),
    image: profile.profile_picture_url?.trim() || null,
  };
}

async function persistInstagramAccount(opts: {
  userId: string;
  accountId?: string;
  profile: InstagramProfile;
  accessToken: string;
  expiresIn?: number;
  tokenType?: string;
}): Promise<void> {
  if (!isOAuthEncryptionConfigured()) {
    throw new Error("OAuth isn't configured.");
  }
  await persistEncryptedOAuthAccount({
    provider: INSTAGRAM_PROVIDER,
    accountId: opts.accountId,
    userId: opts.userId,
    sub: opts.profile.id,
    email: null,
    name: instagramDisplayName(opts.profile),
    image: opts.profile.profile_picture_url?.trim() || null,
    accessToken: opts.accessToken,
    expiresAt: opts.expiresIn ? Math.floor(Date.now() / 1000) + opts.expiresIn : null,
    tokenType: opts.tokenType ?? "bearer",
    scope: INSTAGRAM_OAUTH_SCOPE,
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
): Promise<InstagramLoginResult> {
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
    provider: INSTAGRAM_PROVIDER,
  });

  return { ok: true, redirectTo: dest };
}

async function startPendingSignup(
  profile: InstagramProfile,
  dest: string,
  addAccount: boolean
): Promise<InstagramLoginResult> {
  const handoff = sealWebOAuthPendingSignup({
    provider: INSTAGRAM_PROVIDER,
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

/** Identify users by Instagram user id — email is not provided by Instagram Login. */
export async function completeInstagramLogin(opts: {
  code: string;
  state: InstagramOAuthState;
}): Promise<InstagramLoginResult> {
  const dest = opts.state.returnTo ?? "/";
  const addAccount = Boolean(opts.state.addAccount);

  const short = await exchangeInstagramCodeForToken(opts.code);
  const tokens = await resolveTokens(short);
  const profile = await fetchInstagramProfile(tokens.accessToken);
  const instagramId =
    profile.id || (short.user_id != null ? String(short.user_id) : "");
  if (!instagramId) {
    return { ok: false, redirectTo: signinError("oauth_failed") };
  }
  profile.id = instagramId;

  const linked = await findOAuthAccountBySub(INSTAGRAM_PROVIDER, profile.id);
  const session = await getCachedSession();
  const currentUserId = session?.user?.id ?? opts.state.linkUserId ?? null;

  if (linked?.userId) {
    if (currentUserId && currentUserId !== linked.userId && addAccount) {
      return { ok: false, redirectTo: signinError("account_exists") };
    }
    try {
      await persistInstagramAccount({
        userId: linked.userId,
        accountId: linked.id,
        profile,
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType,
      });
    } catch {
      /* sign-in via existing link */
    }
    return signInExistingUser(linked.userId, dest);
  }

  if (currentUserId) {
    const already = await db.account.findFirst({
      where: { userId: currentUserId, provider: INSTAGRAM_PROVIDER },
      select: { id: true },
    });
    if (already) {
      return { ok: false, redirectTo: signinError("account_exists") };
    }
    try {
      await persistInstagramAccount({
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
