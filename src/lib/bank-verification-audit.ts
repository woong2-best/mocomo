import { db } from "@/lib/db";
import { ipFingerprint } from "@/lib/bank-account-fingerprint";
import { sanitizeRecord } from "@/lib/safe-log";

export type BankVerificationAuditAction =
  | "send_start"
  | "send_success"
  | "send_fail"
  | "verify_success"
  | "verify_fail"
  | "verify_locked";

export async function writeBankVerificationAudit(input: {
  userId: string;
  action: BankVerificationAuditAction;
  bankCode?: string;
  ip?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await db.bankVerificationLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        bankCode: input.bankCode?.slice(0, 8) ?? null,
        ipHash: input.ip ? ipFingerprint(input.ip) : null,
        meta: input.meta ? (sanitizeRecord(input.meta) as object) : undefined,
      },
    });
  } catch {
    // 감사 로그 실패가 사용자 플로우를 막지 않음
  }
}
