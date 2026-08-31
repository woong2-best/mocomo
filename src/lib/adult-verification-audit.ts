import { db } from "@/lib/db";
import { ipFingerprint } from "@/lib/bank-account-fingerprint";
import { sanitizeRecord } from "@/lib/safe-log";
import type { AdultVerificationScope } from "@prisma/client";

export async function writeAdultVerificationAudit(input: {
  userId: string;
  portoneVerificationId: string;
  birthDate: Date;
  scope?: AdultVerificationScope;
  ip?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await db.adultVerificationLog.create({
      data: {
        userId: input.userId,
        portoneVerificationId: input.portoneVerificationId,
        verifiedAt: new Date(),
        birthDate: input.birthDate,
        scope: input.scope ?? "GLOBAL",
        ipHash: input.ip ? ipFingerprint(input.ip) : null,
        meta: input.meta ? (sanitizeRecord(input.meta) as object) : undefined,
      },
    });
  } catch {
    // 감사 로그 실패가 사용자 플로우를 막지 않음
  }
}
