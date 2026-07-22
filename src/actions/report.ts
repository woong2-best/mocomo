"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { ReportTargetType } from "@prisma/client";
import { addRiskScore, upsertModerationCaseForReport } from "@/lib/risk-score";
import { REPORT_REASONS, type ReportReasonId } from "@/lib/report-reasons";

function riskReasonForReport(reason: ReportReasonId): string {
  switch (reason) {
    case "SPAM":
      return "SPAM_POST";
    case "HATE":
      return "HATE_SPEECH";
    case "ABUSE":
    case "HARASSMENT":
      return "PROFANITY";
    case "IMPERSONATION":
      return "IMPERSONATION";
    case "FRAUD":
      return "ILLEGAL_TRADE";
    case "SEXUAL":
      return "SEXUAL_CONTENT";
    default:
      return "REPORT_RECEIVED";
  }
}

export async function submitContentReport(data: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReasonId;
  details?: string;
  reportedUserId?: string;
  postId?: string;
  commentId?: string;
}) {
  const user = await requireAuth({ writeKind: "report" });
  const reasonLabel = REPORT_REASONS.find((r) => r.id === data.reason)?.label ?? data.reason;
  const details = data.details?.trim();

  if (!data.targetId.trim()) return { error: "신고 대상을 찾을 수 없습니다." };

  const recent = await db.report.findFirst({
    where: {
      reporterId: user.id,
      targetType: data.targetType,
      targetId: data.targetId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recent) return { error: "이미 최근에 신고한 콘텐츠입니다." };

  let moderationCaseId: string | undefined;
  let reportedUserId = data.reportedUserId;

  if (!reportedUserId && data.targetType === "USER") {
    reportedUserId = data.targetId;
  }

  if (reportedUserId) {
    const { scoreAfter } = await addRiskScore({
      userId: reportedUserId,
      reason: riskReasonForReport(data.reason),
      source: "REPORT",
      metadata: { targetType: data.targetType, targetId: data.targetId, reporterId: user.id },
    });
    const moderationCase = await upsertModerationCaseForReport(reportedUserId, scoreAfter);
    moderationCaseId = moderationCase.id;
  }

  await db.report.create({
    data: {
      reporterId: user.id,
      targetType: data.targetType,
      targetId: data.targetId,
      reason: reasonLabel,
      details: details || null,
      reportedUserId,
      postId: data.postId,
      commentId: data.commentId,
      moderationCaseId,
    },
  });

  return { success: true, message: "신고가 접수되었습니다. 검토 후 조치하겠습니다." };
}
