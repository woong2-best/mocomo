import { db } from "@/lib/db";
import { isServiceBanned } from "@/lib/account-status";
import { canRecoverAccount, isAccountPastRecovery } from "@/lib/account-deletion";
import { recoverDeletedAccount } from "@/lib/account-deletion-server";
import { isOAuthEncryptionConfigured } from "@/lib/encryption";
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

export type MobileNativeOAuthProvider = "naver" | "line";
export type MobileNativeOAuthFlow = "signin" | "signup";

export type MobileNativeOAuthUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  locale: string | null;
};

export type MobileNativeOAuthResult =
  | {
      status: "signedIn";
      userId: string;
      user: MobileNativeOAuthUser;
      created: boolean;
    }
  | {
      status: "needsSignup";
      profile: { email: string | null; name: string | null; image: string | null };
    };

export class MobileNativeOAuthError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus = 400) {
    super(message);
    this.name = "MobileNativeOAuthError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

type ProviderProfile = {
  sub: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

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

async function assertUsable(user: UserRow): Promise<void> {
  if (isServiceBanned(user)) {
    throw new MobileNativeOAuthError("banned", "이용이 제한된 계정입니다.", 403);
  }
  if (!user.deletedAt) return;
  if (isAccountPastRecovery(user)) {
    throw new MobileNativeOAuthError("account_deleted", "삭제된 계정입니다.", 403);
  }
  if (canRecoverAccount(user)) {
    await recoverDeletedAccount(user.id);
    return;
  }
  throw new MobileNativeOAuthError(
    "account_pending_recovery",
    "탈퇴 처리 중인 계정입니다. 30일 이내 로그인하면 탈퇴를 취소할 수 있습니다.",
    403
  );
}

async function toPublicUser(user: UserRow): Promise<MobileNativeOAuthUser> {
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

async function fetchLineProfile(accessToken: string): Promise<ProviderProfile> {
  const res = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new MobileNativeOAuthError("invalid_token", "LINE 인증 정보를 확인하지 못했습니다.", 401);
  }
  const data = (await res.json()) as {
    userId?: string;
    displayName?: string;
    pictureUrl?: string;
  };
  if (!data.userId) {
    throw new MobileNativeOAuthError("invalid_token", "LINE 프로필을 읽지 못했습니다.", 401);
  }
  return {
    sub: data.userId,
    email: null,
    name: data.displayName?.trim() || null,
    image: data.pictureUrl ?? null,
  };
}

async function fetchNaverProfile(accessToken: string): Promise<ProviderProfile> {
  const res = await fetch("https://openapi.naver.com/v1/nid/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new MobileNativeOAuthError("invalid_token", "네이버 인증 정보를 확인하지 못했습니다.", 401);
  }
  const data = (await res.json()) as {
    resultcode?: string;
    response?: {
      id?: string;
      email?: string;
      nickname?: string;
      profile_image?: string;
    };
  };
  const profile = data.response;
  if (data.resultcode !== "00" || !profile?.id) {
    throw new MobileNativeOAuthError("invalid_token", "네이버 프로필을 읽지 못했습니다.", 401);
  }
  return {
    sub: profile.id,
    email: profile.email?.trim().toLowerCase() || null,
    name: profile.nickname?.trim() || null,
    image: profile.profile_image ?? null,
  };
}

async function findNaverLinkedUserId(sub: string): Promise<string | null> {
  const row = await db.account.findFirst({
    where: { provider: "naver", providerAccountId: sub },
    select: { userId: true },
  });
  return row?.userId ?? null;
}

async function linkNaverAccount(userId: string, profile: ProviderProfile, accessToken: string) {
  const existing = await db.account.findFirst({
    where: { provider: "naver", providerAccountId: profile.sub },
    select: { id: true },
  });
  if (existing) return;
  await db.account.create({
    data: {
      userId,
      type: "oauth",
      provider: "naver",
      providerAccountId: profile.sub,
      access_token: accessToken,
      token_type: "bearer",
    },
  });
}

/**
 * Native Naver / LINE access token → MoCoMo account.
 * Unknown accounts return needsSignup until the app re-posts with flow=signup
 * plus birth date and terms consent.
 */
export async function resolveMobileNativeOAuthAuth(input: {
  provider: MobileNativeOAuthProvider;
  accessToken: string;
  flow: MobileNativeOAuthFlow;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
}): Promise<MobileNativeOAuthResult> {
  if (input.provider === "line" && !isOAuthEncryptionConfigured()) {
    throw new MobileNativeOAuthError(
      "oauth_unavailable",
      "LINE 로그인이 서버에 설정되지 않았습니다.",
      503
    );
  }

  const profile =
    input.provider === "line"
      ? await fetchLineProfile(input.accessToken)
      : await fetchNaverProfile(input.accessToken);

  let userId: string | null =
    input.provider === "line"
      ? (await findOAuthAccountBySub("line", profile.sub))?.userId ?? null
      : await findNaverLinkedUserId(profile.sub);

  let user: UserRow | null = userId ? await loadUser(userId) : null;
  let created = false;
  let needsLink = false;

  // Naver: never auto-link by email alone (same policy as web).
  if (!user && input.provider === "line" && profile.email) {
    const existingId = await findUserIdByOAuthEmail(profile.email);
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
          email: profile.email,
          name: profile.name,
          image: profile.image,
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
      throw new MobileNativeOAuthError("signup_incomplete", consent.error, 400);
    }
    try {
      const createdUser = await createOAuthUserWithConsent({
        profile: {
          email: profile.email,
          name: profile.name,
          image: profile.image,
        },
        birthDate: consent.birthDate,
      });
      user = await loadUser(createdUser.id);
      if (!user) {
        throw new MobileNativeOAuthError("signup_failed", "계정을 만들지 못했습니다.", 500);
      }
    } catch (e) {
      if (e instanceof MobileNativeOAuthError) throw e;
      throw new MobileNativeOAuthError(
        "signup_failed",
        e instanceof Error ? e.message : "계정을 만들지 못했습니다.",
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
    if (input.provider === "line") {
      await persistEncryptedOAuthAccount({
        provider: "line",
        userId: user.id,
        sub: profile.sub,
        email: profile.email,
        name: profile.name,
        image: profile.image,
        accessToken: input.accessToken,
      });
    } else {
      await linkNaverAccount(user.id, profile, input.accessToken);
    }
  }

  if (profile.email && !user.emailVerified) {
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
