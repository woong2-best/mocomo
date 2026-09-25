import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { ReportTargetType } from "@prisma/client";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { addRiskScore, upsertModerationCaseForReport } from "@/lib/risk-score";
import {
  REPORT_REASON_IDS,
  REPORT_REASONS,
  type ReportReasonId,
} from "@/lib/report-reasons";

const bodySchema = z.object({
  targetType: z.enum(["POST", "USER", "COMMENT", "MESSAGE", "USED_LISTING"]),
  targetId: z.string().min(1).max(64),
  reason: z.enum(REPORT_REASON_IDS),
  reasonPath: z.string().max(500).optional(),
  details: z.string().max(2000).optional(),
  reportedUserId: z.string().max(64).optional(),
  postId: z.string().max(64).optional(),
  commentId: z.string().max(64).optional(),
});

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

/** Report-only (no block) — used by reels / post report icon. */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-content-report", 30);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "report" });
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
  }

  const data = parsed.data;
  const targetType = data.targetType as ReportTargetType;
  const reasonLabel =
    data.reasonPath?.trim() ||
    REPORT_REASONS.find((r) => r.id === data.reason)?.label ||
    data.reason;
  const trimmedDetails = data.details?.trim();

  const recent = await db.report.findFirst({
    where: {
      reporterId: auth.user.id,
      targetType,
      targetId: data.targetId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recent) {
    return NextResponse.json({ error: "이미 최근에 신고한 콘텐츠입니다." }, { status: 400 });
  }

  let moderationCaseId: string | undefined;
  let reportedUserId = data.reportedUserId;
  if (!reportedUserId || reportedUserId === "anonymous") {
    const postId = data.postId || (targetType === "POST" ? data.targetId : undefined);
    if (postId) {
      const row = await db.post.findUnique({
        where: { id: postId },
        select: { authorId: true },
      });
      reportedUserId = row?.authorId;
    }
  }

  if (!reportedUserId && targetType === "USER") {
    reportedUserId = data.targetId;
  }

  if (!reportedUserId && targetType === "USED_LISTING") {
    const row = await db.usedListing.findUnique({
      where: { id: data.targetId },
      select: { sellerId: true },
    });
    reportedUserId = row?.sellerId;
  }

  if (reportedUserId && reportedUserId !== auth.user.id) {
    const { scoreAfter } = await addRiskScore({
      userId: reportedUserId,
      reason: riskReasonForReport(data.reason),
      source: "REPORT",
      metadata: {
        targetType,
        targetId: data.targetId,
        reporterId: auth.user.id,
      },
    });
    const moderationCase = await upsertModerationCaseForReport(reportedUserId, scoreAfter);
    moderationCaseId = moderationCase.id;
  }

  await db.report.create({
    data: {
      reporterId: auth.user.id,
      targetType,
      targetId: data.targetId,
      reason: reasonLabel,
      details: trimmedDetails || null,
      reportedUserId: reportedUserId ?? null,
      postId: data.postId ?? null,
      commentId: data.commentId ?? null,
      moderationCaseId,
    },
  });

  return NextResponse.json({
    ok: true,
    message: "신고가 접수되었습니다. 검토 후 조치하겠습니다.",
  });
}
