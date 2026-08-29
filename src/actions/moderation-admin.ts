"use server";

import { revalidatePath } from "next/cache";
import type { AccountStatus, UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  banUser,
  restoreUserAccount,
  suspendUserPermanently,
  suspendUserTemporary,
} from "@/actions/admin";
import { canApplySanction, canCreateRole, canCreateStaff, hasMinStaffRole } from "@/lib/staff-roles";
import {
  type ModerationSanctionType,
} from "@/lib/moderation-sanctions";
import { logModerationAudit } from "@/lib/moderation-audit";
import { resetRiskScore } from "@/lib/risk-score";
import { riskTierFromScore, riskTierLabel } from "@/lib/risk-score-rules";
import { createNotification } from "@/lib/notifications";
import { logSiteAdminAudit } from "@/lib/site-admin-audit";
import {
  repeatViolatorsEscalationReason,
  shouldAutoEscalateToPermanentBan,
} from "@/lib/moderation-repeat-violators";

async function countUserWarnings(userId: string): Promise<number> {
  return db.moderationAuditLog.count({
    where: { targetUserId: userId, action: "sanction_warning" },
  });
}

async function requireStaff(minRole: UserRole = "MODERATOR") {
  const user = await requireAuth({ writeKind: "notification" });
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, username: true, role: true, email: true },
  });
  if (!dbUser || !hasMinStaffRole(dbUser, minRole)) throw new Error("FORBIDDEN");
  return dbUser;
}

export async function getModerationUserDetail(userId: string) {
  await requireStaff("MODERATOR");

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      riskScore: true,
      accountStatus: true,
      suspensionReason: true,
      priorSanctionCount: true,
      moderationReviewRequired: true,
      moderationUrgentReview: true,
      sanctionPendingApproval: true,
      createdAt: true,
      _count: { select: { reportsAgainst: true } },
    },
  });
  if (!user) return null;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    recentPosts,
    recentComments,
    dmCount,
    liveChatCount,
    riskEvents,
    suspensionLogs,
    ai,
    openCase,
  ] = await Promise.all([
    db.post.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, content: true, title: true, createdAt: true },
    }),
    db.comment.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, content: true, createdAt: true },
    }),
    db.message.count({
      where: { senderId: userId, createdAt: { gte: weekAgo } },
    }),
    db.liveChatMessage.count({
      where: { userId, createdAt: { gte: weekAgo } },
    }),
    db.riskScoreEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.accountSuspensionLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.moderationAiAnalysis.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    db.moderationCase.findFirst({
      where: { reportedUserId: userId, status: { in: ["OPEN", "REVIEWING"] } },
      orderBy: { updatedAt: "desc" },
      include: { reports: { take: 5, orderBy: { createdAt: "desc" } } },
    }),
  ]);

  return {
    ...user,
    riskTier: riskTierLabel(riskTierFromScore(user.riskScore)),
    recentPosts,
    recentComments,
    dmCountWeek: dmCount,
    liveChatCountWeek: liveChatCount,
    riskEvents,
    suspensionLogs,
    aiRecommendation: ai?.recommendedAction ?? openCase?.recommendedAction ?? null,
    aiConfidence: ai?.confidence ?? openCase?.aiConfidence ?? null,
    aiReason: ai?.recommendedReason ?? openCase?.recommendedReason ?? null,
    openCase,
  };
}

