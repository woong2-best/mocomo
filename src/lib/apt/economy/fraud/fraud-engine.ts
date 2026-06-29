import { db } from "@/lib/db";
import { getEnabledFraudRules } from "./fraud-rules";
import { runFraudDetectors } from "./fraud-detectors";
import {
  scoreToStatus,
  type FraudRuleCode,
  type FraudStatus,
} from "./fraud-types";
import type { FraudRuleConfig } from "./fraud-rule-thresholds";

export type FraudEvaluationHit = {
  rule: string;
  score: number;
  evidence: Record<string, unknown>;
};

export type FraudEvaluation = {
  score: number;
  status: FraudStatus;
  hits: FraudEvaluationHit[];
};

function aggregateHits(hits: { rule: string; score: number; evidence: Record<string, unknown> }[]): FraudEvaluation {
  const score = Math.min(100, hits.reduce((a, h) => a + h.score, 0));
  return {
    score,
    status: scoreToStatus(score),
    hits: hits.map((h) => ({ rule: h.rule, score: h.score, evidence: h.evidence })),
  };
}

export async function evaluateUserFraudRisk(
  userId: string,
  rules: FraudRuleConfig[]
): Promise<FraudEvaluation> {
  const profile = await db.aptFraudProfile.findUnique({ where: { userId } });
  if (profile?.whitelistedUntil && profile.whitelistedUntil > new Date()) {
    return {
      score: profile.riskScore,
      status: profile.status as FraudStatus,
      hits: [],
    };
  }

  const rawHits = await runFraudDetectors(userId, rules);
  return aggregateHits(
    rawHits.map((h) => ({
      rule: h.rule,
      score: h.score,
      evidence: h.evidence as Record<string, unknown>,
    }))
  );
}

export async function recalculateUserFraudRisk(
  userId: string
): Promise<{ score: number; status: FraudStatus; hits: { rule: string; score: number }[] }> {
  const profile = await db.aptFraudProfile.findUnique({ where: { userId } });
  if (profile?.whitelistedUntil && profile.whitelistedUntil > new Date()) {
    return {
      score: profile.riskScore,
      status: profile.status as FraudStatus,
      hits: [],
    };
  }

  const rules = await getEnabledFraudRules();
  const evaluation = await evaluateUserFraudRisk(userId, rules);
  const { score, status, hits } = evaluation;
  const reasonSummary =
    hits.length > 0 ? hits.map((h) => h.rule).join(", ") : null;
  const now = new Date();

  await db.$transaction(async (tx) => {
    for (const h of hits) {
      await tx.aptFraudEvent.create({
        data: {
          userId,
          rule: h.rule,
          scoreDelta: h.score,
          evidence: h.evidence as object,
        },
      });
    }

    await tx.aptFraudProfile.upsert({
      where: { userId },
      create: {
        userId,
        riskScore: score,
        status,
        reasonSummary,
        lastCalculatedAt: now,
      },
      update: {
        riskScore: score,
        status,
        reasonSummary,
        lastCalculatedAt: now,
      },
    });

    if (hits.length > 0 || score > 0) {
      await tx.aptFraudScoreHistory.create({
        data: {
          userId,
          score,
          status,
          triggers: hits.map((h) => ({ rule: h.rule, score: h.score })),
        },
      });
    }
  });

  return {
    score,
    status,
    hits: hits.map((h) => ({ rule: h.rule, score: h.score })),
  };
}

export async function scanActiveUsersForFraud(limit = 100): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const active = await db.aptWalletTransaction.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: since } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  let count = 0;
  for (const row of active) {
    await recalculateUserFraudRisk(row.userId);
    count += 1;
  }
  return count;
}

export async function simulateFraudRuleImpact(
  draftRules: FraudRuleConfig[],
  sampleLimit = 300
): Promise<{
  sampleSize: number;
  current: Record<FraudStatus, number>;
  projected: Record<FraudStatus, number>;
}> {
  const currentRules = await getEnabledFraudRules();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [fromProfiles, fromEvents] = await Promise.all([
    db.aptFraudProfile.findMany({
      where: { OR: [{ riskScore: { gte: 30 } }, { lastCalculatedAt: { gte: since } }] },
      select: { userId: true },
      take: sampleLimit,
    }),
    db.aptFraudEvent.findMany({
      where: { createdAt: { gte: since } },
      select: { userId: true },
      distinct: ["userId"],
      take: sampleLimit,
    }),
  ]);

  const userIds = [...new Set([...fromProfiles.map((p) => p.userId), ...fromEvents.map((e) => e.userId)])].slice(
    0,
    sampleLimit
  );

  const empty: Record<FraudStatus, number> = {
    NORMAL: 0,
    WATCH: 0,
    SUSPICIOUS: 0,
    HIGH_RISK: 0,
  };
  const current = { ...empty };
  const projected = { ...empty };

  for (const userId of userIds) {
    const [cur, next] = await Promise.all([
      evaluateUserFraudRisk(userId, currentRules),
      evaluateUserFraudRisk(userId, draftRules),
    ]);
    current[cur.status] += 1;
    projected[next.status] += 1;
  }

  return { sampleSize: userIds.length, current, projected };
}

export type { FraudRuleCode };
