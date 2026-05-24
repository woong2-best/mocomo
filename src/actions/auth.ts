"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
  isEmailConfigured,
  getResendAccountHint,
} from "@/lib/email";
import {
  getAppBaseUrl,
  resetTokenIdentifier,
  verifyTokenIdentifier,
  verifyCodeIdentifier,
  resetCodeIdentifier,
  generateEmailCode,
} from "@/lib/auth-tokens";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8),
  name: z.string().optional(),
});

async function saveVerificationCodes(email: string, token: string, code: string, hours = 24) {
  const expires = new Date(Date.now() + hours * 60 * 60 * 1000);
  const verifyId = verifyTokenIdentifier(email);
  const codeId = verifyCodeIdentifier(email);

  await db.verificationToken.deleteMany({
    where: { identifier: { in: [verifyId, codeId] } },
  });
  await db.verificationToken.createMany({
    data: [
      { identifier: verifyId, token, expires },
      { identifier: codeId, token: code, expires },
    ],
  });
}

export async function registerUser(data: z.infer<typeof registerSchema>) {
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };
  const { email: rawEmail, username, password, name } = parsed.data;
  const email = rawEmail.trim().toLowerCase();

  const exists = await db.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (exists) return { error: "이미 사용 중인 이메일 또는 닉네임입니다." };

  if (!isEmailConfigured()) {
    return {
      error:
        "이메일 발송 설정(RESEND_API_KEY)이 없어 회원가입을 완료할 수 없습니다. Vercel 환경 변수를 확인하세요.",
    };
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
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

    const token = randomBytes(32).toString("hex");
    const code = generateEmailCode();
    await saveVerificationCodes(email, token, code);

    const verifyUrl = `${getAppBaseUrl()}/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;
    const sent = await sendVerificationEmail(email, verifyUrl, username, code);

    if (!sent.ok) {
      await db.user.delete({ where: { id: user.id } });
      return { error: sent.error ?? "인증 메일 발송 실패" };
    }

    return { success: true, userId: user.id, needsVerification: true, email };
  } catch (e) {
    console.error("[registerUser]", e);
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
  const codeId = verifyCodeIdentifier(normalized);

  const record = await db.verificationToken.findFirst({
    where: { identifier: codeId, token: code.trim() },
  });
  if (!record || record.expires < new Date()) {
    return { error: "인증 코드가 올바르지 않거나 만료되었습니다." };
  }

  await db.user.update({
    where: { email: normalized },
    data: { emailVerified: new Date() },
  });
  await db.verificationToken.deleteMany({
    where: {
      identifier: { in: [verifyTokenIdentifier(normalized), codeId] },
    },
  });

  return { success: true };
}

export async function resendVerificationEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email: normalized } });
  if (!user) return { error: "등록되지 않은 이메일입니다." };
  if (user.emailVerified) return { error: "이미 인증된 계정입니다." };

  if (!isEmailConfigured()) {
    return { error: "이메일 발송 설정(RESEND_API_KEY)이 없습니다." };
  }

  const token = randomBytes(32).toString("hex");
  const code = generateEmailCode();
  await saveVerificationCodes(normalized, token, code);

  const verifyUrl = `${getAppBaseUrl()}/auth/verify?token=${token}&email=${encodeURIComponent(normalized)}`;
  const sent = await sendVerificationEmail(normalized, verifyUrl, user.username, code);

  if (!sent.ok) {
    return { error: sent.error ?? "인증 메일 발송 실패" };
  }

  const hint = getResendAccountHint();
  return {
    success: true,
    message: hint
      ? `인증 메일을 보냈습니다. (Resend 무료: ${hint} 로만 수신 가능할 수 있음)`
      : "인증 메일을 다시 보냈습니다. 스팸함도 확인해 주세요.",
  };
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
  const normalized = email.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email: normalized } });

  if (!user) {
    return {
      success: true,
      message: "등록된 이메일이면 재설정 링크를 보냈습니다. (스팸함도 확인해 주세요)",
    };
  }

  if (!isEmailConfigured()) {
    return {
      error:
        "이메일 발송 설정(RESEND_API_KEY)이 없습니다. Vercel Environment Variables에 RESEND_API_KEY와 EMAIL_FROM을 추가하세요.",
    };
  }

  const token = randomBytes(32).toString("hex");
  const code = generateEmailCode();
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  const resetId = resetTokenIdentifier(normalized);
  const codeId = resetCodeIdentifier(normalized);

  await db.verificationToken.deleteMany({
    where: { identifier: { in: [resetId, codeId] } },
  });
  await db.verificationToken.createMany({
    data: [
      { identifier: resetId, token, expires },
      { identifier: codeId, token: code, expires },
    ],
  });

  const resetUrl = `${getAppBaseUrl()}/auth/reset?token=${token}&email=${encodeURIComponent(normalized)}`;
  const sent = await sendPasswordResetEmail(normalized, resetUrl, code);

  if (!sent.ok) {
    await db.verificationToken.deleteMany({
      where: { identifier: { in: [resetId, codeId] } },
    });
    return { error: sent.error ?? "메일 발송 실패" };
  }

  const hint = getResendAccountHint();
  return {
    success: true,
    message: hint
      ? `재설정 메일을 보냈습니다. (Resend 무료: ${hint} 로만 수신 가능할 수 있음)`
      : "비밀번호 재설정 링크를 이메일로 보냈습니다. 스팸함도 확인해 주세요.",
  };
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

export async function resetPasswordByCode(email: string, code: string, password: string) {
  const normalized = email.trim().toLowerCase();
  if (password.length < 8) return { error: "비밀번호는 8자 이상이어야 합니다." };

  const codeId = resetCodeIdentifier(normalized);
  const record = await db.verificationToken.findFirst({
    where: { identifier: codeId, token: code.trim() },
  });
  if (!record || record.expires < new Date()) {
    return { error: "인증 코드가 올바르지 않거나 만료되었습니다." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.update({
    where: { email: normalized },
    data: { passwordHash },
  });
  await db.verificationToken.deleteMany({
    where: {
      identifier: { in: [resetTokenIdentifier(normalized), codeId] },
    },
  });

  return { success: true };
}
