"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { ReportTargetType } from "@prisma/client";
import { addRiskScore, upsertModerationCaseForReport } from "@/lib/risk-score";

export const REPORT_REASONS = [
  { id: "SPAM", label: "스팸·광고" },
  { id: "ABUSE", label: "욕설·괴롭힘" },
  { id: "HARASSMENT", label: "괴롭힘" },
  { id: "HATE", label: "혐오 표현" },
  { id: "VIOLENCE", label: "폭력" },
  { id: "FRAUD", label: "사기·불법 거래" },
  { id: "PRIVACY", label: "개인정보" },
  { id: "COPYRIGHT", label: "저작권" },
  { id: "SEXUAL", label: "음란물" },
  { id: "IMPERSONATION", label: "사칭" },
  { id: "OTHER", label: "기타" },
] as const;

export type ReportReasonId = (typeof REPORT_REASONS)[number]["id"];

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
