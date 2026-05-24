"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { sendPasswordResetEmail, sendWelcomeEmail } from "@/lib/email";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8),
  name: z.string().optional(),
});

export async function registerUser(data: z.infer<typeof registerSchema>) {
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };
  const { email: rawEmail, username, password, name } = parsed.data;
  const email = rawEmail.trim().toLowerCase();

  const exists = await db.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (exists) return { error: "이미 사용 중인 이메일 또는 닉네임입니다." };

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.create({
    data: {
      email,
      username,
      passwordHash,
      name: name || username,
      profile: { create: {} },
      otakuProfile: { create: {} },
    },
  });

  if (email) {
    await sendWelcomeEmail(email, username).catch(() => {});
  }

  return { success: true, userId: user.id };
}

export async function resetPasswordRequest(email: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { success: true, message: "비밀번호 재설정 링크를 이메일로 보냈습니다." };

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  await db.verificationToken.deleteMany({ where: { identifier: email } });
  await db.verificationToken.create({
    data: { identifier: email, token, expires },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/auth/reset?token=${token}&email=${encodeURIComponent(email)}`;
  await sendPasswordResetEmail(email, resetUrl);

  return { success: true, message: "비밀번호 재설정 링크를 이메일로 보냈습니다." };
}

export async function resetPasswordConfirm(data: {
  email: string;
  token: string;
  password: string;
}) {
  const { email, token, password } = data;
  if (password.length < 8) return { error: "비밀번호는 8자 이상이어야 합니다." };

  const record = await db.verificationToken.findFirst({
    where: { identifier: email, token },
  });
  if (!record || record.expires < new Date()) {
    return { error: "만료되었거나 유효하지 않은 링크입니다." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.update({
    where: { email },
    data: { passwordHash },
  });
  await db.verificationToken.deleteMany({ where: { identifier: email } });

  return { success: true };
}
