import { db } from "@/lib/db";
import { isServiceBanned } from "@/lib/account-status";
import { canRecoverAccount, isAccountPastRecovery } from "@/lib/account-deletion";
import { recoverDeletedAccount } from "@/lib/account-deletion-server";
import { isOAuthEncryptionConfigured } from "@/lib/encryption";
import { verifyGoogleIdToken } from "@/lib/google-id-token";
import {
  findOAuthAccountBySub,
  findUserIdByOAuthEmail,
  hydrateUserOAuthProfile,
  persistEncryptedOAuthAccount,
} from "@/lib/oauth-vault";
import {
  applyBirthDateIfMissing,
  createOAuthUserWithConsent,
  parseOAuthSignupCompletion,
} from "@/lib/oauth-signup-completion";

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
  birthDate: true,
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
  birthDate: Date | null;
};

/** Same gate as the web `signIn` callback, including in-window recovery. */
async function assertUsable(user: UserRow): Promise<void> {
  if (isServiceBanned(user)) {
    throw new MobileGoogleAuthError("banned", "This account is restricted.", 403);
  }
  if (!user.deletedAt) return;

  if (isAccountPastRecovery(user)) {
    throw new MobileGoogleAuthError("account_deleted", "This account has been deleted.", 403);
  }
  if (canRecoverAccount(user)) {
    await recoverDeletedAccount(user.id);
    return;
  }
  throw new MobileGoogleAuthError(
    "account_pending_recovery",
    "This account is pending deletion. Sign in within 30 days to cancel deletion.",
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

/**
 * Native Google Sign-In (Android/iOS SDK ID token) → MoCoMo account.
 *
 * An unknown Google account is never auto-created on `signin`. `flow: "signup"`
 * requires birth date + terms/privacy consent in the same request.
 */
export async function resolveMobileGoogleAuth(input: {
  idToken: string;
  flow: MobileGoogleFlow;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
  username?: string;
  name?: string;
  password?: string;
}): Promise<MobileGoogleResult> {
  if (!isOAuthEncryptionConfigured()) {
    throw new MobileGoogleAuthError(
      "oauth_unavailable",
      "Google sign-in isn't configured on the server.",
      503
    );
  }

  const claims = await verifyGoogleIdToken(input.idToken);
  if (!claims) {
    throw new MobileGoogleAuthError(
      "invalid_token",
      "Couldn't verify Google credentials.",
      401
    );
  }
  if (!claims.email || !claims.emailVerified) {
    throw new MobileGoogleAuthError(
      "email_not_verified",
      "This Google account's email isn't verified.",
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
    const consent = parseOAuthSignupCompletion({
      birthYear: input.birthYear,
      birthMonth: input.birthMonth,
      birthDay: input.birthDay,
      termsAccepted: input.termsAccepted,
      privacyAccepted: input.privacyAccepted,
    });
    if (!consent.ok) {
      throw new MobileGoogleAuthError("signup_incomplete", consent.error, 400);
    }
    try {
      const createdUser = await createOAuthUserWithConsent({
        profile: {
          email: claims.email,
          name: claims.name,
          image: claims.picture,
        },
        birthDate: consent.birthDate,
        username: input.username,
        name: input.name,
        password: input.password,
      });
      user = await loadUser(createdUser.id);
      if (!user) {
        throw new MobileGoogleAuthError("signup_failed", "Couldn't create the account.", 500);
      }
    } catch (e) {
      if (e instanceof MobileGoogleAuthError) throw e;
      throw new MobileGoogleAuthError(
        "signup_failed",
        e instanceof Error ? e.message : "Couldn't create the account.",
        400
      );
    }
    created = true;
    needsLink = true;
  } else if (input.flow === "signup" && !user.birthDate) {
    const consent = parseOAuthSignupCompletion({
      birthYear: input.birthYear,
      birthMonth: input.birthMonth,
      birthDay: input.birthDay,
      termsAccepted: input.termsAccepted,
      privacyAccepted: input.privacyAccepted,
    });
    if (consent.ok) {
      await applyBirthDateIfMissing(user.id, consent.birthDate);
    }
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
