import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { isSiteOperator } from "@/lib/auth";
import { formatRecoveryDeadline, ACCOUNT_DELETE_CONFIRM_TEXT } from "@/lib/account-deletion";
import { markAccountForDeletion } from "@/lib/account-deletion-server";

export const accountDeletionInputSchema = z.object({
  password: z.string().optional(),
  reason: z.string().max(500).optional(),
  confirmUsername: z.string().min(1),
  confirmDelete: z.string().min(1),
});

export type AccountDeletionInput = z.infer<typeof accountDeletionInputSchema>;

export type AccountDeletionUser = {
  id: string;
  username: string;
  passwordHash: string | null;
  role: string;
  email: string | null;
  deletedAt: Date | null;
};

export async function requestAccountDeletionForUser(
  user: AccountDeletionUser,
  data: AccountDeletionInput
) {
  const parsed = accountDeletionInputSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input." as const };

  const { password, reason, confirmUsername, confirmDelete } = parsed.data;

  if (user.deletedAt) return { error: "This account has already been deleted." as const };
  if (isSiteOperator(user)) return { error: "Operator accounts can't be deleted here." as const };

  if (confirmUsername.trim().toLowerCase() !== user.username.toLowerCase()) {
    return { error: "Username (nickname) doesn't match. Enter it exactly." as const };
  }

  if (confirmDelete.trim() !== ACCOUNT_DELETE_CONFIRM_TEXT) {
    return {
      error: `확인을 위해 "${ACCOUNT_DELETE_CONFIRM_TEXT}"을(를) 정확히 입력해 주세요.` as const,
    };
  }

  if (user.passwordHash) {
    if (!password?.trim()) {
      return { error: "Enter your password." as const };
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return { error: "Incorrect password." as const };
  }

  const { scheduledPurgeAt } = await markAccountForDeletion(user.id, reason);

  return {
    success: true as const,
    recoveryUntil: formatRecoveryDeadline(scheduledPurgeAt),
    message: `탈퇴가 접수되었습니다. ${formatRecoveryDeadline(scheduledPurgeAt)}까지 로그인하면 탈퇴를 취소할 수 있습니다.`,
  };
}

export async function loadAccountDeletionUser(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      role: true,
      email: true,
      deletedAt: true,
    },
  });
}
