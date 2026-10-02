"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { after } from "next/server";
import { db } from "@/lib/db";
import { ACCOUNT_SUSPENDED_SIGNUP_MESSAGE } from "@/lib/account-status";
import { findRestrictedIdentityUser } from "@/lib/ban-evasion";
import {
  getAppBaseUrl,
  resetTokenIdentifier,
  verifyTokenIdentifier,
  verifyCodeIdentifier,
  resetCodeIdentifier,
  authCodeIdentifier,
  generateEmailCode,
  scopedAuthCodeToken,
} from "@/lib/auth-tokens";
import {
  sendPasswordResetEmail,
  sendAuthCodeEmail,
  isEmailConfigured,
  getResendAccountHint,
} from "@/lib/email";
import { isLocale, normalizeLocale } from "@/lib/i18n/config";
import {
  resolveUserByEmail,
  isEmailVerified,
  dedupeUnverifiedEmailAccounts,
  ensureUsernameFreeForSignup,
  signupBlockMessage,
  findUserByUsernameInsensitive,
  releaseUsernameFromStaleAccount,
  collapseUnverifiedEmailRows,
  updateUserByResolvedEmail,
} from "@/lib/signup-user-resolve";
import {
  FORBIDDEN_ADMIN_SEQUENCE_MESSAGE,
  validateUsernameAndName,
} from "@/lib/forbidden-admin-sequence";
import {
  checkEmailSendRateLimit,
  recordEmailSendRateLimit,
  checkLoginRateLimit,
  recordLoginAttempt,
} from "@/lib/auth-rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import { canRecoverAccount } from "@/lib/account-deletion";
import { createHumanChallenge, verifyHumanChallengeAnswer } from "@/lib/human-challenge";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { isSignupHumanVerifyRequired } from "@/lib/turnstile-signup";
import { APT_DEFAULT_FLOOR, APT_LOBBY_FLOOR, APT_TOTAL_FLOORS } from "@/lib/apt/constants";
import { findCountry } from "@/lib/apt/world/world-countries";
import {
  pickAvailableSignupFloor,
  tryResolvePrecheckedSignupFloor,
} from "@/actions/apt";
import { RESERVED_USERNAMES } from "@/lib/username-policy";
import { normalizeTimeZone } from "@/lib/i18n/timezone";
import { assertCountrySelectable } from "@/lib/compliance/ofac-sanctioned-countries";
import { parseBirthDateInput } from "@/lib/birth-date";
import { birthDateCollectionMeta } from "@/lib/age-policy";
import { z } from "zod";

const birthDateSignupFields = {
  birthYear: z.coerce.number().int().min(1900).max(new Date().getFullYear()),
  birthMonth: z.coerce.number().int().min(1).max(12),
  birthDay: z.coerce.number().int().min(1).max(31),
};

function parseSignupBirthDate(data: {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
}): { birthDate: Date } | { error: string } {
  const birthDate = parseBirthDateInput(data.birthYear, data.birthMonth, data.birthDay);
  if (!birthDate) {
    return { error: "actions.shi8acd" };
  }
  return { birthDate };
}

const localeField = z.string().refine((v) => isLocale(v), "Invalid locale").default("ko");

const signupApplicationSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/)
    .transform((s) => s.trim().toLowerCase()),
  password: z.string().min(8),
  name: z.string().optional(),
  locale: localeField,
  countryCode: z.string().min(2).max(8).default("KR"),
  timeZone: z.string().min(1).max(64).default("UTC"),
  homeFloor: z.coerce.number().int().min(APT_LOBBY_FLOOR).max(APT_TOTAL_FLOORS).optional(),
  website: z.string().optional(),
  ...birthDateSignupFields,
});

const registerSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/)
    .transform((s) => s.trim().toLowerCase()),
  password: z.string().min(8),
  name: z.string().optional(),
  locale: localeField,
  countryCode: z.string().min(2).max(8).default("KR"),
  timeZone: z.string().min(1).max(64).default("UTC"),
  homeFloor: z.coerce.number().int().min(APT_LOBBY_FLOOR).max(APT_TOTAL_FLOORS).optional(),
  turnstileToken: z.string().optional(),
  /** 클라이언트 Turnstile 위젯 로드 실패 시 true */
  turnstileUnavailable: z.boolean().optional(),
  /** 1단계에서 이미 가용성 검사 완료 */
  availabilityPrechecked: z.boolean().optional(),
  /** 자체 퀴즈(회원가입 2단계) */
  humanChallengeToken: z.string().optional(),
  humanChallengeAnswer: z.string().optional(),
  /** 봇 허니팟 — 값이 있으면 거부 */
  website: z.string().optional(),
  ...birthDateSignupFields,
});

