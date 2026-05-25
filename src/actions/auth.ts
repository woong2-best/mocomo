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
} from "@/lib/auth-tokens";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendAuthCodeEmail,
  isEmailConfigured,
  getResendAccountHint,
} from "@/lib/email";
import { z } from "zod";

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
});

async function saveVerificationCodes(email: string, token: string, code: string, hours = 24) {
  const expires = new Date(Date.now() + hours * 60 * 60 * 1000);
  const normalized = email.trim().toLowerCase();
  const verifyId = verifyTokenIdentifier(normalized);
  const codeId = verifyCodeIdentifier(normalized);
  const authId = authCodeIdentifier(normalized);

  await db.verificationToken.deleteMany({
    where: {
      identifier: { in: [verifyId, codeId, authId, resetCodeIdentifier(normalized)] },
    },
  });
  await db.verificationToken.createMany({
    data: [
      { identifier: verifyId, token, expires },
      { identifier: codeId, token: code, expires },
      { identifier: authId, token: code, expires },
    ],
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
  return db.verificationToken.findFirst({
    where: {
      identifier: { in: authCodeIdentifiers(email) },
      token: code.trim(),
    },
  });
}

/** Unified: signup verify + password reset — send 6-digit code */
export async function sendEmailAuthCode(email: string, mode: "signup" | "reset" = "signup") {
  const normalized = email.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email: normalized } });

  if (!user) {
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
    data: { identifier: authId, token: code, expires },
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

  const user = await db.user.findUnique({ where: { email: normalized } });
  if (!user) return { error: "등록되지 않은 이메일입니다." };

  if (options.mode === "reset") {
    const password = options.newPassword?.trim() ?? "";
    if (password.length < 8) {
      return { error: "비밀번호는 8자 이상이어야 합니다." };
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await db.user.update({
      where: { email: normalized },
      data: { passwordHash, emailVerified: user.emailVerified ?? new Date() },
    });
  } else {
    await db.user.update({
      where: { email: normalized },
      data: { emailVerified: new Date() },
    });
  }

  await db.verificationToken.deleteMany({
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

  return { success: true, mode: options.mode };
}

export async function registerUser(data: z.infer<typeof registerSchema>) {
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };
  const { email: rawEmail, username, password, name } = parsed.data;
  const email = rawEmail.trim().toLowerCase();

  const userByEmail = await db.user.findUnique({ where: { email } });
  const userByUsername = await db.user.findUnique({ where: { username } });

  if (userByEmail?.emailVerified) {
    return {
      error: "이미 가입된 이메일입니다. 로그인하거나 비밀번호 찾기를 이용하세요.",
    };
  }

  if (userByUsername && userByUsername.email !== email) {
    return { error: "이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요." };
  }

  if (!isEmailConfigured()) {
    return {
      error:
        "이메일 발송 설정(RESEND_API_KEY)이 없어 회원가입을 완료할 수 없습니다. Vercel 환경 변수를 확인하세요.",
    };
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    let userId: string;

    if (userByEmail && !userByEmail.emailVerified) {
      const updated = await db.user.update({
        where: { id: userByEmail.id },
        data: {
          username,
          passwordHash,
          name: name || username,
          emailVerified: null,
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
          emailVerified: null,
          profile: { create: {} },
          otakuProfile: { create: {} },
        },
      });
      userId = user.id;
    }

    const token = randomBytes(32).toString("hex");
    const code = generateEmailCode();
    await saveVerificationCodes(email, token, code);

    const verifyUrl = `${getAppBaseUrl()}/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;
    const sent = await sendVerificationEmail(email, verifyUrl, username, code);

    if (!sent.ok) {
      if (!userByEmail) {
        await db.user.delete({ where: { id: userId } });
      }
      return { error: sent.error ?? "인증 메일 발송 실패" };
    }

    const resumed = !!userByEmail && !userByEmail.emailVerified;
    return {
      success: true,
      userId,
      needsVerification: true,
      email,
      resumed,
      message: resumed
        ? "인증이 완료되지 않은 계정입니다. 인증 코드를 다시 보냈습니다."
        : undefined,
    };
  } catch (e) {
    console.error("[registerUser]", e);
    const prismaCode =
      e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    if (prismaCode === "P2002") {
      return { error: "이미 사용 중인 이메일 또는 닉네임입니다." };
    }
    return {
      error:
        "회원가입 저장에 실패했습니다. Vercel에 DATABASE_URL·DIRECT_URL이 설정됐는지 확인하세요.",
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

  await db.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });
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

export async function resendVerificationEmail(email: string) {
  return sendEmailAuthCode(email, "signup");
}

export async function preLoginCheck(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email: normalized } });
  if (!user?.passwordHash) return { ok: false, error: "INVALID" as const };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { ok: false, error: "INVALID" as const };

  if (!user.emailVerified) {
    const verifyId = verifyTokenIdentifier(normalized);
    const pending = await db.verificationToken.findFirst({
      where: { identifier: verifyId, expires: { gt: new Date() } },
    });
    if (pending) {
      return { ok: false, error: "EMAIL_NOT_VERIFIED" as const };
    }
  }

  return { ok: true };
}

export async function resetPasswordRequest(email: string) {
  return sendEmailAuthCode(email, "reset");
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
  await db.user.update({
    where: { email },
    data: { passwordHash },
  });
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
