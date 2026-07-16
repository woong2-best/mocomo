import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { isStaffIdentity, isSiteOperatorAccount } from "@/lib/operator-config";
import { logSiteAdminAudit } from "@/lib/site-admin-audit";
import { resolveEffectiveStaffRole } from "@/lib/staff-roles";
import {
  ADMIN_MFA_COOKIE,
  ADMIN_MFA_IDLE_TTL_SEC,
  ADMIN_STEPUP_COOKIE,
  ADMIN_STEPUP_TTL_SEC,
  adminSecurityCookieOptions,
  createAdminMfaCookieValue,
  createAdminStepUpCookieValue,
  parseAdminMfaCookieValue,
  type AdminMfaStage,
  verifyAdminMfaCookieValue,
  verifyAdminStepUpCookieValue,
} from "@/lib/admin/security/session-cookie";
import { assertNotLocked, clearAdminLoginFailures, recordAdminLoginFailure } from "@/lib/admin/security/lockout";
import { recordAdminLoginAttempt } from "@/lib/admin/security/login-log";
import { getAdminEnrollmentStatus } from "@/lib/admin/security/enrollment";
import {
  decryptTotpSecret,
  verifyTotpCode,
} from "@/lib/admin/security/totp";
import { consumeRecoveryCode } from "@/lib/admin/security/recovery";
import {
  issueTrustedDevice,
  roleRequiresAlwaysMfa,
} from "@/lib/admin/security/trusted-device";
import {
  beginPasskeyAuthentication,
  finishPasskeyAuthentication,
} from "@/lib/admin/security/webauthn";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";

export async function assertUserCanAdminMfa(userId: string): Promise<
  | {
      ok: true;
      user: {
        id: string;
        username: string;
        email: string | null;
        role: string;
        adminDisabledAt: Date | null;
        deletedAt: Date | null;
        isBanned: boolean;
      };
      role: string;
    }
  | { ok: false; error: string }
> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      adminDisabledAt: true,
      deletedAt: true,
      isBanned: true,
    },
  });
  if (!user || user.deletedAt || user.isBanned) {
    return { ok: false, error: "계정을 사용할 수 없습니다." };
  }
  if (user.adminDisabledAt && !isSiteOperatorAccount(user)) {
    return { ok: false, error: "비활성화된 관리자 계정입니다." };
  }
  if (!isStaffIdentity(user) && !isSiteOperatorAccount(user)) {
    return { ok: false, error: "관리자 권한이 없는 계정입니다." };
  }
  const lock = await assertNotLocked(user.id);
  if ("error" in lock) return { ok: false, error: lock.error };
  const role = isSiteOperatorAccount(user)
    ? "OWNER"
    : resolveEffectiveStaffRole({
        username: user.username,
        role: user.role,
        email: user.email,
      });
  return { ok: true, user, role };
}

async function setMfaStage(userId: string, stage: AdminMfaStage) {
  const value = await createAdminMfaCookieValue(userId, stage);
  const jar = await cookies();
  const maxAge = stage === "ok" ? 12 * 60 * 60 : 10 * 60;
  jar.set(ADMIN_MFA_COOKIE, value, adminSecurityCookieOptions(maxAge));
}

export async function clearAdminMfaCookie() {
  const jar = await cookies();
  jar.set(ADMIN_MFA_COOKIE, "", { ...adminSecurityCookieOptions(0), maxAge: 0 });
  jar.set(ADMIN_STEPUP_COOKIE, "", { ...adminSecurityCookieOptions(0), maxAge: 0 });
}

export async function hasValidAdminMfa(userId: string): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminMfaCookieValue(jar.get(ADMIN_MFA_COOKIE)?.value, userId, "ok");
}

export async function getAdminMfaStage(userId: string): Promise<AdminMfaStage | null> {
  const jar = await cookies();
  const parsed = await parseAdminMfaCookieValue(jar.get(ADMIN_MFA_COOKIE)?.value);
  if (!parsed || parsed.userId !== userId) return null;
  return parsed.stage;
}

