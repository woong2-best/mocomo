import { auth, requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  hasAdminPermission,
  isAdminCmsRole,
  pathPermission,
  permissionsForRole,
  type AdminPermission,
} from "@/lib/admin/permissions";
import { resolveEffectiveStaffRole } from "@/lib/staff-roles";
import { isOperatorIdentity, isSiteOperatorAccount } from "@/lib/operator-config";
import { logSiteAdminAudit } from "@/lib/site-admin-audit";
import {
  hasValidAdminMfa,
  hasValidAdminStepUp,
  touchAdminMfaActivity,
} from "@/lib/admin/mfa-service";
import { getAdminEnrollmentStatus } from "@/lib/admin/security/enrollment";

export class AdminAccessError extends Error {
  status: 401 | 403;
  constructor(status: 401 | 403, message: string) {
    super(message);
    this.name = "AdminAccessError";
    this.status = status;
  }
}

export type AdminActor = {
  id: string;
  username: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role: string;
  permissions: AdminPermission[];
};

/** 사이트 오너 계정 DB role을 OWNER로 맞추고 비활성 플래그 해제 */
async function ensureSiteOwnerRecord(user: {
  id: string;
  username: string;
  email: string | null;
  role: string;
  adminDisabledAt: Date | null;
}) {
  if (!isSiteOperatorAccount(user)) return;
  if (user.role !== "OWNER" || user.adminDisabledAt) {
    await db.user.update({
      where: { id: user.id },
      data: { role: "OWNER", adminDisabledAt: null },
    });
  }
}

export async function getAdminActor(): Promise<AdminActor> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AdminAccessError(401, "UNAUTHORIZED");
  }

  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      image: true,
      role: true,
      adminDisabledAt: true,
      deletedAt: true,
      isBanned: true,
    },
  });

  if (!dbUser || dbUser.deletedAt || dbUser.isBanned) {
    throw new AdminAccessError(403, "FORBIDDEN");
  }

  const operator = isSiteOperatorAccount(dbUser);
  if (operator) {
    await ensureSiteOwnerRecord(dbUser);
  } else if (dbUser.adminDisabledAt) {
    throw new AdminAccessError(403, "ADMIN_DISABLED");
  }

  const role = resolveEffectiveStaffRole({
    username: dbUser.username,
    role: operator ? "OWNER" : dbUser.role,
    email: dbUser.email,
  });

  if (!operator && !isAdminCmsRole(role)) {
    throw new AdminAccessError(403, "FORBIDDEN");
  }

  const effectiveRole = operator ? "OWNER" : role;

  const enrollment = await getAdminEnrollmentStatus(dbUser.id);
  if (!enrollment.complete) {
    throw new AdminAccessError(401, "ADMIN_ENROLLMENT_REQUIRED");
  }

  const mfaOk = await hasValidAdminMfa(dbUser.id);
  if (!mfaOk) {
    throw new AdminAccessError(401, "ADMIN_MFA_REQUIRED");
  }

  void touchAdminMfaActivity(dbUser.id);

  return {
    id: dbUser.id,
    username: dbUser.username,
    email: dbUser.email,
    name: dbUser.name,
    image: dbUser.image,
    role: effectiveRole,
    permissions: permissionsForRole(effectiveRole),
  };
}

/** 중요 작업 — Passkey+TOTP step-up 재인증 필요 */
export async function requireAdminStepUp(
  permission: AdminPermission,
  audit?: {
    action: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<AdminActor> {
  const actor = await requireAdminPermission(permission, audit);
  const ok = await hasValidAdminStepUp(actor.id);
  if (!ok) {
    throw new AdminAccessError(401, "ADMIN_STEPUP_REQUIRED");
  }
  return actor;
}

export async function requireAdminPermission(
  permission: AdminPermission,
  audit?: {
    action: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<AdminActor> {
  const actor = await getAdminActor();
  if (!actor.permissions.includes(permission) && !hasAdminPermission(actor.role, permission)) {
    throw new AdminAccessError(403, "FORBIDDEN");
  }
  if (audit) {
    void logSiteAdminAudit({
      actorId: actor.id,
      action: audit.action,
      targetType: audit.targetType,
      targetId: audit.targetId,
      metadata: audit.metadata,
    });
  }
  return actor;
}

export async function requireAdminPathAccess(pathname: string) {
  const permission = pathPermission(pathname) ?? "dashboard";
  return requireAdminPermission(permission);
}

/** 사이트 오너(OPERATOR) 전용 */
export async function requireOperatorAdmin(audit?: {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  const user = await requireAuth();
  if (!isOperatorIdentity({ username: user.username, role: user.role, email: user.email })) {
    throw new Error("FORBIDDEN");
  }
  if (audit) {
    void logSiteAdminAudit({
      actorId: user.id,
      action: audit.action,
      targetType: audit.targetType,
      targetId: audit.targetId,
      metadata: audit.metadata,
    });
  }
  return user;
}