export async function getModerationReviewQueue() {
  await requireStaff("MODERATOR");

  const users = await db.user.findMany({
    where: {
      OR: [
        { moderationReviewRequired: true },
        { moderationUrgentReview: true },
        { sanctionPendingApproval: true },
        { riskScore: { gte: 120 } },
      ],
    },
    orderBy: [{ moderationUrgentReview: "desc" }, { riskScore: "desc" }],
    take: 50,
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      riskScore: true,
      accountStatus: true,
      suspensionReason: true,
      moderationReviewRequired: true,
      moderationUrgentReview: true,
      sanctionPendingApproval: true,
      priorSanctionCount: true,
      createdAt: true,
      _count: { select: { reportsAgainst: true } },
    },
  });

  const enriched = await Promise.all(
    users.map(async (u) => {
      const [recentReports, ai, suspensionLogs, moderationCase] = await Promise.all([
        db.report.count({
          where: { reportedUserId: u.id, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        }),
        db.moderationAiAnalysis.findFirst({
          where: { userId: u.id },
          orderBy: { createdAt: "desc" },
        }),
        db.accountSuspensionLog.findMany({
          where: { userId: u.id },
          orderBy: { createdAt: "desc" },
          take: 3,
        }),
        db.moderationCase.findFirst({
          where: { reportedUserId: u.id, status: { in: ["OPEN", "REVIEWING"] } },
          orderBy: { updatedAt: "desc" },
        }),
      ]);

      return {
        ...u,
        riskTier: riskTierLabel(riskTierFromScore(u.riskScore)),
        recentReportCount: recentReports,
        aiRecommendation: ai?.recommendedAction ?? moderationCase?.recommendedAction ?? null,
        aiConfidence: ai?.confidence ?? moderationCase?.aiConfidence ?? null,
        aiReason: ai?.recommendedReason ?? moderationCase?.recommendedReason ?? null,
        suspensionLogs,
      };
    })
  );

  return enriched;
}

export async function applyModerationSanction(
  targetUserId: string,
  sanction: ModerationSanctionType,
  reason: string
) {
  const admin = await requireStaff("MODERATOR");
  if (!canApplySanction(admin.role, sanction)) return { error: "권한이 없습니다." };
  if (!reason.trim()) return { error: "제재 사유를 입력해 주세요." };

  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      accountStatus: true,
      riskScore: true,
      priorSanctionCount: true,
    },
  });
  if (!target) return { error: "사용자를 찾을 수 없습니다." };

  const before = {
    accountStatus: target.accountStatus,
    riskScore: target.riskScore,
  };

  let effectiveSanction = sanction;

  if (sanction === "warning") {
    await createNotification({
      userId: targetUserId,
      type: "SYSTEM",
      title: "운영원칙 위반 경고",
      body: reason.trim(),
    });
    const warningCount = (await countUserWarnings(targetUserId)) + 1;
    if (shouldAutoEscalateToPermanentBan(warningCount)) {
      effectiveSanction = "permanent";
      const escalationReason = repeatViolatorsEscalationReason(warningCount);
      await suspendUserPermanently(targetUserId, escalationReason);
      await createNotification({
        userId: targetUserId,
        type: "SYSTEM",
        title: "계정 영구 정지 — 반복 위반",
        body: escalationReason,
        link: "/appeal",
      });
    }
  } else if (sanction === "limited") {
    await db.user.update({
      where: { id: targetUserId },
      data: { accountStatus: "LIMITED", suspensionReason: reason.trim(), suspendedAt: new Date() },
    });
  } else if (sanction === "read_only") {
    await suspendUserPermanently(targetUserId, reason.trim());
  } else if (sanction === "temp_7") {
    await suspendUserTemporary(
      targetUserId,
      reason.trim(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );
  } else if (sanction === "temp_30") {
    await suspendUserTemporary(
      targetUserId,
      reason.trim(),
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );
  } else if (sanction === "permanent") {
    await suspendUserPermanently(targetUserId, reason.trim());
  } else if (sanction === "restore") {
    await restoreUserAccount(targetUserId, reason.trim());
    await resetRiskScore(targetUserId, admin.id, reason.trim());
  }

  const afterUser = await db.user.update({
    where: { id: targetUserId },
    data: {
      moderationReviewRequired: false,
      moderationUrgentReview: false,
      sanctionPendingApproval: false,
      priorSanctionCount:
        sanction === "restore" ? target.priorSanctionCount : { increment: 1 },
    },
    select: { accountStatus: true, riskScore: true },
  });

  await db.moderationCase.updateMany({
    where: { reportedUserId: targetUserId, status: { in: ["OPEN", "REVIEWING"] } },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });

  await logModerationAudit({
    adminId: admin.id,
    action: `sanction_${sanction}`,
    targetUserId,
    beforeState: before,
    afterState: afterUser as Record<string, unknown>,
    reason: reason.trim(),
    metadata: {
      riskScore: target.riskScore,
      autoEscalated: effectiveSanction !== sanction ? effectiveSanction : undefined,
    },
  });

  if (effectiveSanction !== sanction && effectiveSanction === "permanent") {
    await logModerationAudit({
      adminId: admin.id,
      action: "sanction_permanent_auto",
      targetUserId,
      beforeState: before,
      afterState: afterUser as Record<string, unknown>,
      reason: repeatViolatorsEscalationReason(await countUserWarnings(targetUserId)),
      metadata: { triggeredBy: "repeat_violators_policy" },
    });
  }

  await logSiteAdminAudit({
    actorId: admin.id,
    action: "MODERATION_ACTION",
    targetType: "user",
    targetId: targetUserId,
    metadata: { sanction, reason: reason.trim() },
  });

  if (sanction !== "warning" && sanction !== "restore") {
    await createNotification({
      userId: targetUserId,
      type: "SYSTEM",
      title: "계정 제재 안내",
      body: reason.trim(),
      link: "/appeal",
    });
  }

  revalidatePath("/admin/moderation");
  revalidatePath("/admin/suspensions");
  return { success: true };
}

