"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
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
import { z } from "zod";
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
  checkLoginRateLimit,
  recordLoginAttempt,
} from "@/lib/auth-rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import { createHumanChallenge, verifyHumanChallengeAnswer } from "@/lib/human-challenge";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { isSignupHumanVerifyRequired } from "@/lib/turnstile-signup";
import { APT_LOBBY_FLOOR, APT_TOTAL_FLOORS } from "@/lib/apt/constants";
import { findCountry } from "@/lib/apt/world/world-countries";
import { checkFloorAvailableForSignup } from "@/actions/apt";

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
  locale: z.enum(["ko", "en", "ja", "zh"]).default("ko"),
  countryCode: z.string().min(2).max(8).default("KR"),
  homeFloor: z.coerce.number().int().min(APT_LOBBY_FLOOR).max(APT_TOTAL_FLOORS),
  website: z.string().optional(),
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
  locale: z.enum(["ko", "en", "ja", "zh"]).default("ko"),
  countryCode: z.string().min(2).max(8).default("KR"),
  homeFloor: z.coerce.number().int().min(APT_LOBBY_FLOOR).max(APT_TOTAL_FLOORS),
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
});

const RESERVED_USERNAMES = new Set([
  "mocomo",
  "mocomo_official",
  "admin",
  "administrator",
  "support",
  "official",
  "system",
  "root",
  "help",
]);

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
      return { error: "등록되지 않은 이메일입니다.", code: "EMAIL_NOT_REGISTERED" as const };
    }
    return {
      success: true,
      message: "등록된 이메일이면 인증 코드를 보냈습니다. (스팸함도 확인해 주세요)",
    };
  }

  if (mode === "signup" && user.emailVerified) {
    return { error: "이미 인증된 계정입니다. 로그인하거나 비밀번호 찾기를 이용하세요." };
  }

  if (!isEmailConfigured()) {
    return { error: "이메일 발송 설정(RESEND_API_KEY)이 없습니다." };
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
    return { error: sent.error ?? "인증 코드 발송 실패" };
  }

  return {
    success: true,
    message:
      mode === "reset"
        ? "이메일로 6자리 인증 코드를 보냈습니다. 코드 확인 후 새 비밀번호를 설정하세요."
        : "이메일로 6자리 인증 코드를 보냈습니다. 코드 확인 후 가입 비밀번호로 로그인하세요.",
  };
}

export async function verifyAuthCodeOnly(email: string, code: string) {
  const record = await findAuthCodeRecord(email, code);
  if (!record || record.expires < new Date()) {
    return { error: "인증 코드가 올바르지 않거나 만료되었습니다." };
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
    return { error: "인증 코드가 올바르지 않거나 만료되었습니다." };
  }

  const user = await findUserIdByEmailFast(normalized);
  if (!user) {
    return { error: "등록되지 않은 이메일입니다.", code: "EMAIL_NOT_REGISTERED" as const };
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
      return { error: "비밀번호는 8자 이상이어야 합니다." };
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
  }

  return { success: true, mode: options.mode };
}

export async function checkUsernameAvailable(username: string) {
  const normalized = username.trim().toLowerCase();
  if (normalized.length < 3 || !/^[a-zA-Z0-9_]+$/.test(normalized)) {
    return { available: false, error: "닉네임은 영문·숫자·_ 3~20자입니다." };
  }
  if (!validateUsernameAndName(normalized).ok) {
    return { available: false, error: FORBIDDEN_ADMIN_SEQUENCE_MESSAGE };
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    return { available: false, error: "예약된 닉네임입니다." };
  }
  const existing = await findUserByUsernameInsensitive(normalized);
  if (!existing) return { available: true };
  if (!isEmailVerified(existing)) return { available: true, note: "미인증 계정 닉네임 — 가입 시 자동 해제됩니다." };
  return { available: false, error: "이미 사용 중인 닉네임입니다." };
}

