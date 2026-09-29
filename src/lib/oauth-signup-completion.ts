import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { ACCOUNT_SUSPENDED_SIGNUP_MESSAGE } from "@/lib/account-status";
import { findRestrictedIdentityUser } from "@/lib/ban-evasion";
import { parseBirthDateInput } from "@/lib/birth-date";
import { birthDateCollectionMeta } from "@/lib/age-policy";
import { isOAuthEncryptionConfigured } from "@/lib/encryption";
import {
  FORBIDDEN_ADMIN_SEQUENCE_MESSAGE,
  validateUsernameAndName,
} from "@/lib/forbidden-admin-sequence";
import { generateUniqueUsername } from "@/lib/oauth-username";
import { persistEncryptedOAuthAccount } from "@/lib/oauth-vault";
import { findUserByUsernameInsensitive } from "@/lib/signup-user-resolve";
import {
  RESERVED_USERNAMES,
  isValidUsername,
  normalizeUsername,
} from "@/lib/username-policy";

const OAUTH_SIGNUP_BCRYPT_ROUNDS = 10;

export type OAuthSignupProvider = "google" | "discord" | "twitter" | "line" | "naver";

export type OAuthSignupProfile = {
  email: string | null;
  name: string | null;
  image: string | null;
};

export const oauthSignupConsentFields = {
  birthYear: z.coerce.number().int().min(1900).max(new Date().getFullYear()),
  birthMonth: z.coerce.number().int().min(1).max(12),
  birthDay: z.coerce.number().int().min(1).max(31),
  termsAccepted: z.literal(true),
  privacyAccepted: z.literal(true),
};

export const oauthSignupConsentSchema = z.object(oauthSignupConsentFields);

export type OAuthSignupConsentInput = z.infer<typeof oauthSignupConsentSchema>;

export function parseOAuthSignupCompletion(
  input: unknown
): { ok: true; birthDate: Date } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "생년월일과 이용 동의가 필요합니다." };
  }
  const raw = input as Record<string, unknown>;
  if (raw.termsAccepted !== true) {
    return { ok: false, error: "이용약관에 동의해 주세요." };
  }
  if (raw.privacyAccepted !== true) {
    return { ok: false, error: "개인정보 처리방침에 동의해 주세요." };
  }

  const parsed = oauthSignupConsentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "올바른 생년월일을 입력해 주세요." };
  }

  const birthDate = parseBirthDateInput(
    parsed.data.birthYear,
    parsed.data.birthMonth,
    parsed.data.birthDay
  );
  if (!birthDate) {
    return { ok: false, error: "올바른 생년월일을 입력해 주세요." };
  }
  return { ok: true, birthDate };
}

const CREATED_USER_SELECT = {
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
} as const;

export type CreatedOAuthUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  email: string | null;
  locale: string;
  countryCode: string;
  timeZone: string;
  role: import("@prisma/client").UserRole;
  premiumTier: import("@prisma/client").PremiumTier;
  supportTierSent: import("@prisma/client").SupportTierLevel;
  earnedMocoTier: import("@prisma/client").SupportTierLevel;
  isBanned: boolean;
  accountStatus: import("@prisma/client").AccountStatus;
};

export async function createOAuthUserWithConsent(opts: {
  profile: OAuthSignupProfile;
  birthDate: Date;
  username?: string;
  name?: string;
  password?: string;
}): Promise<CreatedOAuthUser> {
  if (opts.profile.email) {
    const restricted = await findRestrictedIdentityUser({ email: opts.profile.email });
    if (restricted) {
      throw new Error(ACCOUNT_SUSPENDED_SIGNUP_MESSAGE);
    }
  }

  let username: string;
  if (opts.username?.trim()) {
    const normalized = normalizeUsername(opts.username);
    if (!isValidUsername(normalized)) {
      throw new Error("아이디는 영문·숫자·_ 3~20자입니다.");
    }
    if (RESERVED_USERNAMES.has(normalized)) {
      throw new Error("사용할 수 없는 아이디입니다.");
    }
    const taken = await findUserByUsernameInsensitive(normalized);
    if (taken) {
      throw new Error(`@${normalized} 아이디는 이미 사용 중입니다.`);
    }
    username = normalized;
  } else {
    username = await generateUniqueUsername(opts.profile.email ?? opts.profile.name ?? "user");
  }

  const displayName = opts.name?.trim() || opts.profile.name?.trim() || username;
  if (!validateUsernameAndName(username, displayName).ok) {
    throw new Error(FORBIDDEN_ADMIN_SEQUENCE_MESSAGE);
  }

  const password = opts.password?.trim() ?? "";
  if (password && password.length < 8) {
    throw new Error("비밀번호는 8자 이상이어야 합니다.");
  }
  const passwordHash = password
    ? await bcrypt.hash(password, OAUTH_SIGNUP_BCRYPT_ROUNDS)
    : undefined;

  return db.user.create({
    data: {
      email: opts.profile.email,
      emailVerified: opts.profile.email ? new Date() : null,
      name: displayName,
      image: opts.profile.image,
      username,
      ...(passwordHash ? { passwordHash } : {}),
      birthDate: opts.birthDate,
      ...birthDateCollectionMeta("OAUTH_COMPLETE"),
      profile: { create: {} },
      otakuProfile: { create: {} },
    },
    select: CREATED_USER_SELECT,
  }) as Promise<CreatedOAuthUser>;
}

export async function applyBirthDateIfMissing(userId: string, birthDate: Date): Promise<void> {
  await db.user.updateMany({
    where: { id: userId, birthDate: null },
    data: {
      birthDate,
      ...birthDateCollectionMeta("OAUTH_COMPLETE"),
    },
  });
}

export async function linkOAuthSignupAccount(opts: {
  provider: OAuthSignupProvider;
  sub: string;
  userId: string;
  profile: OAuthSignupProfile;
}): Promise<void> {
  if (opts.provider === "naver") {
    const existing = await db.account.findFirst({
      where: { provider: "naver", providerAccountId: opts.sub },
      select: { id: true },
    });
    if (!existing) {
      await db.account.create({
        data: {
          userId: opts.userId,
          type: "oauth",
          provider: "naver",
          providerAccountId: opts.sub,
        },
      });
    }
    return;
  }

  if (!isOAuthEncryptionConfigured()) {
    throw new Error("OAuth 설정이 되어 있지 않습니다.");
  }

  await persistEncryptedOAuthAccount({
    provider: opts.provider,
    userId: opts.userId,
    sub: opts.sub,
    email: opts.profile.email,
    name: opts.profile.name,
    image: opts.profile.image,
  });
}
