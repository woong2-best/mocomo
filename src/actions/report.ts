import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
    case "REGULATED":
      return "ILLEGAL_TRADE";
    case "SEXUAL":
      return "SEXUAL_CONTENT";
    case "UNDERAGE":
      return "CHILD_SAFETY";
    case "VIOLENCE":
      return "THREAT";
    case "SELF_HARM":
      return "SELF_HARM_ENCOURAGEMENT";
    default:
      return "REPORT_RECEIVED";
  }
}

export async function submitContentReport(data: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReasonId;
  /** Hierarchical path label for admin review (e.g. t("actions.s1b277zv")) */
  reasonPath?: string;
  details?: string;
  reportedUserId?: string;
  postId?: string;
  commentId?: string;
}) {
  const user = await requireAuth({ writeKind: "report" });
  const reasonLabel =
    data.reasonPath?.trim() ||
    REPORT_REASONS.find((r) => r.id === data.reason)?.label ||
    data.reason;
  const details = data.details?.trim();

  if (!data.targetId.trim()) return { error: t("actions.s1wr72la") };

  const recent = await db.report.findFirst({
    where: {
      reporterId: user.id,
      targetType: data.targetType,
      targetId: data.targetId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recent) return { error: t("actions.s1m45g3p") };

  let moderationCaseId: string | undefined;
  let reportedUserId = data.reportedUserId;
  if (!reportedUserId || reportedUserId === "anonymous") {
    const postId = data.postId || (data.targetType === "POST" ? data.targetId : undefined);
    if (postId) {
      const row = await db.post.findUnique({
        where: { id: postId },
        select: { authorId: true },
      });
      reportedUserId = row?.authorId;
    }
  }

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

  return { success: true, message: t("actions.so53py5") };
}
