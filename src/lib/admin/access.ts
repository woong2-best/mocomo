import { auth, requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ALL_ADMIN_PERMISSIONS,
  hasAdminPermission,
  isAdminCmsRole,
  pathPermission,
  permissionsForRole,
  type AdminPermission,
} from "@/lib/admin/permissions";
import { resolveEffectiveStaffRole } from "@/lib/staff-roles";
import { isOperatorIdentity } from "@/lib/operator-config";
import { logSiteAdminAudit } from "@/lib/site-admin-audit";

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
  if (dbUser.adminDisabledAt) {
    throw new AdminAccessError(403, "ADMIN_DISABLED");
  }

  const role = resolveEffectiveStaffRole({
    username: dbUser.username,
    role: dbUser.role,
    email: dbUser.email,
  });
  const operator = isOperatorIdentity({
    username: dbUser.username,
    role: dbUser.role,
    email: dbUser.email,
  });

  if (!operator && !isAdminCmsRole(role)) {
    throw new AdminAccessError(403, "FORBIDDEN");
  }

  return {
    id: dbUser.id,
    username: dbUser.username,
    email: dbUser.email,
    name: dbUser.name,
    image: dbUser.image,
    role: operator ? "OWNER" : role,
    permissions: operator ? ALL_ADMIN_PERMISSIONS : permissionsForRole(role),
  };
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

/** 기존 requireAdmin 호환 — 운영자급 (ADMIN+) */
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
