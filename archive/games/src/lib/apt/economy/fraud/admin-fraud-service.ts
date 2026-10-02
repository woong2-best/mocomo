import { db } from "@/lib/db";
import { buildEconomyReplay, type EconomyReplayEntry } from "./economy-replay-service";
import { recalculateUserFraudRisk, scanActiveUsersForFraud } from "./fraud-engine";
import { seedFraudRules } from "./fraud-rules";
import {
  FRAUD_STATUS_LABEL,
  scoreToStatus,
  type FraudStatus,
} from "./fraud-types";

export type FraudDashboardStats = {
  highRisk: number;
  watch: number;
  suspicious: number;
  todayAlerts: number;
};

export type FraudProfileRow = {
  userId: string;
  username: string;
  name: string | null;
  riskScore: number;
  status: FraudStatus;
  reasonSummary: string | null;
  lastCalculatedAt: string | null;
  frozenAt: string | null;
  whitelistedUntil: string | null;
};

export type FraudUserDetail = {
  profile: FraudProfileRow;
  ruleBreakdown: { rule: string; score: number; count: number }[];
  scoreHistory: { at: string; score: number; status: string }[];
  recentEvents: {
    id: string;
    rule: string;
    scoreDelta: number;
    evidence: unknown;
    createdAt: string;
  }[];
  replay: EconomyReplayEntry[];
  actions: {
    id: string;
    action: string;
    reason: string | null;
    adminName: string | null;
    expiresAt: string | null;
    createdAt: string;
  }[];
};

export async function getFraudDashboardStats(): Promise<FraudDashboardStats> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [highRisk, watch, suspicious, todayAlerts] = await Promise.all([
    db.aptFraudProfile.count({ where: { status: "HIGH_RISK" } }),
    db.aptFraudProfile.count({ where: { status: "WATCH" } }),
    db.aptFraudProfile.count({ where: { status: "SUSPICIOUS" } }),
    db.aptFraudEvent.count({ where: { createdAt: { gte: todayStart } } }),
  ]);

  return { highRisk, watch, suspicious, todayAlerts };
}

export async function listFraudProfiles(limit = 50): Promise<FraudProfileRow[]> {
  const rows = await db.aptFraudProfile.findMany({
    orderBy: { riskScore: "desc" },
    take: limit,
    include: { user: { select: { username: true, name: true } } },
  });

  return rows.map((r) => ({
    userId: r.userId,
    username: r.user.username,
    name: r.user.name,
    riskScore: r.riskScore,
    status: r.status as FraudStatus,
    reasonSummary: r.reasonSummary,
    lastCalculatedAt: r.lastCalculatedAt?.toISOString() ?? null,
    frozenAt: r.frozenAt?.toISOString() ?? null,
    whitelistedUntil: r.whitelistedUntil?.toISOString() ?? null,
  }));
}

export async function getFraudUserDetail(userId: string): Promise<FraudUserDetail | null> {
  const row = await db.aptFraudProfile.findUnique({
    where: { userId },
    include: { user: { select: { username: true, name: true } } },
  });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { username: true, name: true },
  });
  if (!user) return null;

  const [events, history, actions, replay] = await Promise.all([
    db.aptFraudEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.aptFraudScoreHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 30,
    }),
    db.aptFraudAction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { admin: { select: { name: true, username: true } } },
    }),
    buildEconomyReplay(userId, 30),
  ]);

  const ruleMap = new Map<string, { score: number; count: number }>();
  for (const e of events) {
    const cur = ruleMap.get(e.rule) ?? { score: e.scoreDelta, count: 0 };
    cur.count += 1;
    ruleMap.set(e.rule, cur);
  }

  const profile: FraudProfileRow = row
    ? {
        userId: row.userId,
        username: row.user.username,
        name: row.user.name,
        riskScore: row.riskScore,
        status: row.status as FraudStatus,
        reasonSummary: row.reasonSummary,
        lastCalculatedAt: row.lastCalculatedAt?.toISOString() ?? null,
        frozenAt: row.frozenAt?.toISOString() ?? null,
        whitelistedUntil: row.whitelistedUntil?.toISOString() ?? null,
      }
    : {
        userId,
        username: user.username,
        name: user.name,
        riskScore: 0,
        status: "NORMAL",
        reasonSummary: null,
        lastCalculatedAt: null,
        frozenAt: null,
        whitelistedUntil: null,
      };

  return {
    profile,
    ruleBreakdown: [...ruleMap.entries()].map(([rule, v]) => ({
      rule,
      score: v.score,
      count: v.count,
    })),
    scoreHistory: history.map((h) => ({
      at: h.createdAt.toISOString(),
      score: h.score,
      status: h.status,
    })),
    recentEvents: events.map((e) => ({
      id: e.id,
      rule: e.rule,
      scoreDelta: e.scoreDelta,
      evidence: e.evidence,
      createdAt: e.createdAt.toISOString(),
    })),
    replay,
    actions: actions.map((a) => ({
      id: a.id,
      action: a.action,
      reason: a.reason,
      adminName: a.admin?.name ?? a.admin?.username ?? null,
      expiresAt: a.expiresAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

export async function adminFreezeUser(
  userId: string,
  adminId: string,
  reason: string
): Promise<void> {
  await db.$transaction([
    db.aptFraudProfile.upsert({
      where: { userId },
      create: {
        userId,
        riskScore: 100,
        status: "HIGH_RISK",
        frozenAt: new Date(),
        reasonSummary: "FROZEN",
      },
      update: { frozenAt: new Date(), status: "HIGH_RISK", riskScore: 100 },
    }),
    db.aptFraudAction.create({
      data: { userId, action: "FREEZE", reason, adminId },
    }),
  ]);
  const { notifyFraudFreeze } = await import("../notification/economy-notify");
  notifyFraudFreeze(userId, reason);
}

export async function adminUnfreezeUser(
  userId: string,
  adminId: string,
  reason: string
): Promise<void> {
  await db.$transaction([
    db.aptFraudProfile.upsert({
      where: { userId },
      create: { userId, riskScore: 0, status: "NORMAL", frozenAt: null },
      update: { frozenAt: null },
    }),
    db.aptFraudAction.create({
      data: { userId, action: "UNFREEZE", reason, adminId },
    }),
  ]);
  await recalculateUserFraudRisk(userId);
  const { notifyFraudUnfreeze } = await import("../notification/economy-notify");
  notifyFraudUnfreeze(userId);
}

export async function adminIgnoreFraudUser(
  userId: string,
  adminId: string,
  days: number,
  reason: string
): Promise<void> {
  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await db.$transaction([
    db.aptFraudProfile.upsert({
      where: { userId },
      create: {
        userId,
        riskScore: 0,
        status: "NORMAL",
        whitelistedUntil: until,
      },
      update: { whitelistedUntil: until, status: "NORMAL", riskScore: 0 },
    }),
    db.aptFraudAction.create({
      data: {
        userId,
        action: "IGNORE",
        reason,
        adminId,
        expiresAt: until,
      },
    }),
  ]);
}

export async function initFraudAdmin(): Promise<void> {
  await seedFraudRules();
}

export { recalculateUserFraudRisk, scanActiveUsersForFraud, FRAUD_STATUS_LABEL, scoreToStatus };
