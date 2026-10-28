import { getCachedSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isOAuthEncryptionConfigured } from "@/lib/encryption";
import {
  exchangeNaverCode,
  fetchNaverProfile,
  NAVER_PROVIDER,
  type NaverOAuthState,
} from "@/lib/naver-oauth";
import { findOAuthAccountBySub, persistEncryptedOAuthAccount } from "@/lib/oauth-vault";
import {
  exchangeTwitterCode,
  fetchTwitterProfile,
  TWITTER_PROVIDER,
  type TwitterOAuthState,
} from "@/lib/twitter-oauth";

export type ProfileSocialConnectResult =
  | { ok: true; redirectTo: string }
  | { ok: false; redirectTo: string };

function dest(returnTo?: string) {
  return returnTo || "/settings/profile";
}

function fail(reason: string) {
  return `/settings/profile?reason=${encodeURIComponent(reason)}`;
}

export async function completeTwitterProfileConnect(opts: {
  code: string;
  state: TwitterOAuthState;
}): Promise<ProfileSocialConnectResult> {
  const session = await getCachedSession();
  const userId = session?.user?.id ?? opts.state.linkUserId;
  if (!userId) {
    return { ok: false, redirectTo: "/auth/signin?callbackUrl=/settings/profile" };
  }
  if (!isOAuthEncryptionConfigured()) {
    return { ok: false, redirectTo: fail("oauth_failed") };
  }

  const tokens = await exchangeTwitterCode(opts.code);
  const profile = await fetchTwitterProfile(tokens.accessToken);
  const linked = await findOAuthAccountBySub(TWITTER_PROVIDER, profile.id);
  if (linked && linked.userId !== userId) {
    return { ok: false, redirectTo: fail("account_exists") };
  }

  const already = await db.account.findFirst({
    where: { userId, provider: TWITTER_PROVIDER },
    select: { id: true },
  });
  if (already && !linked) {
    return { ok: false, redirectTo: fail("account_exists") };
  }

  await persistEncryptedOAuthAccount({
    provider: TWITTER_PROVIDER,
    accountId: linked?.id,
    userId,
    sub: profile.id,
    email: null,
    name: profile.username,
    image: profile.image,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? null,
    expiresAt: tokens.expiresIn ? Math.floor(Date.now() / 1000) + tokens.expiresIn : null,
    tokenType: "bearer",
    scope: "users.read tweet.read offline.access",
  });

  return { ok: true, redirectTo: dest(opts.state.returnTo) };
}

export async function completeNaverProfileConnect(opts: {
  code: string;
  state: NaverOAuthState;
  rawState: string;
}): Promise<ProfileSocialConnectResult> {
  const session = await getCachedSession();
  const userId = session?.user?.id ?? opts.state.linkUserId;
  if (!userId) {
    return { ok: false, redirectTo: "/auth/signin?callbackUrl=/settings/profile" };
  }

  const tokens = await exchangeNaverCode(opts.code, opts.rawState);
  const profile = await fetchNaverProfile(tokens.accessToken);
  const linked = await db.account.findFirst({
    where: { provider: NAVER_PROVIDER, providerAccountId: profile.id },
    select: { id: true, userId: true },
  });
  if (linked && linked.userId !== userId) {
    return { ok: false, redirectTo: fail("account_exists") };
  }

  const already = await db.account.findFirst({
    where: { userId, provider: NAVER_PROVIDER },
    select: { id: true },
  });
  if (already && !linked) {
    return { ok: false, redirectTo: fail("account_exists") };
  }

  if (linked) {
    await db.account.update({
      where: { id: linked.id },
      data: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken ?? null,
        id_token: profile.name,
      },
    });
  } else {
    await db.account.create({
      data: {
        userId,
        type: "oauth",
        provider: NAVER_PROVIDER,
        providerAccountId: profile.id,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken ?? null,
        id_token: profile.name,
      },
    });
  }

  return { ok: true, redirectTo: dest(opts.state.returnTo) };
}
