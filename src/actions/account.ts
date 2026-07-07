"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuthForAction, isSiteOperator } from "@/lib/auth";
import { formatRecoveryDeadline } from "@/lib/account-deletion";
import { markAccountForDeletion } from "@/lib/account-deletion-server";

const deletionSchema = z.object({
  password: z.string().optional(),
  reason: z.string().max(500).optional(),
  confirmUsername: z.string().min(1),
});

export async function requestAccountDeletion(data: z.infer<typeof deletionSchema>) {
  const parsed = deletionSchema.safeParse(data);
  if (!parsed.success) return { error: "입력값이 올바르지 않습니다." };

  const { password, reason, confirmUsername } = parsed.data;

  let user;
  try {
    user = await requireAuthForAction();
  } catch {
    return { error: "로그인이 필요합니다." };
  }

  const full = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      role: true,
      email: true,
      deletedAt: true,
    },
  });

  if (!full) return { error: "계정을 찾을 수 없습니다." };
  if (full.deletedAt) return { error: "이미 탈퇴 처리된 계정입니다." };
  if (isSiteOperator(full)) return { error: "운영자 계정은 여기서 탈퇴할 수 없습니다." };

  if (confirmUsername.trim().toLowerCase() !== full.username.toLowerCase()) {
    return { error: "닉네임이 일치하지 않습니다. 정확히 입력해 주세요." };
  }

  if (full.passwordHash) {
    if (!password?.trim()) {
      return { error: "비밀번호를 입력해 주세요." };
    }
    const valid = await bcrypt.compare(password, full.passwordHash);
    if (!valid) return { error: "비밀번호가 올바르지 않습니다." };
  }

  const { scheduledPurgeAt } = await markAccountForDeletion(full.id, reason);

  return {
    success: true as const,
    recoveryUntil: formatRecoveryDeadline(scheduledPurgeAt),
    message: `탈퇴가 접수되었습니다. ${formatRecoveryDeadline(scheduledPurgeAt)}까지 같은 계정으로 로그인하면 복구할 수 있습니다.`,
  };
}