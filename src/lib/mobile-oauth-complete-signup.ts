import { db } from "@/lib/db";
import {
  ACCOUNT_SUSPENDED_SIGNUP_MESSAGE,
  isServiceBanned,
} from "@/lib/account-status";
import { canRecoverAccount, isAccountPastRecovery } from "@/lib/account-deletion";
import { recoverDeletedAccount } from "@/lib/account-deletion-server";
import { findRestrictedIdentityUser } from "@/lib/ban-evasion";
import { isOAuthEncryptionConfigured } from "@/lib/encryption";
import {
  FORBIDDEN_ADMIN_SEQUENCE_MESSAGE,
  validateUsernameAndName,
} from "@/lib/forbidden-admin-sequence";
import { generateUniqueUsername } from "@/lib/oauth-username";
import {
  findOAuthAccountBySub,
  hydrateUserOAuthProfile,
  persistEncryptedOAuthAccount,
} from "@/lib/oauth-vault";
import {
  openMobileOAuthHandoff,
  type MobileOAuthSignupHandoff,
} from "@/lib/mobile-oauth-handoff";
import { issueMobileTokenPair } from "@/lib/mobile-auth-tokens";

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

async function linkProviderAccount(
  ticket: MobileOAuthSignupHandoff,
  userId: string
): Promise<void> {
  if (ticket.provider === "naver") {
    const existing = await db.account.findFirst({
      where: { provider: "naver", providerAccountId: ticket.sub },
      select: { id: true },
    });
    if (!existing) {
      await db.account.create({
        data: {
          userId,
          type: "oauth",
          provider: "naver",
          providerAccountId: ticket.sub,
        },
      });
    }
    return;
  }

  if (!isOAuthEncryptionConfigured()) {
    throw new MobileOAuthSignupError(
      "oauth_unavailable",
      "OAuth 설정이 되어 있지 않습니다.",
      503
    );
  }

  await persistEncryptedOAuthAccount({
    provider: ticket.provider as "google" | "discord" | "twitter" | "line",
    userId,
    sub: ticket.sub,
    email: ticket.profile.email,
    name: ticket.profile.name,
    image: ticket.profile.image,
  });
}

/**
 * Complete in-app signup after Discord/X (and fallback web) AuthSession
 * returned a sealed needsSignup handoff.
 */
export async function completeMobileOAuthSignup(input: {
  handoff: string;
  platform?: "android" | "ios" | null;
  deviceId?: string | null;
}) {
  const opened = openMobileOAuthHandoff(input.handoff);
  if (!opened || opened.kind !== "needsSignup") {
    throw new MobileOAuthSignupError(
      "handoff_invalid",
      "가입 인증이 만료되었습니다. 앱에서 다시 시도해 주세요.",
      401
    );
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

  const username = await generateUniqueUsername(
    ticket.profile.email ?? ticket.profile.name ?? "user"
  );
  const displayName = ticket.profile.name?.trim() || username;
  if (!validateUsernameAndName(username, displayName).ok) {
    throw new MobileOAuthSignupError(
      "invalid_username",
      FORBIDDEN_ADMIN_SEQUENCE_MESSAGE,
      400
    );
  }

  const user = (await db.user.create({
    data: {
      email: ticket.profile.email,
      emailVerified: ticket.profile.email ? new Date() : null,
      name: displayName,
      image: ticket.profile.image,
      username,
      profile: { create: {} },
      otakuProfile: { create: {} },
    },
    select: USER_SELECT,
  })) as UserRow;

  await linkProviderAccount(ticket, user.id);

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
