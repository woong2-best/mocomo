"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { ReportTargetType } from "@prisma/client";

export const REPORT_REASONS = [
  { id: "SPAM", label: "스팸·광고" },
  { id: "ABUSE", label: "욕설·괴롭힘" },
  { id: "FRAUD", label: "사기·허위 거래" },
  { id: "ILLEGAL", label: "불법·음란 콘텐츠" },
  { id: "OTHER", label: "기타" },
] as const;

export type ReportReasonId = (typeof REPORT_REASONS)[number]["id"];

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

  await db.report.create({
    data: {
      reporterId: user.id,
      targetType: data.targetType,
      targetId: data.targetId,
      reason: reasonLabel,
      details: details || null,
      reportedUserId: data.reportedUserId,
      postId: data.postId,
      commentId: data.commentId,
    },
  });

  return { success: true, message: "신고가 접수되었습니다. 검토 후 조치하겠습니다." };
}
