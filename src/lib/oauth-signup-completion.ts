import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { ACCOUNT_SUSPENDED_SIGNUP_MESSAGE } from "@/lib/account-status";
import { findRestrictedIdentityUser } from "@/lib/ban-evasion";
import { parseBirthDateInput, toStoredBirthDate } from "@/lib/birth-date";
import { birthDateCollectionMeta } from "@/lib/age-policy";
import { recordBirthDateChange } from "@/lib/birth-date-change-log";
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
    return { ok: false, error: "Birth date and terms agreement are required." };
  }
  const raw = input as Record<string, unknown>;
  if (raw.termsAccepted !== true) {
    return { ok: false, error: "Please agree to the Terms of Service." };
  }
  if (raw.privacyAccepted !== true) {
    return { ok: false, error: "Please agree to the Privacy Policy." };
  }

  const parsed = oauthSignupConsentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid birth date." };
  }

  const birthDate = parseBirthDateInput(
    parsed.data.birthYear,
    parsed.data.birthMonth,
    parsed.data.birthDay
  );
  if (!birthDate) {
    return { ok: false, error: "Enter a valid birth date." };
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
  signupIp?: string | null;
  signupChannel?: string;
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
      throw new Error("Username must be 3–20 letters, numbers, or underscores.");
    }
    if (RESERVED_USERNAMES.has(normalized)) {
      throw new Error("This username isn't available.");
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
    throw new Error("Password must be at least 8 characters.");
  }
  const passwordHash = password
    ? await bcrypt.hash(password, OAUTH_SIGNUP_BCRYPT_ROUNDS)
    : undefined;

  const signupIp = opts.signupIp?.trim() || null;
  const storedBirth = toStoredBirthDate(opts.birthDate);
  const collected = birthDateCollectionMeta("OAUTH_COMPLETE");
  const user = (await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: opts.profile.email,
        emailVerified: opts.profile.email ? new Date() : null,
        name: displayName,
        image: opts.profile.image,
        username,
        ...(passwordHash ? { passwordHash } : {}),
        birthDate: storedBirth,
        ...collected,
        signupIp,
        signupIpAt: signupIp ? new Date() : null,
        profile: { create: {} },
        otakuProfile: { create: {} },
      },
      select: CREATED_USER_SELECT,
    });
    await recordBirthDateChange(tx, {
      userId: created.id,
      previousValue: null,
      newValue: storedBirth,
      source: "OAUTH_COMPLETE",
      createdAt: collected.birthDateCollectedAt,
    });
    return created;
  })) as CreatedOAuthUser;

  if (signupIp) {
    await db.userSignupIpLog.create({
      data: {
        userId: user.id,
        ip: signupIp,
        channel: opts.signupChannel ?? "web",
      },
    });
  }

  return user;
}

export async function applyBirthDateIfMissing(userId: string, birthDate: Date): Promise<void> {
  const storedBirth = toStoredBirthDate(birthDate);
  const collected = birthDateCollectionMeta("OAUTH_COMPLETE");
  await db.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id: userId, birthDate: null },
      data: {
        birthDate: storedBirth,
        ...collected,
      },
    });
    if (updated.count === 0) return;
    await recordBirthDateChange(tx, {
      userId,
      previousValue: null,
      newValue: storedBirth,
      source: "OAUTH_COMPLETE",
      createdAt: collected.birthDateCollectedAt,
    });
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
    throw new Error("OAuth isn't configured.");
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