const PLATFORM_USERNAME = "mocomo_official";
/** 회원가입 해시 — 12보다 빠르고 충분히 안전 */
const SIGNUP_BCRYPT_ROUNDS = 10;

async function saveSignupAuthCode(email: string, code: string, hours = 24) {
  const expires = new Date(Date.now() + hours * 60 * 60 * 1000);
  const normalized = email.trim().toLowerCase();
  const authId = authCodeIdentifier(normalized);
  const codeToken = scopedAuthCodeToken(normalized, code);

  await db.verificationToken.deleteMany({
    where: { identifier: { in: authCodeIdentifiers(normalized) } },
  });
  await db.verificationToken.create({
    data: { identifier: authId, token: codeToken, expires },
  });
}

function authCodeIdentifiers(email: string) {
  const normalized = email.trim().toLowerCase();
  return [
    authCodeIdentifier(normalized),
    verifyCodeIdentifier(normalized),
    resetCodeIdentifier(normalized),
  ];
}

async function findAuthCodeRecord(email: string, code: string) {
  const normalized = email.trim().toLowerCase();
  const trimmed = code.trim();
  const scoped = scopedAuthCodeToken(normalized, trimmed);
  return db.verificationToken.findFirst({
    where: {
      identifier: { in: authCodeIdentifiers(normalized) },
      OR: [{ token: trimmed }, { token: scoped }],
    },
  });
}

/** Unified: signup verify + password reset — send 6-digit code */
export async function sendEmailAuthCode(
  email: string,
  mode: "signup" | "reset" = "signup",
  turnstileToken?: string,
  widgetUnavailable?: boolean
) {
  const normalized = email.trim().toLowerCase();

  const botCheck = await verifyTurnstileToken(turnstileToken, { widgetUnavailable });
  if (!botCheck.ok) return { error: botCheck.error };

  const ip = await getRequestIp();
  const rate = await checkEmailSendRateLimit(normalized, ip);
  if (!rate.ok) return { error: rate.error };

  const user = await resolveUserByEmail(normalized);

  if (!user) {
    if (mode === "reset") {
      return { error: "auth.unregisteredEmail", code: "EMAIL_NOT_REGISTERED" as const };
    }
    return {
      success: true,
      message: t("actions.s1txdvz8"),
    };
  }

  if (mode === "signup" && user.emailVerified) {
    return { error: "actions.s13hrg1m" };
  }

  if (!isEmailConfigured()) {
    return { error: "actions.resend_api_key" };
  }

  const code = generateEmailCode();
  const hours = mode === "reset" ? 1 : 24;
  const expires = new Date(Date.now() + hours * 60 * 60 * 1000);
  const authId = authCodeIdentifier(normalized);

  await db.verificationToken.deleteMany({
    where: { identifier: { in: authCodeIdentifiers(normalized) } },
  });
  await db.verificationToken.create({
    data: { identifier: authId, token: scopedAuthCodeToken(normalized, code), expires },
  });

  const sent = await sendAuthCodeEmail(normalized, code, mode);
  if (!sent.ok) {
    await db.verificationToken.deleteMany({ where: { identifier: authId } });
    return { error: sent.error ?? t("actions.s1yyw7k2") };
  }

  await recordEmailSendRateLimit(normalized, ip);

  return {
    success: true,
    message:
      mode === "reset"
        ? t("actions.s14suv9m")
        : t("actions.s668d1e"),
  };
}

export async function verifyAuthCodeOnly(email: string, code: string) {
  const record = await findAuthCodeRecord(email, code);
  if (!record || record.expires < new Date()) {
    return { error: "actions.su23yec" };
  }
  return { success: true };
}

async function findUserIdByEmailFast(normalized: string) {
  const select = { id: true, emailVerified: true } as const;
  let user = await db.user.findUnique({ where: { email: normalized }, select });
  if (!user) {
    user = await db.user.findFirst({
      where: { email: { equals: normalized, mode: "insensitive" } },
      select,
    });
  }
  return user;
}

