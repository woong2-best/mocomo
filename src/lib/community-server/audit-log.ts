import { db } from "@/lib/db";

export async function logCommunityAudit(data: {
  communityId: string;
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: string;
}) {
  try {
    await db.communityAuditLog.create({
      data: {
        communityId: data.communityId,
        actorId: data.actorId,
        action: data.action,
        targetType: data.targetType ?? null,
        targetId: data.targetId ?? null,
        detail: data.detail?.slice(0, 500) ?? null,
      },
    });
  } catch {
    /* table may not exist yet */
  }
}
