import { headers } from "next/headers";
import type { Prisma, UserRole } from "@prisma/client";
import { db } from "@/lib/db";

export async function logModerationAudit(input: {
  adminId: string;
  action: string;
  targetUserId?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  let ip: string | undefined;
  let userAgent: string | undefined;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined;
    userAgent = h.get("user-agent") ?? undefined;
  } catch {
    /* outside request */
  }

  await db.moderationAuditLog.create({
    data: {
      adminId: input.adminId,
      action: input.action,
      targetUserId: input.targetUserId,
      beforeState: input.beforeState as Prisma.InputJsonValue | undefined,
      afterState: input.afterState as Prisma.InputJsonValue | undefined,
      reason: input.reason,
      ip,
      userAgent,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export type ModerationSanctionType =
  | "warning"
  | "limited"
  | "read_only"
  | "temp_7"
  | "temp_30"
  | "permanent"
  | "restore";

export const MODERATION_SANCTION_LABELS: Record<ModerationSanctionType, string> = {
  warning: "경고",
  limited: "일부 제한",
  read_only: "읽기 전용",
  temp_7: "7일 정지",
  temp_30: "30일 정지",
  permanent: "영구 정지",
  restore: "복구",
};
