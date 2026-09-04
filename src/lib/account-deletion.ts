import { addDays, startOfDay } from "date-fns";

export const ACCOUNT_RECOVERY_DAYS = 30;

/** Instagram/X 방식 — 탈퇴 시점 + 30일 = 영구 삭제 시점 */
export function computeScheduledPurgeAt(deletedAt: Date): Date {
  return startOfDay(addDays(deletedAt, ACCOUNT_RECOVERY_DAYS));
}

export function isAccountSoftDeleted(user: {
  deletedAt: Date | null;
  scheduledPurgeAt?: Date | null;
}): boolean {
  return user.deletedAt != null;
}

/** 탈퇴 직후부터 scheduledPurgeAt 전까지 로그인 시 복구 가능 (X 방식) */
export function canRecoverAccount(user: {
  deletedAt: Date | null;
  scheduledPurgeAt: Date | null;
}): boolean {
  if (!user.deletedAt || !user.scheduledPurgeAt) return false;
  return new Date() < user.scheduledPurgeAt;
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