export async function createStaffMember(input: {
  userId: string;
  role: UserRole;
  reason: string;
  displayName?: string;
}) {
  const creator = await requireStaff("SUPER_ADMIN");
  if (!canCreateStaff(creator.role)) return { error: "권한이 없습니다." };
  if (!canCreateRole(creator.role, input.role)) return { error: "해당 권한을 부여할 수 없습니다." };
  if (!input.reason.trim()) return { error: "사유를 입력해 주세요." };

  const target = await db.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!target) return { error: "사용자를 찾을 수 없습니다." };

  await db.user.update({
    where: { id: input.userId },
    data: { role: input.role },
  });

  let creatorIp: string | undefined;
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    creatorIp = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
  } catch {
    /* noop */
  }

  await db.staffCreationLog.create({
    data: {
      createdUserId: input.userId,
      creatorId: creator.id,
      role: input.role,
      displayName: input.displayName ?? target.name,
      email: target.email,
      reason: input.reason.trim(),
      creatorIp,
    },
  });

  await logModerationAudit({
    adminId: creator.id,
    action: "staff_create",
    targetUserId: input.userId,
    beforeState: { role: target.role },
    afterState: { role: input.role },
    reason: input.reason.trim(),
  });

  return { success: true };
}

export async function getModerationAuditLogs(limit = 50) {
  await requireStaff("ADMIN");
  return db.moderationAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      admin: { select: { username: true, role: true } },
    },
  });
}

export async function recordAiModerationResult(params: {
  userId: string;
  contentType: string;
  contentId?: string;
  categories: Record<string, boolean>;
  confidence?: number;
}) {
  const deltas = await import("@/lib/risk-score-rules").then((m) =>
    m.mapAiCategoriesToRisk(params.categories)
  );
  const totalDelta = deltas.reduce((sum, d) => sum + d.delta, 0);
  const top = deltas.sort((a, b) => b.delta - a.delta)[0];

  await db.moderationAiAnalysis.create({
    data: {
      userId: params.userId,
      contentType: params.contentType,
      contentId: params.contentId,
      riskDelta: totalDelta,
      confidence: params.confidence ?? 0.8,
      recommendedAction: totalDelta >= 80 ? "read_only" : totalDelta >= 40 ? "limited" : "warning",
      recommendedReason: top ? `${top.reason} 감지` : "AI 정책 위반 가능성",
      rawResult: params.categories as object,
    },
  });

  if (totalDelta > 0) {
    const { addRiskScore } = await import("@/lib/risk-score");
    await addRiskScore({
      userId: params.userId,
      reason: top?.reason ?? "AI_MODERATION",
      delta: Math.min(100, totalDelta),
      source: "AI",
      metadata: { contentType: params.contentType, contentId: params.contentId },
    });
  }
}
