import type { AccountStatus, RiskScoreSource } from "@prisma/client";
import { db } from "@/lib/db";
import {
  RISK_SCORE_RULES,
  type RiskScoreReason,
  riskDecayForDays,
  riskTierFromScore,
} from "@/lib/risk-score-rules";
import { createNotification } from "@/lib/notifications";

export async function addRiskScore(params: {
  userId: string;
  reason: RiskScoreReason | string;
  delta?: number;
  source?: RiskScoreSource;
  metadata?: Record<string, unknown>;
  skipAutoActions?: boolean;
}) {
  const delta =
    params.delta ??
    (params.reason in RISK_SCORE_RULES
      ? RISK_SCORE_RULES[params.reason as RiskScoreReason]
      : 0);
  if (delta === 0) return { delta: 0, scoreAfter: 0 };

  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: {
      riskScore: true,
      accountStatus: true,
      priorSanctionCount: true,
    },
  });
  if (!user) return { delta: 0, scoreAfter: 0 };

  const scoreAfter = Math.max(0, user.riskScore + delta);

  await db.$transaction([
    db.user.update({
      where: { id: params.userId },
      data: {
        riskScore: scoreAfter,
        riskScoreUpdatedAt: new Date(),
      },
    }),
    db.riskScoreEvent.create({
      data: {
        userId: params.userId,
        delta,
        reason: params.reason,
        source: params.source ?? "SYSTEM",
        scoreAfter,
        metadata: params.metadata ? (params.metadata as object) : undefined,
      },
    }),
  ]);

  if (!params.skipAutoActions) {
    await applyRiskAutoActions(params.userId, scoreAfter, user.accountStatus);
  }

  return { delta, scoreAfter };
}

export async function applyRiskAutoActions(
  userId: string,
  score: number,
  currentStatus: AccountStatus
) {
  const tier = riskTierFromScore(score);
  const patch: {
    moderationReviewRequired?: boolean;
    moderationUrgentReview?: boolean;
    sanctionPendingApproval?: boolean;
    accountStatus?: AccountStatus;
  } = {};

  if (tier === "caution") {
    await createNotification({
      userId,
      type: "SYSTEM",
      title: "계정 주의 안내",
      body: "커뮤니티 운영원칙 위반 가능성이 감지되었습니다. 추가 위반 시 제한될 수 있습니다.",
      link: "/legal/policy",
    });
  }

  if (tier === "limited" && currentStatus === "ACTIVE") {
    patch.accountStatus = "LIMITED";
    await createNotification({
      userId,
      type: "SYSTEM",
      title: "기능 일부 제한",
      body: "위험도 점수로 인해 댓글·DM·라이브 등 일부 기능이 제한되었습니다.",
    });
  }

  if (tier === "review" || tier === "pending_sanction" || tier === "urgent") {
    patch.moderationReviewRequired = true;
  }
  if (tier === "pending_sanction") {
    patch.sanctionPendingApproval = true;
  }
  if (tier === "urgent") {
    patch.moderationUrgentReview = true;
  }

  if (Object.keys(patch).length > 0) {
    await db.user.update({ where: { id: userId }, data: patch });
  }
}

export async function resetRiskScore(userId: string, adminId: string, reason: string) {
  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        riskScore: 0,
        riskScoreUpdatedAt: new Date(),
        moderationReviewRequired: false,
        moderationUrgentReview: false,
        sanctionPendingApproval: false,
      },
    }),
    db.riskScoreEvent.create({
      data: {
        userId,
        delta: 0,
        reason: `admin_reset: ${reason}`,
        source: "ADMIN",
        scoreAfter: 0,
        metadata: { adminId },
      },
    }),
  ]);
}

export async function decayRiskScoresBatch() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const users = await db.user.findMany({
    where: {
      riskScore: { gt: 0 },
      OR: [{ lastRiskDecayAt: null }, { lastRiskDecayAt: { lte: since } }],
    },
    select: {
      id: true,
      riskScore: true,
      lastRiskDecayAt: true,
      riskScoreUpdatedAt: true,
    },
    take: 200,
  });

  let updated = 0;
  for (const user of users) {
    const anchor = user.riskScoreUpdatedAt ?? user.lastRiskDecayAt ?? new Date();
    const cleanDays = Math.floor((Date.now() - anchor.getTime()) / (24 * 60 * 60 * 1000));
    const decay = riskDecayForDays(cleanDays);
    if (decay <= 0) continue;

    const scoreAfter = Math.max(0, user.riskScore - decay);
    if (scoreAfter === user.riskScore) continue;

    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: {
          riskScore: scoreAfter,
          lastRiskDecayAt: new Date(),
          riskScoreUpdatedAt: new Date(),
        },
      }),
      db.riskScoreEvent.create({
        data: {
          userId: user.id,
          delta: -decay,
          reason: "time_decay",
          source: "AUTO",
          scoreAfter,
        },
      }),
    ]);
    updated += 1;
  }

  return { updated };
}

export async function upsertModerationCaseForReport(reportedUserId: string, riskScore: number) {
  const open = await db.moderationCase.findFirst({
    where: { reportedUserId, status: { in: ["OPEN", "REVIEWING"] } },
    orderBy: { createdAt: "desc" },
  });

  if (open) {
    return db.moderationCase.update({
      where: { id: open.id },
      data: {
        reportCount: { increment: 1 },
        riskScoreSnapshot: Math.max(open.riskScoreSnapshot, riskScore),
        updatedAt: new Date(),
      },
    });
  }

  return db.moderationCase.create({
    data: {
      reportedUserId,
      riskScoreSnapshot: riskScore,
      reportCount: 1,
    },
  });
}