export async function completeAuthWithCode(
  email: string,
  code: string,
  options: { mode: "signup" | "reset"; newPassword?: string }
) {
  const normalized = email.trim().toLowerCase();
  const record = await findAuthCodeRecord(normalized, code);
  if (!record || record.expires < new Date()) {
    return { error: "actions.su23yec" };
  }

  const user = await findUserIdByEmailFast(normalized);
  if (!user) {
    return { error: "auth.unregisteredEmail", code: "EMAIL_NOT_REGISTERED" as const };
  }

  const clearTokens = db.verificationToken.deleteMany({
    where: {
      identifier: {
        in: [
          ...authCodeIdentifiers(normalized),
          verifyTokenIdentifier(normalized),
          resetTokenIdentifier(normalized),
        ],
      },
    },
  });

  if (options.mode === "reset") {
    const password = options.newPassword?.trim() ?? "";
    if (password.length < 8) {
      return { error: "auth.passwordMinLength" };
    }
    const passwordHash = await bcrypt.hash(password, SIGNUP_BCRYPT_ROUNDS);
    await Promise.all([
      db.user.update({
        where: { id: user.id },
        data: {
          email: normalized,
          passwordHash,
          emailVerified: user.emailVerified ?? new Date(),
        },
      }),
      clearTokens,
    ]);
  } else {
    await Promise.all([
      db.user.update({
        where: { id: user.id },
        data: { email: normalized, emailVerified: new Date() },
      }),
      clearTokens,
    ]);
    // 가입 완료 시 프로모션 자동 지급
    after(async () => {
      try {
        const { runPromotionTrigger } = await import("@/lib/admin/services/promotions");
        await runPromotionTrigger("ON_SIGNUP", user.id);
      } catch {
        /* ignore */
      }
    });
  }

  return { success: true, mode: options.mode };
}

export async function checkUsernameAvailable(username: string) {
  const normalized = username.trim().toLowerCase();
  if (normalized.length < 3 || !/^[a-zA-Z0-9_]+$/.test(normalized)) {
    return { available: false, error: "actions.3_20" };
  }
  if (!validateUsernameAndName(normalized).ok) {
    return { available: false, error: FORBIDDEN_ADMIN_SEQUENCE_MESSAGE };
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    return { available: false, error: "actions.s1rkgykd" };
  }
  const existing = await findUserByUsernameInsensitive(normalized);
  if (!existing) return { available: true };
  if (existing.deletedAt && existing.scheduledPurgeAt && canRecoverAccount(existing)) {
    return {
      available: false,
      error: "actions.sorrhbr",
    };
  }
  if (!isEmailVerified(existing)) return { available: true, note: t("actions.sa2gtco") };
  return { available: false, error: "actions.s14wxcis" };
}

export async function checkSignupAvailability(email: string, username: string, name?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim().toLowerCase();

  const nameCheck = validateUsernameAndName(normalizedUsername, name);
  if (!nameCheck.ok) {
    return { ok: false, error: nameCheck.error, reason: "forbidden_sequence" as const };
  }

  const restricted = await findRestrictedIdentityUser({ email: normalizedEmail });
  if (restricted) {
    return {
      ok: false,
      error: ACCOUNT_SUSPENDED_SIGNUP_MESSAGE,
      reason: "suspended_identity" as const,
    };
  }

  const user = await resolveUserByEmail(normalizedEmail);
  if (user && isEmailVerified(user)) {
    return { ok: false, error: signupBlockMessage(user), reason: "email_verified" as const };
  }

  if (RESERVED_USERNAMES.has(normalizedUsername)) {
    return { ok: false, error: "actions.s1wkswy1", reason: "username_reserved" as const };
  }

  const taken = await findUserByUsernameInsensitive(normalizedUsername);
  if (taken && taken.id !== user?.id) {
    if (taken.deletedAt && taken.scheduledPurgeAt && canRecoverAccount(taken)) {
      return {
        ok: false,
        error: t("actions.s1u4zbr6", { v0: normalizedUsername }),
        reason: "username_deleted" as const,
      };
    }
    if (isEmailVerified(taken)) {
      return {
        ok: false,
        error: t("actions.s4i34a3", { v0: normalizedUsername }),
        reason: "username_taken" as const,
      };
    }
  }

  return {
    ok: true,
    canResume: !!user && !isEmailVerified(user),
    message: user && !isEmailVerified(user) ? t("actions.s77navn") : undefined,
  };
}

