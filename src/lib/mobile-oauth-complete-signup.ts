import { db } from "@/lib/db";
import {
  ACCOUNT_SUSPENDED_SIGNUP_MESSAGE,
  isServiceBanned,
} from "@/lib/account-status";
import { canRecoverAccount, isAccountPastRecovery } from "@/lib/account-deletion";
import { recoverDeletedAccount } from "@/lib/account-deletion-server";
import { findRestrictedIdentityUser } from "@/lib/ban-evasion";
import { findOAuthAccountBySub, hydrateUserOAuthProfile } from "@/lib/oauth-vault";
import { openMobileOAuthHandoff } from "@/lib/mobile-oauth-handoff";
import { issueMobileTokenPair } from "@/lib/mobile-auth-tokens";
import {
  applyBirthDateIfMissing,
  createOAuthUserWithConsent,
  linkOAuthSignupAccount,
  parseOAuthSignupCompletion,
} from "@/lib/oauth-signup-completion";

export class MobileOAuthSignupError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus = 400) {
    super(message);
    this.name = "MobileOAuthSignupError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

const USER_SELECT = {
  id: true,
  username: true,
  name: true,
  image: true,
  email: true,
  locale: true,
  isBanned: true,
  accountStatus: true,
  deletedAt: true,
  scheduledPurgeAt: true,
  passwordHash: true,
  birthDate: true,
} as const;

type UserRow = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  email: string | null;
  locale: string;
  isBanned: boolean;
  accountStatus: import("@prisma/client").AccountStatus;
  deletedAt: Date | null;
  scheduledPurgeAt: Date | null;
  birthDate: Date | null;
};

async function assertUsable(user: UserRow): Promise<void> {
  if (isServiceBanned(user)) {
    throw new MobileOAuthSignupError("banned", "이용이 제한된 계정입니다.", 403);
  }
  if (!user.deletedAt) return;
  if (isAccountPastRecovery(user)) {
    throw new MobileOAuthSignupError("account_deleted", "삭제된 계정입니다.", 403);
  }
  if (canRecoverAccount(user)) {
    await recoverDeletedAccount(user.id);
    return;
  }
  throw new MobileOAuthSignupError(
    "account_pending_recovery",
    "탈퇴 처리 중인 계정입니다.",
    403
  );
}

/**
 * Complete in-app signup after Discord/X (and fallback web) AuthSession
 * returned a sealed needsSignup handoff. Birth date + terms are required
 * before a User row is created.
 */
export async function completeMobileOAuthSignup(input: {
  handoff: string;
  platform?: "android" | "ios" | null;
  deviceId?: string | null;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
}) {
  const opened = openMobileOAuthHandoff(input.handoff);
  if (!opened || opened.kind !== "needsSignup") {
    throw new MobileOAuthSignupError(
      "handoff_invalid",
      "가입 인증이 만료되었습니다. 앱에서 다시 시도해 주세요.",
      401
    );
  }

  const consent = parseOAuthSignupCompletion({
    birthYear: input.birthYear,
    birthMonth: input.birthMonth,
    birthDay: input.birthDay,
    termsAccepted: input.termsAccepted,
    privacyAccepted: input.privacyAccepted,
  });
  if (!consent.ok) {
    throw new MobileOAuthSignupError("signup_incomplete", consent.error, 400);
  }

  const ticket = opened;

  const linked =
    ticket.provider === "naver"
      ? await db.account.findFirst({
          where: { provider: "naver", providerAccountId: ticket.sub },
          select: { userId: true },
        })
      : await findOAuthAccountBySub(
          ticket.provider === "google" ? "google" : ticket.provider,
          ticket.sub
        );

  if (linked?.userId) {
    const existing = await db.user.findUnique({
      where: { id: linked.userId },
      select: USER_SELECT,
    });
    if (existing) {
      await assertUsable(existing as UserRow);
      if (!existing.birthDate) {
        await applyBirthDateIfMissing(existing.id, consent.birthDate);
      }
      const hydrated = await hydrateUserOAuthProfile(existing);
      const tokens = await issueMobileTokenPair({
        userId: existing.id,
        platform: input.platform ?? null,
        deviceId: input.deviceId ?? null,
      });
      return {
        created: false,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        user: {
          id: existing.id,
          username: existing.username,
          name: hydrated.name,
          image: hydrated.image,
          locale: existing.locale,
        },
      };
    }
  }

  if (ticket.profile.email) {
    const restricted = await findRestrictedIdentityUser({ email: ticket.profile.email });
    if (restricted) {
      throw new MobileOAuthSignupError(
        "signup_restricted",
        ACCOUNT_SUSPENDED_SIGNUP_MESSAGE,
        403
      );
    }
  }

  const user = await createOAuthUserWithConsent({
    profile: ticket.profile,
    birthDate: consent.birthDate,
  });

  await linkOAuthSignupAccount({
    provider: ticket.provider,
    sub: ticket.sub,
    userId: user.id,
    profile: ticket.profile,
  });

  const tokens = await issueMobileTokenPair({
    userId: user.id,
    platform: input.platform ?? null,
    deviceId: input.deviceId ?? null,
  });

  return {
    created: true,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      locale: user.locale,
    },
  };
}
