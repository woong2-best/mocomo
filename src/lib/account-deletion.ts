import { addDays, startOfDay } from "date-fns";

export const ACCOUNT_RECOVERY_DAYS = 50;

/** 탈퇴 다음날 0시 + 50일 = 영구 삭제 시점 */
export function computeScheduledPurgeAt(deletedAt: Date): Date {
  const dayAfter = startOfDay(addDays(deletedAt, 1));
  return startOfDay(addDays(dayAfter, ACCOUNT_RECOVERY_DAYS));
}

export function isAccountSoftDeleted(user: {
  deletedAt: Date | null;
  scheduledPurgeAt?: Date | null;
}): boolean {
  return user.deletedAt != null;
}

/** 탈퇴 다음날부터 scheduledPurgeAt 전까지 복구 가능 */
export function canRecoverAccount(user: {
  deletedAt: Date | null;
  scheduledPurgeAt: Date | null;
}): boolean {
  if (!user.deletedAt || !user.scheduledPurgeAt) return false;
  const now = new Date();
  const recoveryStarts = startOfDay(addDays(user.deletedAt, 1));
  return now >= recoveryStarts && now < user.scheduledPurgeAt;
}

export function isAccountPastRecovery(user: {
  deletedAt: Date | null;
  scheduledPurgeAt: Date | null;
}): boolean {
  if (!user.deletedAt || !user.scheduledPurgeAt) return false;
  return new Date() >= user.scheduledPurgeAt;
}

export function formatRecoveryDeadline(scheduledPurgeAt: Date): string {
  const end = addDays(scheduledPurgeAt, -1);
  return end.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

export const ACCOUNT_DELETION_SELECT = {
  deletedAt: true,
  scheduledPurgeAt: true,
} as const;
