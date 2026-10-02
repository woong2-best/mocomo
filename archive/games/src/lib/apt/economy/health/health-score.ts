import type { DomainHealthScore, HealthDomain, HealthMetrics } from "./health-types";
import {
  HEALTH_DOMAIN_LABELS,
  HEALTH_DOMAIN_WEIGHTS,
  overallLevelFromScore,
  scoreToStatus,
} from "./health-types";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function scoreWallet(m: HealthMetrics["wallet"]): number {
  let s = 100;
  if (m.negativeBalance > 0) s -= 40;
  if (m.walletErrors > 0) s -= Math.min(30, m.walletErrors * 10);
  if (m.duplicateReference > 0) s -= Math.min(20, m.duplicateReference * 5);
  if (m.netInflation > 0.15) s -= 15;
  else if (m.netInflation > 0.1) s -= 8;
  return clamp(s);
}

function scoreMarket(m: HealthMetrics["market"]): number {
  let s = 100;
  if (m.marketErrorRate > 0.05) s -= 35;
  else if (m.marketErrorRate > 0.02) s -= 15;
  if (m.duplicatePurchase > 0) s -= 25;
  if (m.priceSpike > 0.5) s -= 10;
  if (m.priceCrash > 0.5) s -= 10;
  return clamp(s);
}

function scoreLive(m: HealthMetrics["live"]): number {
  let s = 100;
  if (m.rewardErrors > 0) s -= 20;
  if (m.duplicateReward > 0) s -= 25;
  if (m.dailyLimitHit > 0) s -= 5;
  return clamp(s);
}

function scoreNotification(m: HealthMetrics["notification"]): number {
  let s = 100;
  if (m.failures > 0) s -= Math.min(40, m.failures * 10);
  return clamp(s);
}

function scoreFraud(m: HealthMetrics["fraud"]): number {
  let s = 100;
  if (m.fraudIncrease > 0.8) s -= 30;
  else if (m.fraudIncrease > 0.5) s -= 15;
  if (m.newHighRisk > 10) s -= 15;
  return clamp(s);
}

function scoreOffline(m: HealthMetrics["offline"]): number {
  let s = 100;
  if (m.syncFailure > 0) s -= 25;
  if (m.replayFailure > 0) s -= 25;
  if (m.pendingOps > 500) s -= 15;
  return clamp(s);
}

const SCORERS: Record<HealthDomain, (m: HealthMetrics) => number> = {
  wallet: (m) => scoreWallet(m.wallet),
  market: (m) => scoreMarket(m.market),
  live: (m) => scoreLive(m.live),
  notification: (m) => scoreNotification(m.notification),
  fraud: (m) => scoreFraud(m.fraud),
  offline: (m) => scoreOffline(m.offline),
  backup: () => 100,
  iap: (m) => scoreIap(m.iap),
};

function scoreIap(m: HealthMetrics["iap"]): number {
  let s = 100;
  if (m.verifyFail > 0) s -= Math.min(30, m.verifyFail * 5);
  if (m.fulfillFail > 0) s -= Math.min(40, m.fulfillFail * 10);
  if (m.ackFail > 0) s -= Math.min(20, m.ackFail * 5);
  if (m.refund > 5) s -= 15;
  if (m.pendingQueue > 10) s -= 10;
  return clamp(s);
}

export function computeDomainScores(metrics: HealthMetrics): DomainHealthScore[] {
  const domains = Object.keys(HEALTH_DOMAIN_WEIGHTS).filter(
    (d) => HEALTH_DOMAIN_WEIGHTS[d as HealthDomain] > 0
  ) as HealthDomain[];

  return domains.map((domain) => {
    const score = SCORERS[domain](metrics);
    return {
      domain,
      label: HEALTH_DOMAIN_LABELS[domain],
      score,
      status: scoreToStatus(score),
      weight: HEALTH_DOMAIN_WEIGHTS[domain],
      metrics: metrics[domain] as unknown as Record<string, number | string>,
    };
  });
}

export function computeOverallScore(domains: DomainHealthScore[]): number {
  const totalWeight = domains.reduce((s, d) => s + d.weight, 0);
  if (totalWeight === 0) return 100;
  return Math.round(domains.reduce((s, d) => s + d.score * d.weight, 0) / totalWeight);
}

export function computeHealthSummary(metrics: HealthMetrics) {
  const domains = computeDomainScores(metrics);
  const overallScore = computeOverallScore(domains);
  return { overallScore, overallLevel: overallLevelFromScore(overallScore), domains };
}