export async function checkSignupAvailability(email: string, username: string, name?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim().toLowerCase();

  const nameCheck = validateUsernameAndName(normalizedUsername, name);
  if (!nameCheck.ok) {
    return { ok: false, error: nameCheck.error, reason: "forbidden_sequence" as const };
  }

  const user = await resolveUserByEmail(normalizedEmail);
  if (user && isEmailVerified(user)) {
    return { ok: false, error: signupBlockMessage(user), reason: "email_verified" as const };
  }

  if (RESERVED_USERNAMES.has(normalizedUsername)) {
    return { ok: false, error: "사용할 수 없는 닉네임입니다.", reason: "username_reserved" as const };
  }

  const taken = await findUserByUsernameInsensitive(normalizedUsername);
  if (taken && taken.id !== user?.id && isEmailVerified(taken)) {
    return {
      ok: false,
      error: `닉네임 "${normalizedUsername}"은(는) 이미 사용 중입니다.`,
      reason: "username_taken" as const,
    };
  }

  return {
    ok: true,
    canResume: !!user && !isEmailVerified(user),
    message: user && !isEmailVerified(user) ? "인증 미완료 계정 — 가입을 이어서 진행합니다." : undefined,
  };
}

export async function issueSignupHumanChallenge() {
  return createHumanChallenge();
}

/** 가입 1단계: 검증 + 퀴즈를 한 번에 (왕복 1회 절약) */
export async function prepareSignupVerify(data: z.infer<typeof signupApplicationSchema>) {
  const validated = await validateSignupApplication(data);
  if (!("ok" in validated) || !validated.ok) return validated;
  return {
    ...validated,
    challenge: createHumanChallenge(),
  };
}

export async function validateSignupApplication(data: z.infer<typeof signupApplicationSchema>) {
  const parsed = signupApplicationSchema.safeParse(data);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };

  const { email: rawEmail, username, name, website, countryCode, homeFloor } = parsed.data;
  const email = rawEmail.trim().toLowerCase();

  if (website?.trim()) {
    return { error: "요청을 처리할 수 없습니다." };
  }

  const floorCheck = await checkFloorAvailableForSignup(countryCode, homeFloor);
  if (!floorCheck.ok) return { error: floorCheck.error };

  if (RESERVED_USERNAMES.has(username)) {
    return { error: "사용할 수 없는 닉네임입니다. 다른 닉네임을 입력해 주세요." };
  }

  const forbiddenCheck = validateUsernameAndName(username, name);
  if (!forbiddenCheck.ok) return { error: forbiddenCheck.error };

  const availability = await checkSignupAvailability(email, username, name);
  if (!availability.ok) return { error: availability.error };

  if (!isEmailConfigured()) {
    return {
      error:
        "이메일 발송 설정(RESEND_API_KEY)이 없어 회원가입을 완료할 수 없습니다. Vercel 환경 변수를 확인하세요.",
    };
  }

  return {
    ok: true as const,
    email,
    message: availability.message,
    resumed: availability.canResume,
  };
}

