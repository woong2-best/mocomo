"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuthForAction } from "@/lib/auth";
import { validateUsernameAndName } from "@/lib/forbidden-admin-sequence";
import { findUserByUsernameInsensitive } from "@/lib/signup-user-resolve";
import {
  RESERVED_USERNAMES,
  isValidUsername,
  normalizeUsername,
} from "@/lib/username-policy";
import {
  clearSignupNeedsIdentity,
  signupIdentityContinuePath,
  signupPasswordEntryPath,
} from "@/lib/signup-identity-onboarding";

const BCRYPT_ROUNDS = 10;

export async function completeSignupProfileOnboarding(input: {
  username: string;
  name: string;
  dest?: string;
}): Promise<{ error?: string }> {
  const user = await requireAuthForAction();
  const username = normalizeUsername(input.username);
  const name = input.name.trim();

  if (!isValidUsername(username)) {
    return { error: "아이디는 영문·숫자·_ 3~20자입니다." };
  }
  if (RESERVED_USERNAMES.has(username)) {
    return { error: "사용할 수 없는 아이디입니다." };
  }
  if (!name) {
    return { error: "닉네임을 입력해 주세요." };
  }
  const check = validateUsernameAndName(username, name);
  if (!check.ok) return { error: check.error };

  const taken = await findUserByUsernameInsensitive(username);
  if (taken && taken.id !== user.id) {
    return { error: `@${username} 아이디는 이미 사용 중입니다.` };
  }

  await db.user.update({
    where: { id: user.id },
    data: { username, name },
  });

  revalidatePath("/settings/profile");
  revalidatePath("/");

  redirect(signupPasswordEntryPath(input.dest));
}

export async function completeSignupPasswordOnboarding(input: {
  password: string;
  dest?: string;
}): Promise<{ error?: string }> {
  const user = await requireAuthForAction();
  const password = input.password.trim();
  if (password.length < 8) {
    return { error: "비밀번호는 8자 이상이어야 합니다." };
  }

  const row = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!row) return { error: "사용자를 찾을 수 없습니다." };
  if (row.passwordHash) {
    await clearSignupNeedsIdentity();
    redirect(signupIdentityContinuePath(input.dest));
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await clearSignupNeedsIdentity();
  revalidatePath("/settings/profile");
  revalidatePath("/");

  redirect(signupIdentityContinuePath(input.dest));
}
