import type { PrismaClient } from "@prisma/client";
import {
  getOperatorEmail,
  getOperatorEmails,
  getOperatorUsername,
  getOperatorUsernames,
} from "@/lib/operator-config";
import { safeLogInfo } from "@/lib/safe-log";
import { findUserIdByOAuthEmail } from "@/lib/oauth-vault";

export {
  getOperatorUsername,
  getOperatorUsernames,
  getOperatorEmail,
  getOperatorEmails,
  isOperatorIdentity,
} from "@/lib/operator-config";

export type OperatorBootstrapResult = {
  ok: boolean;
  username: string;
  demoted: number;
  promoted: boolean;
  reason?: "operator_account_missing" | "operator_email_mismatch";
};

function auditLog(event: string, payload: Record<string, unknown>) {
  safeLogInfo("operator", { event, ...payload });
}

function operatorIdentityFilter() {
  const usernames = getOperatorUsernames();
  const emails = getOperatorEmails();
  return {
    NOT: {
      OR: [
        ...usernames.map((name) => ({
          username: { equals: name, mode: "insensitive" as const },
        })),
        ...emails.map((email) => ({
          email: { equals: email, mode: "insensitive" as const },
        })),
      ],
    },
  };
}

/** 지정 운영자 외 ADMIN/MODERATOR/OWNER 회수 */
export async function revokeUnauthorizedAdminRoles(prisma: PrismaClient): Promise<number> {
  const allowed = getOperatorUsernames();
  const result = await prisma.user.updateMany({
    where: {
      ...operatorIdentityFilter(),
      role: { in: ["ADMIN", "MODERATOR", "OWNER"] },
    },
    data: { role: "USER" },
  });
  if (result.count > 0) {
    auditLog("revoke_unauthorized_roles", { allowed, demoted: result.count });
  }
  return result.count;
}

/**
 * 운영자 OWNER 부여 + 타 계정 권한 회수.
 */
export async function bootstrapOperatorRole(prisma: PrismaClient): Promise<OperatorBootstrapResult> {
  const usernames = getOperatorUsernames();
  const primary = getOperatorUsername();
  const requiredEmail = getOperatorEmail();
  const demoted = await revokeUnauthorizedAdminRoles(prisma);

  let anyMissing = false;
  let promotedAny = false;

  for (const email of getOperatorEmails()) {
    let operator = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, username: true, role: true, email: true },
    });
    if (!operator) {
      const oauthUserId = await findUserIdByOAuthEmail(email);
      if (oauthUserId) {
        operator = await prisma.user.findFirst({
          where: { id: oauthUserId },
          select: { id: true, username: true, role: true, email: true },
        });
        if (operator && !operator.email) {
          await prisma.user.update({
            where: { id: operator.id },
            data: { email },
          });
          operator = { ...operator, email };
        }
      }
    }
    if (!operator) {
      anyMissing = true;
      auditLog("bootstrap_missing_operator_email", { email, demoted });
      continue;
    }
    const promoted = operator.role !== "OWNER";
    if (promoted) {
      await prisma.user.update({
        where: { id: operator.id },
        data: { role: "OWNER", adminDisabledAt: null },
      });
      promotedAny = true;
    } else if (operator.role === "OWNER") {
      await prisma.user.update({
        where: { id: operator.id },
        data: { adminDisabledAt: null },
      });
    }
    auditLog("bootstrap_operator_email", {
      email,
      username: operator.username,
      promoted,
    });
  }

  for (const name of usernames) {
    const operator = await prisma.user.findFirst({
      where: { username: { equals: name, mode: "insensitive" } },
      select: { id: true, username: true, role: true, email: true },
    });
    if (!operator) {
      anyMissing = true;
      auditLog("bootstrap_missing_operator", { username: name, demoted });
      continue;
    }
    if (requiredEmail && name === primary && operator.email?.trim().toLowerCase() !== requiredEmail) {
      auditLog("bootstrap_skipped", {
        username: name,
        reason: "operator_email_mismatch",
        demoted,
      });
      return { ok: false, username: name, demoted, promoted: promotedAny, reason: "operator_email_mismatch" };
    }
    const promoted = operator.role !== "OWNER";
    if (promoted) {
      await prisma.user.update({
        where: { id: operator.id },
        data: { role: "OWNER", adminDisabledAt: null },
      });
      promotedAny = true;
    } else if (operator.role === "OWNER") {
      await prisma.user.update({
        where: { id: operator.id },
        data: { adminDisabledAt: null },
      });
    }
  }

  if (anyMissing) {
    return { ok: false, username: primary, demoted, promoted: promotedAny, reason: "operator_account_missing" };
  }

  auditLog("bootstrap_ok", { usernames, demoted, promoted: promotedAny });
  return { ok: true, username: primary, demoted, promoted: promotedAny };
}

/** @deprecated — bootstrapOperatorRole 또는 revokeUnauthorizedAdminRoles 사용 */
export async function ensureOperatorRole(prisma: PrismaClient) {
  return bootstrapOperatorRole(prisma);
}