/** 비밀번호 로그인 직후 — stage=pw 또는 trusted device로 ok */
export async function advanceAdminMfaAfterPassword(userId: string) {
  const gate = await assertUserCanAdminMfa(userId);
  if (!gate.ok) {
    await recordAdminLoginAttempt({
      userId,
      success: false,
      failureReason: gate.error,
    });
    return { error: gate.error };
  }
  const { user } = gate;

  const enrollment = await getAdminEnrollmentStatus(user.id);
  if (!enrollment.complete) {
    await setMfaStage(user.id, "pw");
    return {
      success: true as const,
      next: "enroll" as const,
      enrollment,
    };
  }

  // Trusted Device로 Passkey/TOTP를 건너뛰지 않음 — 매번 3단계 필수
  await setMfaStage(user.id, "pw");
  return { success: true as const, next: "passkey" as const };
}

export async function startAdminPasskeyAuth(userId: string, opts?: { stepUp?: boolean }) {
  const gate = await assertUserCanAdminMfa(userId);
  if (!gate.ok) return { error: gate.error };
  if (opts?.stepUp) {
    if (!(await hasValidAdminMfa(userId))) {
      return { error: "관리자 MFA 세션이 필요합니다." };
    }
    return beginPasskeyAuthentication(userId);
  }
  const stage = await getAdminMfaStage(userId);
  if (stage !== "pw" && stage !== "pk") {
    return { error: "비밀번호 인증을 먼저 완료해 주세요." };
  }
  return beginPasskeyAuthentication(userId);
}

export async function completeAdminPasskeyAuth(
  userId: string,
  response: AuthenticationResponseJSON
) {
  const gate = await assertUserCanAdminMfa(userId);
  if (!gate.ok) return { error: gate.error };
  const stage = await getAdminMfaStage(userId);
  if (stage !== "pw") {
    return { error: "비밀번호 인증을 먼저 완료해 주세요." };
  }

  const result = await finishPasskeyAuthentication(userId, response);
  if ("error" in result) {
    await recordAdminLoginFailure(userId);
    await recordAdminLoginAttempt({
      userId,
      username: gate.user.username,
      email: gate.user.email,
      success: false,
      failureReason: result.error,
      usedPasskey: true,
    });
    void logSiteAdminAudit({
      actorId: userId,
      action: "ADMIN_LOGIN_FAIL",
      targetType: "admin_session",
      targetId: userId,
      metadata: { reason: result.error, step: "passkey" },
    });
    return result;
  }

  await setMfaStage(userId, "pk");
  return { success: true as const, next: "totp" as const };
}

