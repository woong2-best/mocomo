"use server";

import { auth } from "@/lib/auth";
import {
  advanceAdminMfaAfterPassword,
  clearAdminMfaCookie,
  completeAdminPasskeyAuth,
  completeAdminStepUp,
  completeAdminTotpAuth,
  startAdminPasskeyAuth,
} from "@/lib/admin/mfa-service";
import {
  beginTotpSetup,
  deletePasskey,
  finishPasskeyEnroll,
  getAdminSecurityOverview,
  regenerateRecoveryCodesForUser,
  renamePasskey,
  revokeTrustedDeviceForUser,
  setTotpEnabled,
  startPasskeyEnroll,
  verifyTotpSetup,
} from "@/lib/admin/security/manage";
import { listAdminLoginAttempts } from "@/lib/admin/security/login-log";
import { unlockAdminAccount } from "@/lib/admin/security/lockout";
import { getAdminActor, AdminAccessError, requireAdminPermission } from "@/lib/admin/access";
import { getAdminEnrollmentStatus } from "@/lib/admin/security/enrollment";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/types";

async function requireSessionUserId() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user.id;
}

export async function adminMfaAfterPasswordAction() {
  const userId = await requireSessionUserId();
  if (!userId) return { error: "먼저 관리자 계정으로 로그인해 주세요." };
  return advanceAdminMfaAfterPassword(userId);
}

export async function adminMfaStageAction() {
  const userId = await requireSessionUserId();
  if (!userId) return { stage: null as null };
  const { getAdminMfaStage } = await import("@/lib/admin/mfa-service");
  const stage = await getAdminMfaStage(userId);
  return { stage };
}

export async function adminPasskeyAuthOptionsAction(opts?: { stepUp?: boolean }) {
  const userId = await requireSessionUserId();
  if (!userId) return { error: "세션이 만료되었습니다." };
  return startAdminPasskeyAuth(userId, opts);
}

export async function adminPasskeyAuthVerifyAction(response: AuthenticationResponseJSON) {
  const userId = await requireSessionUserId();
  if (!userId) return { error: "세션이 만료되었습니다." };
  return completeAdminPasskeyAuth(userId, response);
}

export async function adminTotpAuthVerifyAction(
  code: string,
  opts?: { trustDevice?: boolean; useRecovery?: boolean }
) {
  const userId = await requireSessionUserId();
  if (!userId) return { error: "세션이 만료되었습니다." };
  return completeAdminTotpAuth(userId, code, opts);
}

export async function adminLogoutMfaAction() {
  await clearAdminMfaCookie();
  return { success: true as const };
}

export async function adminEnrollmentStatusAction() {
  const userId = await requireSessionUserId();
  if (!userId) return { error: "세션이 만료되었습니다." };
  const status = await getAdminEnrollmentStatus(userId);
  return { status };
}

export async function adminPasskeyRegisterOptionsAction() {
  const session = await auth();
  if (!session?.user?.id) return { error: "세션이 만료되었습니다." };
  return startPasskeyEnroll({
    id: session.user.id,
    username: session.user.username ?? "admin",
    email: session.user.email,
  });
}

export async function adminPasskeyRegisterVerifyAction(
  response: RegistrationResponseJSON,
  name?: string
) {
  const userId = await requireSessionUserId();
  if (!userId) return { error: "세션이 만료되었습니다." };
  return finishPasskeyEnroll(userId, response, name);
}

export async function adminTotpBeginAction() {
  const session = await auth();
  if (!session?.user?.id) return { error: "세션이 만료되었습니다." };
  const label = session.user.username || session.user.email || "admin";
  return beginTotpSetup(session.user.id, label);
}

export async function adminTotpVerifyAction(code: string) {
  const userId = await requireSessionUserId();
  if (!userId) return { error: "세션이 만료되었습니다." };
  return verifyTotpSetup(userId, code);
}

export async function adminRecoveryGenerateAction() {
  const userId = await requireSessionUserId();
  if (!userId) return { error: "세션이 만료되었습니다." };
  return regenerateRecoveryCodesForUser(userId);
}

export async function adminSecurityOverviewAction() {
  try {
    const actor = await getAdminActor();
    return getAdminSecurityOverview(actor.id);
  } catch (e) {
    if (e instanceof AdminAccessError && e.message === "ADMIN_MFA_REQUIRED") {
      // enrollment path may call with only password stage — allow overview via session+staff
      const userId = await requireSessionUserId();
      if (!userId) return { error: "UNAUTHORIZED" };
      return getAdminSecurityOverview(userId);
    }
    return { error: "FORBIDDEN" };
  }
}

export async function adminPasskeyRenameAction(credentialId: string, name: string) {
  const actor = await getAdminActor();
  return renamePasskey(actor.id, credentialId, name);
}

export async function adminPasskeyDeleteAction(credentialId: string) {
  const actor = await getAdminActor();
  return deletePasskey(actor.id, credentialId);
}

export async function adminTotpSetEnabledAction(enabled: boolean) {
  const actor = await getAdminActor();
  return setTotpEnabled(actor.id, enabled);
}

export async function adminTrustedRevokeAction(deviceId: string) {
  const actor = await getAdminActor();
  return revokeTrustedDeviceForUser(actor.id, deviceId);
}

export async function adminLoginLogsAction(opts?: { take?: number; cursor?: string }) {
  await requireAdminPermission("audit");
  const rows = await listAdminLoginAttempts(opts);
  return { rows };
}

export async function adminUnlockAccountAction(targetUserId: string) {
  const actor = await requireAdminPermission("admins");
  await unlockAdminAccount(targetUserId, actor.id);
  return { success: true as const };
}

export async function adminStepUpCompleteAction(
  passkeyResponse: AuthenticationResponseJSON,
  totpCode: string
) {
  const userId = await requireSessionUserId();
  if (!userId) return { error: "세션이 만료되었습니다." };
  return completeAdminStepUp(userId, passkeyResponse, totpCode);
}