export async function issueSignupHumanChallenge(locale?: string) {
  return createHumanChallenge(locale);
}

/** 가입 1단계: 검증 + 퀴즈를 한 번에 (왕복 1회 절약) */
export async function prepareSignupVerify(data: z.input<typeof signupApplicationSchema>) {
  const validated = await validateSignupApplication(data);
  if (!("ok" in validated) || !validated.ok) return validated;
  return {
    ...validated,
    challenge: createHumanChallenge(data.locale),
  };
}

export async function validateSignupApplication(data: z.input<typeof signupApplicationSchema>) {
  const parsed = signupApplicationSchema.safeParse(data);
  if (!parsed.success) return { error: "actions.s15q8461" };

  const { email: rawEmail, username, name, website, countryCode, homeFloor: preferredFloor } = parsed.data;
  const email = rawEmail.trim().toLowerCase();

  const countryBlock = assertCountrySelectable(countryCode);
  if (countryBlock) return { error: countryBlock.error };

  if (website?.trim()) {
    return { error: "actions.swkz782" };
  }

  const floorPick = await pickAvailableSignupFloor(countryCode, preferredFloor ?? APT_DEFAULT_FLOOR);
  if (!floorPick.ok) return { error: floorPick.error };
  const homeFloor = floorPick.floor;

  if (RESERVED_USERNAMES.has(username)) {
    return { error: "actions.stg06cy" };
  }

  const forbiddenCheck = validateUsernameAndName(username, name);
  if (!forbiddenCheck.ok) return { error: forbiddenCheck.error };

  const availability = await checkSignupAvailability(email, username, name);
  if (!availability.ok) return { error: availability.error };

  if (!isEmailConfigured()) {
    return {
      error: "actions.resend_api_key_vercel",
    };
  }

  return {
    ok: true as const,
    email,
    homeFloor,
    message: availability.message,
    resumed: availability.canResume,
  };
}