export async function completeAdminTotpAuth(
  userId: string,
  code: string,
  opts?: { trustDevice?: boolean; useRecovery?: boolean }
) {
  const gate = await assertUserCanAdminMfa(userId);
  if (!gate.ok) return { error: gate.error };
  const stage = await getAdminMfaStage(userId);
  if (stage !== "pk") {
    return { error: "Passkey 인증을 먼저 완료해 주세요." };
  }

  let usedTotp = false;
  let usedRecovery = false;

  if (opts?.useRecovery) {
    const ok = await consumeRecoveryCode(userId, code);
    if (!ok) {
      await recordAdminLoginFailure(userId);
      await recordAdminLoginAttempt({
        userId,
        username: gate.user.username,
        email: gate.user.email,
        success: false,
        failureReason: "invalid_recovery_code",
        usedPasskey: true,
        usedRecovery: true,
      });
      void logSiteAdminAudit({
        actorId: userId,
        action: "ADMIN_LOGIN_FAIL",
        targetType: "admin_session",
        targetId: userId,
        metadata: { step: "recovery" },
      });
      return { error: "Recovery Code가 올바르지 않거나 이미 사용되었습니다." };
    }
    usedRecovery = true;
    void logSiteAdminAudit({
      actorId: userId,
      action: "ADMIN_RECOVERY_USED",
      targetType: "admin_security",
      targetId: userId,
    });
  } else {
    const totp = await db.adminTotpCredential.findUnique({ where: { userId } });
    if (!totp?.enabled || !totp.verifiedAt) {
      return { error: "Authenticator가 등록되어 있지 않습니다." };
    }
    const secret = decryptTotpSecret(totp);
    if (!verifyTotpCode(secret, code)) {
      await recordAdminLoginFailure(userId);
      await recordAdminLoginAttempt({
        userId,
        username: gate.user.username,
        email: gate.user.email,
        success: false,
        failureReason: "invalid_totp",
        usedPasskey: true,
        usedTotp: true,
      });
      void logSiteAdminAudit({
        actorId: userId,
        action: "ADMIN_LOGIN_FAIL",
        targetType: "admin_session",
        targetId: userId,
        metadata: { step: "totp" },
      });
      return { error: "인증 코드가 올바르지 않습니다." };
    }
    usedTotp = true;
  }

  await setMfaStage(userId, "ok");
  await clearAdminLoginFailures(userId);

  if (opts?.trustDevice && !roleRequiresAlwaysMfa(gate.role)) {
    await issueTrustedDevice(userId);
  }

  await recordAdminLoginAttempt({
    userId,
    username: gate.user.username,
    email: gate.user.email,
    success: true,
    usedPasskey: true,
    usedTotp,
    usedRecovery,
  });
  void logSiteAdminAudit({
    actorId: userId,
    action: "ADMIN_LOGIN_SUCCESS",
    targetType: "admin_session",
    targetId: userId,
    metadata: { usedPasskey: true, usedTotp, usedRecovery },
  });

  return { success: true as const, next: "done" as const };
}

export async function touchAdminMfaActivity(userId: string): Promise<boolean> {
  const jar = await cookies();
  const parsed = await parseAdminMfaCookieValue(jar.get(ADMIN_MFA_COOKIE)?.value);
  if (!parsed || parsed.userId !== userId || parsed.stage !== "ok") return false;
  const value = await createAdminMfaCookieValue(userId, "ok", ADMIN_MFA_IDLE_TTL_SEC);
  jar.set(ADMIN_MFA_COOKIE, value, adminSecurityCookieOptions(12 * 60 * 60));
  return true;
}

export async function issueAdminStepUp(userId: string) {
  const value = await createAdminStepUpCookieValue(userId);
  const jar = await cookies();
  jar.set(ADMIN_STEPUP_COOKIE, value, adminSecurityCookieOptions(ADMIN_STEPUP_TTL_SEC));
}

export async function hasValidAdminStepUp(userId: string): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminStepUpCookieValue(jar.get(ADMIN_STEPUP_COOKIE)?.value, userId);
}

/** Step-up: Passkey + TOTP 재확인 후 쿠키 발급 */
export async function completeAdminStepUp(
  userId: string,
  passkeyResponse: AuthenticationResponseJSON,
  totpCode: string
) {
  const gate = await assertUserCanAdminMfa(userId);
  if (!gate.ok) return { error: gate.error };
  if (!(await hasValidAdminMfa(userId))) {
    return { error: "관리자 MFA 세션이 필요합니다." };
  }

  const pk = await finishPasskeyAuthentication(userId, passkeyResponse);
  if ("error" in pk) return pk;

  const totp = await db.adminTotpCredential.findUnique({ where: { userId } });
  if (!totp?.enabled) return { error: "Authenticator가 필요합니다." };
  const secret = decryptTotpSecret(totp);
  if (!verifyTotpCode(secret, totpCode)) {
    return { error: "TOTP 코드가 올바르지 않습니다." };
  }

  await issueAdminStepUp(userId);
  void logSiteAdminAudit({
    actorId: userId,
    action: "ADMIN_STEPUP_OK",
    targetType: "admin_session",
    targetId: userId,
  });
  return { success: true as const };
}
