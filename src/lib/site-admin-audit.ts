import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type SiteAdminAuditAction =
  | "VIEW_USER_PII"
  | "EXPORT_USER_DATA"
  | "SEARCH_USER_CS"
  | "MODERATION_ACTION"
  | "PAYOUT_PROCESS"
  | "ECONOMY_MUTATION"
  | "OPERATOR_BOOTSTRAP"
  | "MARKETPLACE_ADMIN_VIEW"
  | "MARKETPLACE_DISPUTE_RESOLVE"
  | "MARKETPLACE_SANCTION"
  | "ADMIN_LOGIN"
  | "ADMIN_LOGOUT"
  | "USER_SUSPEND"
  | "USER_RESTORE"
  | "USER_SOFT_DELETE"
  | "USER_PREMIUM_GRANT"
  | "USER_USERNAME_CHANGE"
  | "USER_MEMO"
  | "ADMIN_ROLE_CHANGE"
  | "ADMIN_CREATE"
  | "ADMIN_DISABLE"
  | "ADMIN_ENABLE"
  | "ADMIN_PASSWORD_RESET"
  | "SETTINGS_UPDATE"
  | "DASHBOARD_VIEW"
  | "AUDIT_VIEW";

export async function logSiteAdminAudit(input: {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  let ip: string | undefined;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined;
  } catch {
    /* headers() unavailable outside request */
  }

  try {
    await db.siteAdminAuditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        ip,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (e) {
    console.error("[site-admin-audit] write failed", e);
  }
}