export async function registerUser(
  data: z.input<typeof registerSchema>,
  isRetry = false,
  opts?: { channel?: "web" | "mobile" }
) {
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) return { error: "actions.s15q8461" };
  const {
    email: rawEmail,
    username,
    password,
    name,
    locale,
    countryCode,
    timeZone: rawTimeZone,
    homeFloor,
    turnstileToken,
    turnstileUnavailable,
    humanChallengeToken,
    humanChallengeAnswer,
    availabilityPrechecked,
    website,
    birthYear,
    birthMonth,
    birthDay,
  } = parsed.data;
  const email = rawEmail.trim().toLowerCase();
  const timeZone = normalizeTimeZone(rawTimeZone);
  const birthParsed = parseSignupBirthDate({ birthYear, birthMonth, birthDay });
  if ("error" in birthParsed) return { error: birthParsed.error };
  const birthDate = birthParsed.birthDate;

  const countryBlock = assertCountrySelectable(countryCode);
  if (countryBlock) return { error: countryBlock.error };

  if (website?.trim()) {
    return { error: "actions.swkz782" };
  }

  if (opts?.channel !== "mobile" && isSignupHumanVerifyRequired()) {
    const humanCheck = verifyHumanChallengeAnswer(
      humanChallengeToken,
      humanChallengeAnswer,
      locale
    );
    if (!humanCheck.ok) return { error: humanCheck.error };
  } else if (opts?.channel !== "mobile") {
    const botCheck = await verifyTurnstileToken(turnstileToken, {
      widgetUnavailable: turnstileUnavailable || true,
    });
    if (!botCheck.ok) return { error: botCheck.error };
  }

  if (RESERVED_USERNAMES.has(username)) {
    return { error: "actions.stg06cy" };
  }

  const forbiddenCheck = validateUsernameAndName(username, name);
  if (!forbiddenCheck.ok) return { error: forbiddenCheck.error };

  if (!isEmailConfigured()) {
    return {
      error: "actions.resend_api_key_vercel",
    };
  }

  const floorPromise =
    availabilityPrechecked && homeFloor != null
      ? tryResolvePrecheckedSignupFloor(countryCode, homeFloor)
      : pickAvailableSignupFloor(countryCode, homeFloor ?? APT_DEFAULT_FLOOR);

  const [userByEmailInitial, passwordHash, ip, floorPick] = await Promise.all([
    resolveUserByEmail(email),
    bcrypt.hash(password, SIGNUP_BCRYPT_ROUNDS),
    getRequestIp(),
    floorPromise,
  ]);

  if (!floorPick.ok) return { error: floorPick.error };
  const aptFloor = floorPick.floor;

  let userByEmail = userByEmailInitial;

  if (userByEmail && isEmailVerified(userByEmail)) {
    return { error: signupBlockMessage(userByEmail) };
  }

  const [emailRate, availability] = await Promise.all([
    checkEmailSendRateLimit(email, ip),
    availabilityPrechecked
      ? Promise.resolve({ ok: true as const })
      : checkSignupAvailability(email, username, name),
  ]);
  if (!emailRate.ok) return { error: emailRate.error };
  if (!availability.ok) return { error: availability.error };

  if (userByEmail && !isEmailVerified(userByEmail)) {
    const collapsedId = await collapseUnverifiedEmailRows(email);
    if (collapsedId && collapsedId !== userByEmail.id) {
      userByEmail = await db.user.findUnique({
        where: { id: collapsedId },
        select: {
          id: true,
          email: true,
          username: true,
          emailVerified: true,
          passwordHash: true,
          role: true,
          deletedAt: true,
          scheduledPurgeAt: true,
        },
      });
    }
  }

  const usernameCheck = await ensureUsernameFreeForSignup(
    username,
    email,
    userByEmail?.id,
    PLATFORM_USERNAME
  );
  if (!usernameCheck.ok) return { error: usernameCheck.error };

  try {
    let userId: string;

    const isResume = !!userByEmail && !isEmailVerified(userByEmail);

    if (isResume && userByEmail) {
      await dedupeUnverifiedEmailAccounts(email, userByEmail.id);
      const updated = await db.user.update({
        where: { id: userByEmail.id },
        data: {
          email,
          username,
          passwordHash,
          name: name || username,
          emailVerified: null,
          locale,
          countryCode: countryCode.toUpperCase(),
          timeZone,
          birthDate,
          ...birthDateCollectionMeta("SIGNUP"),
        },
      });
      userId = updated.id;
    } else {
      const user = await db.user.create({
        data: {
          email,
          username,
          passwordHash,
          name: name || username,
          role: "USER",
          emailVerified: null,
          locale,
          countryCode: countryCode.toUpperCase(),
          timeZone,
          birthDate,
          ...birthDateCollectionMeta("SIGNUP"),
        },
      });
      userId = user.id;
    }

    const code = generateEmailCode();
    await saveSignupAuthCode(email, code);

    const country = findCountry(countryCode) ?? findCountry("KR")!;
    const [sent] = await Promise.all([
      sendAuthCodeEmail(email, code, "signup"),
      db.aptProfile.upsert({
        where: { userId },
        create: {
          userId,
          housingType: "apartment",
          countryCode: countryCode.toUpperCase(),
          homeFloor: aptFloor,
          latitude: country.lat,
          longitude: country.lng,
          regionLabel: `${country.nameKo} APT`,
          moveInCompletedAt: new Date(),
        },
        update: {
          countryCode: countryCode.toUpperCase(),
          homeFloor: aptFloor,
          latitude: country.lat,
          longitude: country.lng,
          regionLabel: `${country.nameKo} APT`,
          moveInCompletedAt: new Date(),
        },
      }),
    ]);

    if (!sent.ok) {
      if (!isResume) {
        await Promise.all([
          db.user.delete({ where: { id: userId } }).catch(() => undefined),
          db.aptProfile.delete({ where: { userId } }).catch(() => undefined),
        ]);
      }
      return { error: sent.error ?? t("actions.s1j9c1k2") };
    }

    await recordEmailSendRateLimit(email, ip);

    // New email signups must set a profile icon after verify (existing accounts without image are ignored).
    try {
      const { markSignupNeedsAvatar } = await import("@/actions/avatar-onboarding");
      await markSignupNeedsAvatar();
    } catch {
      /* cookie optional during non-request contexts */
    }

    return {
      success: true,
      userId,
      needsVerification: true,
      email,
      resumed: isResume,
      message: isResume
        ? t("actions.s17x6b0p")
        : undefined,
    };
  } catch (e) {
    console.error("[registerUser]", e);
    const prismaCode =
      e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    const target =
      e && typeof e === "object" && "meta" in e && e.meta && typeof e.meta === "object"
        ? (e.meta as { target?: string | string[] }).target
        : undefined;
    const fields = Array.isArray(target) ? target : target ? [String(target)] : [];

    if (prismaCode === "P2002") {
      const existing = await resolveUserByEmail(email);
      if (existing && isEmailVerified(existing)) {
        return { error: signupBlockMessage(existing) };
      }
      if (existing && !isEmailVerified(existing) && !isRetry) {
        return registerUser(data, true);
      }

      const takenName = await findUserByUsernameInsensitive(username);
      if (takenName && isEmailVerified(takenName)) {
        return {
          error: t("actions.s13hayts", { v0: username }),
        };
      }
      if (takenName && !isEmailVerified(takenName) && !isRetry) {
        await releaseUsernameFromStaleAccount(takenName, email, PLATFORM_USERNAME);
        return registerUser(data, true);
      }

      if (fields.some((f) => f.includes("email"))) {
        return {
          error: "actions.s1d964i5",
        };
      }
      if (fields.some((f) => f.includes("username"))) {
        return {
          error: t("actions.s13hayts", { v0: username }),
        };
      }
      if (!isRetry) {
        return registerUser(data, true);
      }
    }

    const msg =
      e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "";
    if (prismaCode === "P1001" || prismaCode === "P1017" || /connect|timeout/i.test(msg)) {
      return {
        error: "actions.vercel_database_url_direct_url",
      };
    }

    return {
      error: "actions.s1c1tzul",
    };
  }
}

