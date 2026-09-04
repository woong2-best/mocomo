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
import { verifyGoogleIdToken, type GoogleIdTokenClaims } from "@/lib/google-id-token";
import { generateUniqueUsername } from "@/lib/oauth-username";
import {
  findOAuthAccountBySub,
  findUserIdByOAuthEmail,
  hydrateUserOAuthProfile,
  persistEncryptedOAuthAccount,
} from "@/lib/oauth-vault";

export type MobileGoogleFlow = "signin" | "signup";

export type MobileGoogleUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  locale: string | null;
};

export type MobileGoogleResult =
  | { status: "signedIn"; userId: string; user: MobileGoogleUser; created: boolean }
  | {
      status: "needsSignup";
      profile: { email: string | null; name: string | null; image: string | null };
    };

export class MobileGoogleAuthError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus = 400) {
    super(message);
    this.name = "MobileGoogleAuthError";
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
  passwordHash: true,
  isBanned: true,
  accountStatus: true,
  deletedAt: true,
  scheduledPurgeAt: true,
  emailVerified: true,
} as const;

type UserRow = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  email: string | null;
  locale: string;
  passwordHash: string | null;
  isBanned: boolean;
  accountStatus: import("@prisma/client").AccountStatus;
  deletedAt: Date | null;
  scheduledPurgeAt: Date | null;
  emailVerified: Date | null;
};

/** Same gate as the web `signIn` callback, including in-window recovery. */
async function assertUsable(user: UserRow): Promise<void> {
  if (isServiceBanned(user)) {
    throw new MobileGoogleAuthError("banned", "이용이 제한된 계정입니다.", 403);
  }
  if (!user.deletedAt) return;

  if (isAccountPastRecovery(user)) {
    throw new MobileGoogleAuthError("account_deleted", "삭제된 계정입니다.", 403);
  }
  if (canRecoverAccount(user)) {
    await recoverDeletedAccount(user.id);
    return;
  }
  throw new MobileGoogleAuthError(
    "account_pending_recovery",
    "탈퇴 처리 중인 계정입니다. 30일 이내 로그인하면 탈퇴를 취소할 수 있습니다.",
    403
  );
}

async function toPublicUser(user: UserRow): Promise<MobileGoogleUser> {
  const hydrated = await hydrateUserOAuthProfile(user);
  return {
    id: hydrated.id,
    username: user.username,
    name: hydrated.name,
    image: hydrated.image,
    locale: user.locale,
  };
}

async function loadUser(userId: string): Promise<UserRow | null> {
  return db.user.findUnique({
    where: { id: userId },
    select: USER_SELECT,
  }) as Promise<UserRow | null>;
}

async function createGoogleUser(claims: GoogleIdTokenClaims): Promise<UserRow> {
  const restricted = await findRestrictedIdentityUser({ email: claims.email });
  if (restricted) {
    throw new MobileGoogleAuthError(
      "signup_restricted",
      ACCOUNT_SUSPENDED_SIGNUP_MESSAGE,
      403
    );
  }

  const username = await generateUniqueUsername(claims.email ?? claims.name ?? "user");
  const displayName = claims.name?.trim() || username;

  if (!validateUsernameAndName(username, displayName).ok) {
    throw new MobileGoogleAuthError(
      "invalid_username",
      FORBIDDEN_ADMIN_SEQUENCE_MESSAGE,
      400
    );
  }

  return db.user.create({
    data: {
      email: claims.email,
      emailVerified: new Date(),
      name: displayName,
      image: claims.picture,
      username,
      profile: { create: {} },
      otakuProfile: { create: {} },
    },
    select: USER_SELECT,
  }) as Promise<UserRow>;
}

/**
 * Native Google Sign-In (Android/iOS SDK ID token) → MoCoMo account.
 *
 * Mirrors the web NextAuth `signIn` gate: an unknown Google account is never
 * auto-created on `signin`; the app must re-submit with `flow: "signup"` after
 * the user accepts the terms sheet.
 */
export async function resolveMobileGoogleAuth(input: {
  idToken: string;
  flow: MobileGoogleFlow;
}): Promise<MobileGoogleResult> {
  if (!isOAuthEncryptionConfigured()) {
    throw new MobileGoogleAuthError(
      "oauth_unavailable",
      "Google 로그인이 서버에 설정되지 않았습니다.",
      503
    );
  }

  const claims = await verifyGoogleIdToken(input.idToken);
  if (!claims) {
    throw new MobileGoogleAuthError(
      "invalid_token",
      "Google 인증 정보를 확인하지 못했습니다.",
      401
    );
  }
  if (!claims.email || !claims.emailVerified) {
    throw new MobileGoogleAuthError(
      "email_not_verified",
      "이메일이 확인되지 않은 Google 계정입니다.",
      403
    );
  }

  const linked = await findOAuthAccountBySub("google", claims.sub);

  let user: UserRow | null = linked ? await loadUser(linked.userId) : null;
  let created = false;
  let needsLink = false;

  if (!user) {
    const existingId = await findUserIdByOAuthEmail(claims.email);
    if (existingId) {
      user = await loadUser(existingId);
      needsLink = !!user;
    }
  }

  if (!user) {
    if (input.flow !== "signup") {
      return {
        status: "needsSignup",
        profile: {
          email: claims.email,
          name: claims.name,
          image: claims.picture,
        },
      };
    }
    user = await createGoogleUser(claims);
    created = true;
    needsLink = true;
  }

  await assertUsable(user);

  if (needsLink) {
    await persistEncryptedOAuthAccount({
      provider: "google",
      userId: user.id,
      sub: claims.sub,
      email: claims.email,
      name: claims.name,
      image: claims.picture,
    });
  }

  if (!user.emailVerified) {
    await db.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
  }

  return {
    status: "signedIn",
    userId: user.id,
    user: await toPublicUser(user),
    created,
  };
}
