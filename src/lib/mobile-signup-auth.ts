import { z } from "zod";
import { db } from "@/lib/db";
import {
  checkSignupAvailability,
  checkUsernameAvailable,
  completeAuthWithCode,
  registerUser,
} from "@/actions/auth";
import { authenticateCredentialsUser } from "@/lib/mobile-credentials-login";
import { issueMobileTokenPair } from "@/lib/mobile-auth-tokens";
import { hydrateUserOAuthProfile } from "@/lib/oauth-vault";
import {
  authCodeIdentifier,
  generateEmailCode,
  resetCodeIdentifier,
  scopedAuthCodeToken,
  verifyCodeIdentifier,
} from "@/lib/auth-tokens";
import { isEmailConfigured, sendAuthCodeEmail } from "@/lib/email";
import {
  checkEmailSendRateLimit,
  recordEmailSendRateLimit,
} from "@/lib/auth-rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import { resolveUserByEmail } from "@/lib/signup-user-resolve";

const registerBodySchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/)
    .transform((s) => s.trim().toLowerCase()),
  password: z.string().min(8),
  name: z.string().optional(),
  locale: z.string().default("ko"),
  countryCode: z.string().min(2).max(8).default("KR"),
  timeZone: z.string().min(1).max(64).default("Asia/Seoul"),
  birthYear: z.coerce.number().int().min(1900).max(new Date().getFullYear()),
  birthMonth: z.coerce.number().int().min(1).max(12),
  birthDay: z.coerce.number().int().min(1).max(31),
});

const emailCodeSchema = z.object({
  email: z.string().email(),
  mode: z.enum(["signup", "reset"]),
});

const verifySignupSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(12),
  password: z.string().min(8),
  platform: z.enum(["android", "ios"]).optional(),
  deviceId: z.string().max(128).optional(),
});

const resetCompleteSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(12),
  newPassword: z.string().min(8),
  platform: z.enum(["android", "ios"]).optional(),
  deviceId: z.string().max(128).optional(),
});

function authCodeIdentifiers(email: string) {
  const normalized = email.trim().toLowerCase();
  return [
    authCodeIdentifier(normalized),
    verifyCodeIdentifier(normalized),
    resetCodeIdentifier(normalized),
  ];
}

/** Mobile app: send 6-digit email code (no Turnstile — rate-limited by IP). */
export async function sendMobileEmailAuthCode(email: string, mode: "signup" | "reset") {
  const normalized = email.trim().toLowerCase();
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

  await recordEmailSendRateLimit(normalized, ip);

  return {
    success: true,
    message:
      mode === "reset"
        ? "이메일로 6자리 인증 코드를 보냈습니다. 코드 확인 후 새 비밀번호를 설정하세요."
        : "이메일로 6자리 인증 코드를 보냈습니다. 코드 확인 후 가입 비밀번호로 로그인하세요.",
  };
}

export async function registerMobileUser(data: z.input<typeof registerBodySchema>) {
  const parsed = registerBodySchema.safeParse(data);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };

  return registerUser(
    {
      ...parsed.data,
      turnstileUnavailable: true,
      availabilityPrechecked: true,
      humanChallengeToken: "mobile",
      humanChallengeAnswer: "mobile",
    },
    false,
    { channel: "mobile" }
  );
}

async function toMobileAuthUser(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, name: true, image: true, locale: true },
  });
  if (!user) throw new Error("user_not_found");
  const hydrated = await hydrateUserOAuthProfile(user);
  return {
    id: user.id,
    username: user.username,
    name: hydrated.name,
    image: hydrated.image,
    locale: user.locale,
  };
}

export async function verifyMobileSignupAndLogin(data: z.input<typeof verifySignupSchema>) {
  const parsed = verifySignupSchema.safeParse(data);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };

  const email = parsed.data.email.trim().toLowerCase();
  const result = await completeAuthWithCode(email, parsed.data.code, { mode: "signup" });
  if ("error" in result && result.error) return { error: result.error };

  const ip = await getRequestIp();
  try {
    const user = await authenticateCredentialsUser(
      email,
      parsed.data.password,
      ip,
      { channel: "mobile", platform: parsed.data.platform }
    );
    const tokens = await issueMobileTokenPair({
      userId: user.id,
      deviceId: parsed.data.deviceId,
      platform: parsed.data.platform,
    });
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt.toISOString(),
      user: await toMobileAuthUser(user.id),
    };
  } catch {
    return { error: "인증은 완료됐지만 로그인에 실패했습니다. 다시 로그인해 주세요." };
  }
}

export async function completeMobilePasswordReset(data: z.input<typeof resetCompleteSchema>) {
  const parsed = resetCompleteSchema.safeParse(data);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };

  const email = parsed.data.email.trim().toLowerCase();
  const result = await completeAuthWithCode(email, parsed.data.code, {
    mode: "reset",
    newPassword: parsed.data.newPassword,
  });
  if ("error" in result && result.error) return { error: result.error };

  const ip = await getRequestIp();
  try {
    const user = await authenticateCredentialsUser(
      email,
      parsed.data.newPassword,
      ip,
      { channel: "mobile", platform: parsed.data.platform }
    );
    const tokens = await issueMobileTokenPair({
      userId: user.id,
      deviceId: parsed.data.deviceId,
      platform: parsed.data.platform,
    });
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt.toISOString(),
      user: await toMobileAuthUser(user.id),
    };
  } catch {
    return {
      success: true,
      message: "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.",
    };
  }
}

export {
  checkSignupAvailability,
  checkUsernameAvailable,
  emailCodeSchema,
  registerBodySchema,
  resetCompleteSchema,
  verifySignupSchema,
};