export async function verifyEmail(data: { email: string; token: string }) {
  const email = data.email.trim().toLowerCase();
  const verifyId = verifyTokenIdentifier(email);

  const record = await db.verificationToken.findFirst({
    where: { identifier: verifyId, token: data.token },
  });
  if (!record || record.expires < new Date()) {
    return { error: "actions.s1jv9gnl" };
  }

  const user = await resolveUserByEmail(email);
  if (!user) return { error: "actions.s1hwfc9a" };

  await updateUserByResolvedEmail(email, { emailVerified: new Date() });
  await db.verificationToken.deleteMany({
    where: {
      identifier: { in: [verifyId, verifyCodeIdentifier(email)] },
    },
  });

  return { success: true };
}

export async function verifyEmailByCode(email: string, code: string) {
  const normalized = email.trim().toLowerCase();
  return completeAuthWithCode(normalized, code, { mode: "signup" });
}

export async function resendVerificationEmail(email: string, turnstileToken?: string) {
  return sendEmailAuthCode(email, "signup", turnstileToken);
}

export async function preLoginCheck(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const ip = await getRequestIp();
  const rate = await checkLoginRateLimit(normalized, ip);
  if (!rate.ok) {
    return { ok: false, error: "RATE_LIMIT" as const, message: rate.error };
  }

  const user = await resolveUserByEmail(normalized);
  if (!user?.passwordHash) {
    await recordLoginAttempt(normalized, ip);
    return { ok: false, error: "INVALID" as const };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await recordLoginAttempt(normalized, ip);
    return { ok: false, error: "INVALID" as const };
  }

  if (!user.emailVerified) {
    return { ok: false, error: "EMAIL_NOT_VERIFIED" as const };
  }

  return { ok: true };
}

export async function resetPasswordRequest(email: string, turnstileToken?: string) {
  return sendEmailAuthCode(email, "reset", turnstileToken);
}

export async function resetPasswordConfirm(data: {
  email: string;
  token: string;
  password: string;
}) {
  const email = data.email.trim().toLowerCase();
  const resetId = resetTokenIdentifier(email);
  const { token, password } = data;

  if (password.length < 8) return { error: "auth.passwordMinLength" };

  const record = await db.verificationToken.findFirst({
    where: { identifier: resetId, token },
  });
  if (!record || record.expires < new Date()) {
    return { error: "actions.s8x5m9m" };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const updated = await updateUserByResolvedEmail(email, { passwordHash });
  if (!updated) return { error: "actions.s1hwfc9a" };
  await db.verificationToken.deleteMany({
    where: {
      identifier: { in: [resetId, resetCodeIdentifier(email)] },
    },
  });

  return { success: true };
}

export async function verifyResetCode(email: string, code: string) {
  return verifyAuthCodeOnly(email, code);
}

export async function resetPasswordByCode(email: string, code: string, password: string) {
  return completeAuthWithCode(email, code, { mode: "reset", newPassword: password });
}
