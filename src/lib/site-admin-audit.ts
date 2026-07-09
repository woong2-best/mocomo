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
  | "OPERATOR_BOOTSTRAP";

export async function logSiteAdminAudit(input: {
  actorId: string;
  action: SiteAdminAuditAction;
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
