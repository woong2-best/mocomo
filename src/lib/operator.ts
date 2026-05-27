import type { PrismaClient } from "@prisma/client";
import { getOperatorEmail, getOperatorUsername } from "@/lib/operator-config";

export { getOperatorUsername, getOperatorEmail, isOperatorIdentity } from "@/lib/operator-config";

export type OperatorBootstrapResult = {
  ok: boolean;
  username: string;
  demoted: number;
  promoted: boolean;
  reason?: "operator_account_missing" | "operator_email_mismatch";
};

function auditLog(event: string, payload: Record<string, unknown>) {
  console.info(
    JSON.stringify({
      ts: new Date().toISOString(),
      scope: "operator",
      event,
      ...payload,
    })
  );
}

/** 잘못 부여된 ADMIN/MODERATOR 회수 (승격 없음) — 배포·보안 점검용 */
export async function revokeUnauthorizedAdminRoles(prisma: PrismaClient): Promise<number> {
  const username = getOperatorUsername();
  const result = await prisma.user.updateMany({
    where: {
      username: { not: username, mode: "insensitive" },
      role: { in: ["ADMIN", "MODERATOR"] },
    },
    data: { role: "USER" },
  });
  if (result.count > 0) {
    auditLog("revoke_unauthorized_roles", { username, demoted: result.count });
  }
  return result.count;
}

/**
 * 운영자 ADMIN 부여 + 타 계정 권한 회수.
 * SQL/대시보드 대신 CLI·최초 1회 배포 시에만 호출 (요청마다 실행하지 않음).
 */
export async function bootstrapOperatorRole(prisma: PrismaClient): Promise<OperatorBootstrapResult> {
  const username = getOperatorUsername();
  const requiredEmail = getOperatorEmail();
  const demoted = await revokeUnauthorizedAdminRoles(prisma);

  const operator = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true, username: true, role: true, email: true },
  });

  if (!operator) {
    auditLog("bootstrap_skipped", { username, reason: "operator_account_missing", demoted });
    return { ok: false, username, demoted, promoted: false, reason: "operator_account_missing" };
  }

  if (requiredEmail && operator.email?.trim().toLowerCase() !== requiredEmail) {
    auditLog("bootstrap_skipped", {
      username,
      reason: "operator_email_mismatch",
      demoted,
      expectedEmail: requiredEmail,
    });
    return { ok: false, username, demoted, promoted: false, reason: "operator_email_mismatch" };
  }

  const promoted = operator.role !== "ADMIN";
  if (promoted) {
    await prisma.user.update({
      where: { id: operator.id },
      data: { role: "ADMIN" },
    });
  }

  auditLog("bootstrap_ok", {
    username: operator.username,
    demoted,
    promoted,
    operatorId: operator.id,
  });

  return { ok: true, username: operator.username, demoted, promoted };
}

/** @deprecated — bootstrapOperatorRole 또는 revokeUnauthorizedAdminRoles 사용 */
export async function ensureOperatorRole(prisma: PrismaClient) {
  return bootstrapOperatorRole(prisma);
}
