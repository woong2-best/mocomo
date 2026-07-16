import { db } from "@/lib/db";

export type AdminEnrollmentStatus = {
  hasPasskey: boolean;
  hasTotp: boolean;
  totpEnabled: boolean;
  hasRecoveryCodes: boolean;
  complete: boolean;
};

export async function getAdminEnrollmentStatus(
  userId: string
): Promise<AdminEnrollmentStatus> {
  const [passkeyCount, totp, recoveryCount] = await Promise.all([
    db.adminWebAuthnCredential.count({ where: { userId } }),
    db.adminTotpCredential.findUnique({ where: { userId } }),
    db.adminRecoveryCode.count({ where: { userId, usedAt: null } }),
  ]);

  const hasPasskey = passkeyCount > 0;
  const hasTotp = !!totp;
  const totpEnabled = !!totp?.enabled && !!totp.verifiedAt;
  const hasRecoveryCodes = recoveryCount > 0;
  const complete = hasPasskey && totpEnabled && hasRecoveryCodes;

  return { hasPasskey, hasTotp, totpEnabled, hasRecoveryCodes, complete };
}

export async function assertAdminSecurityEnrolled(userId: string) {
  const status = await getAdminEnrollmentStatus(userId);
  if (!status.complete) {
    return { error: "ADMIN_ENROLLMENT_REQUIRED" as const, status };
  }
  return { status };
}