export async function registerUser(
  data: z.infer<typeof registerSchema>,
  isRetry = false
) {
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };
  const {
    email: rawEmail,
    username,
    password,
    name,
    locale,
    countryCode,
    homeFloor,
    turnstileToken,
    turnstileUnavailable,
    humanChallengeToken,
    humanChallengeAnswer,
    availabilityPrechecked,
    website,
  } = parsed.data;
  const email = rawEmail.trim().toLowerCase();

  if (website?.trim()) {
    return { error: "요청을 처리할 수 없습니다." };
  }

  if (isSignupHumanVerifyRequired()) {
    const humanCheck = verifyHumanChallengeAnswer(humanChallengeToken, humanChallengeAnswer);
    if (!humanCheck.ok) return { error: humanCheck.error };
  } else {
    const botCheck = await verifyTurnstileToken(turnstileToken, {
      widgetUnavailable: turnstileUnavailable || true,
    });
    if (!botCheck.ok) return { error: botCheck.error };
  }

  if (RESERVED_USERNAMES.has(username)) {
    return { error: "사용할 수 없는 닉네임입니다. 다른 닉네임을 입력해 주세요." };
  }

  const forbiddenCheck = validateUsernameAndName(username, name);
  if (!forbiddenCheck.ok) return { error: forbiddenCheck.error };

  if (!isEmailConfigured()) {
    return {
      error:
        "이메일 발송 설정(RESEND_API_KEY)이 없어 회원가입을 완료할 수 없습니다. Vercel 환경 변수를 확인하세요.",
    };
  }

  const [userByEmailInitial, passwordHash, ip] = await Promise.all([
    resolveUserByEmail(email),
    bcrypt.hash(password, SIGNUP_BCRYPT_ROUNDS),
    getRequestIp(),
  ]);

  const emailRate = await checkEmailSendRateLimit(email, ip);
  if (!emailRate.ok) return { error: emailRate.error };

  let userByEmail = userByEmailInitial;

  if (userByEmail && isEmailVerified(userByEmail)) {
    return { error: signupBlockMessage(userByEmail) };
  }

  if (!availabilityPrechecked) {
    const availability = await checkSignupAvailability(email, username, name);
    if (!availability.ok) return { error: availability.error };
  }

  const floorCheck = await checkFloorAvailableForSignup(countryCode, homeFloor);
  if (!floorCheck.ok) return { error: floorCheck.error };

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
        },
      });
      userId = user.id;
    }

    const code = generateEmailCode();
    await saveSignupAuthCode(email, code);

    const sent = await sendAuthCodeEmail(email, code, "signup");

    if (!sent.ok) {
      if (!isResume) {
        await db.user.delete({ where: { id: userId } }).catch(() => undefined);
      }
      return { error: sent.error ?? "인증 메일 발송 실패" };
    }

    const country = findCountry(countryCode) ?? findCountry("KR")!;
    const aptFloor = floorCheck.floor;
    await db.aptProfile.upsert({
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
    });

    return {
      success: true,
      userId,
      needsVerification: true,
      email,
      resumed: isResume,
      message: isResume
        ? "인증이 완료되지 않은 계정입니다. 인증 코드를 다시 보냈습니다."
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
          error: `닉네임 "${username}"은(는) 이미 사용 중입니다. 다른 닉네임을 입력해 주세요.`,
        };
      }
      if (takenName && !isEmailVerified(takenName) && !isRetry) {
        await releaseUsernameFromStaleAccount(takenName, email, PLATFORM_USERNAME);
        return registerUser(data, true);
      }

      if (fields.some((f) => f.includes("email"))) {
        return {
          error:
            "이 이메일은 이미 등록되어 있습니다. 로그인하거나 비밀번호 찾기를 이용하세요. (배포 반영 후에도 동일하면 문의해 주세요.)",
        };
      }
      if (fields.some((f) => f.includes("username"))) {
        return {
          error: `닉네임 "${username}"은(는) 이미 사용 중입니다. 다른 닉네임을 입력해 주세요.`,
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
        error:
          "데이터베이스에 연결하지 못했습니다. Vercel의 DATABASE_URL·DIRECT_URL을 확인한 뒤 잠시 후 다시 시도해 주세요.",
      };
    }

    return {
      error: "회원가입 저장에 실패했습니다. 잠시 후 다시 시도해 주세요. 계속되면 다른 닉네임으로 시도해 보세요.",
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
    return { error: "만료되었거나 유효하지 않은 인증 링크입니다." };
  }

  const user = await resolveUserByEmail(email);
  if (!user) return { error: "계정을 찾을 수 없습니다." };

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

  if (password.length < 8) return { error: "비밀번호는 8자 이상이어야 합니다." };

  const record = await db.verificationToken.findFirst({
    where: { identifier: resetId, token },
  });
  if (!record || record.expires < new Date()) {
    return { error: "만료되었거나 유효하지 않은 링크입니다." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const updated = await updateUserByResolvedEmail(email, { passwordHash });
  if (!updated) return { error: "계정을 찾을 수 없습니다." };
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
