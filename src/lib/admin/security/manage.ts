import { db } from "@/lib/db";
import { logSiteAdminAudit } from "@/lib/site-admin-audit";
import {
  beginPasskeyRegistration,
  finishPasskeyRegistration,
} from "@/lib/admin/security/webauthn";
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecret,
  verifyTotpCode,
} from "@/lib/admin/security/totp";
import { generateRecoveryCodes, listRecoveryCodeStatus } from "@/lib/admin/security/recovery";
import { getAdminEnrollmentStatus } from "@/lib/admin/security/enrollment";
import {
  listTrustedDevices,
  revokeTrustedDevice,
} from "@/lib/admin/security/trusted-device";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";

export async function getAdminSecurityOverview(userId: string) {
  const [enrollment, passkeys, totp, recovery, trusted] = await Promise.all([
    getAdminEnrollmentStatus(userId),
    db.adminWebAuthnCredential.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        deviceType: true,
        backedUp: true,
        lastUsedAt: true,
        createdAt: true,
      },
    }),
    db.adminTotpCredential.findUnique({
      where: { userId },
      select: {
        id: true,
        enabled: true,
        verifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    listRecoveryCodeStatus(userId),
    listTrustedDevices(userId),
  ]);

  return { enrollment, passkeys, totp, recovery, trusted };
}

export async function startPasskeyEnroll(user: {
  id: string;
  username: string;
  email?: string | null;
}) {
  return beginPasskeyRegistration(user);
}

export async function finishPasskeyEnroll(
  userId: string,
  response: RegistrationResponseJSON,
  name?: string
) {
  const result = await finishPasskeyRegistration(userId, response, name);
  if ("error" in result) return result;
  void logSiteAdminAudit({
    actorId: userId,
    action: "ADMIN_PASSKEY_REGISTER",
    targetType: "admin_security",
    targetId: result.credentialId,
  });
  return result;
}

export async function renamePasskey(userId: string, credentialId: string, name: string) {
  const trimmed = name.trim().slice(0, 64);
  if (!trimmed) return { error: "이름을 입력해 주세요." };
  const updated = await db.adminWebAuthnCredential.updateMany({
    where: { id: credentialId, userId },
    data: { name: trimmed },
  });
  if (!updated.count) return { error: "Passkey를 찾을 수 없습니다." };
  void logSiteAdminAudit({
    actorId: userId,
    action: "ADMIN_SECURITY_CHANGE",
    targetType: "admin_passkey",
    targetId: credentialId,
    metadata: { op: "rename", name: trimmed },
  });
  return { success: true as const };
}

export async function deletePasskey(userId: string, credentialId: string) {
  const count = await db.adminWebAuthnCredential.count({ where: { userId } });
  if (count <= 1) {
    return { error: "최소 1개의 Passkey가 필요합니다." };
  }
  const deleted = await db.adminWebAuthnCredential.deleteMany({
    where: { id: credentialId, userId },
  });
  if (!deleted.count) return { error: "Passkey를 찾을 수 없습니다." };
  void logSiteAdminAudit({
    actorId: userId,
    action: "ADMIN_PASSKEY_DELETE",
    targetType: "admin_passkey",
    targetId: credentialId,
  });
  return { success: true as const };
}

/** TOTP 시크릿 생성(미검증). QR용 otpauth URL 반환 */
export async function beginTotpSetup(userId: string, accountLabel: string) {
  const { secretBase32, otpauthUrl } = generateTotpSecret(accountLabel);
  const enc = encryptTotpSecret(secretBase32);
  await db.adminTotpCredential.upsert({
    where: { userId },
    create: {
      userId,
      encryptedSecret: enc.ciphertext,
      encryptionIv: enc.iv,
      encryptionAuthTag: enc.authTag,
      encryptionKeyId: enc.keyId,
      enabled: false,
      verifiedAt: null,
    },
    update: {
      encryptedSecret: enc.ciphertext,
      encryptionIv: enc.iv,
      encryptionAuthTag: enc.authTag,
      encryptionKeyId: enc.keyId,
      enabled: false,
      verifiedAt: null,
    },
  });
  void logSiteAdminAudit({
    actorId: userId,
    action: "ADMIN_TOTP_REGISTER",
    targetType: "admin_security",
    targetId: userId,
    metadata: { phase: "begin" },
  });
  return { otpauthUrl, secretBase32 };
}

export async function verifyTotpSetup(userId: string, code: string) {
  const row = await db.adminTotpCredential.findUnique({ where: { userId } });
  if (!row) return { error: "Authenticator 설정을 먼저 시작해 주세요." };
  const secret = decryptTotpSecret(row);
  if (!verifyTotpCode(secret, code)) {
    return { error: "인증 코드가 올바르지 않습니다." };
  }
  await db.adminTotpCredential.update({
    where: { userId },
    data: { enabled: true, verifiedAt: new Date() },
  });
  void logSiteAdminAudit({
    actorId: userId,
    action: "ADMIN_TOTP_REGISTER",
    targetType: "admin_security",
    targetId: userId,
    metadata: { phase: "verify" },
  });
  return { success: true as const };
}

export async function setTotpEnabled(userId: string, enabled: boolean) {
  const row = await db.adminTotpCredential.findUnique({ where: { userId } });
  if (!row?.verifiedAt) {
    return { error: "Authenticator가 검증되지 않았습니다." };
  }
  if (!enabled) {
    // 비활성화 시에도 enrollment 깨짐 — 명시적 허용하되 대시보드 접근은 막힘
  }
  await db.adminTotpCredential.update({
    where: { userId },
    data: { enabled },
  });
  void logSiteAdminAudit({
    actorId: userId,
    action: "ADMIN_SECURITY_CHANGE",
    targetType: "admin_totp",
    targetId: userId,
    metadata: { enabled },
  });
  return { success: true as const };
}

export async function regenerateRecoveryCodesForUser(userId: string) {
  const codes = await generateRecoveryCodes(userId);
  void logSiteAdminAudit({
    actorId: userId,
    action: "ADMIN_RECOVERY_GENERATE",
    targetType: "admin_security",
    targetId: userId,
    metadata: { count: codes.length },
  });
  return { codes };
}

export async function revokeTrustedDeviceForUser(userId: string, deviceId: string) {
  await revokeTrustedDevice(userId, deviceId);
  void logSiteAdminAudit({
    actorId: userId,
    action: "ADMIN_SECURITY_CHANGE",
    targetType: "admin_trusted_device",
    targetId: deviceId,
    metadata: { op: "revoke" },
  });
  return { success: true as const };
}
