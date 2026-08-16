import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ReportTargetType } from "@prisma/client";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { addRiskScore, upsertModerationCaseForReport } from "@/lib/risk-score";
import { REPORT_REASONS, type ReportReasonId } from "@/lib/report-reasons";

const bodySchema = z.object({
  userId: z.string().min(1).max(64),
  username: z.string().max(64).optional(),
  postId: z.string().max(64).optional(),
  reason: z.enum(REPORT_REASONS.map((r) => r.id) as [ReportReasonId, ...ReportReasonId[]]),
  details: z.string().max(2000).optional(),
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
      return "ILLEGAL_TRADE";
    case "SEXUAL":
      return "SEXUAL_CONTENT";
    default:
      return "REPORT_RECEIVED";
  }
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-user-block-report", 20);
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

  const { userId: targetUserId, username, postId, reason, details } = parsed.data;
  if (auth.user.id === targetUserId) {
    return NextResponse.json({ error: "자기 자신은 차단할 수 없습니다." }, { status: 400 });
  }

  const targetType: ReportTargetType = postId ? "POST" : "USER";
  const targetId = postId ?? targetUserId;
  const reasonLabel = REPORT_REASONS.find((r) => r.id === reason)?.label ?? reason;
  const trimmedDetails = details?.trim();

  const recent = await db.report.findFirst({
    where: {
      reporterId: auth.user.id,
      targetType,
      targetId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recent) {
    return NextResponse.json({ error: "이미 최근에 신고한 콘텐츠입니다." }, { status: 400 });
  }

  const { scoreAfter } = await addRiskScore({
    userId: targetUserId,
    reason: riskReasonForReport(reason),
    source: "REPORT",
    metadata: { targetType, targetId, reporterId: auth.user.id },
  });
  const moderationCase = await upsertModerationCaseForReport(targetUserId, scoreAfter);
  const moderationCaseId = moderationCase.id;

  await db.report.create({
    data: {
      reporterId: auth.user.id,
      targetType,
      targetId,
      reason: reasonLabel,
      details: trimmedDetails || null,
      reportedUserId: targetUserId,
      postId: postId ?? null,
      moderationCaseId,
    },
  });

  await db.$transaction([
    db.userBlock.upsert({
      where: {
        blockerId_blockedId: { blockerId: auth.user.id, blockedId: targetUserId },
      },
      create: { blockerId: auth.user.id, blockedId: targetUserId },
      update: {},
    }),
    db.follow.deleteMany({
      where: {
        OR: [
          { followerId: auth.user.id, followingId: targetUserId },
          { followerId: targetUserId, followingId: auth.user.id },
        ],
      },
    }),
  ]);

  if (username) revalidatePath(`/u/${username}`);
  return NextResponse.json({
    ok: true,
    blocked: true,
    message: "신고가 접수되었고 사용자를 차단했습니다.",
  });
}
