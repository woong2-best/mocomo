/** Health Monitor 도메인 */
export type HealthDomain =
  | "wallet"
  | "market"
  | "live"
  | "notification"
  | "fraud"
  | "offline"
  | "backup"
  | "iap";

export type HealthSeverity = "WARN" | "CRITICAL";

export type HealthAutoAction =
  | "NONE"
  | "NOTIFY"
  | "STOP_CANARY"
  | "MARKET_OFF"
  | "EMERGENCY"
  | "ROLLBACK";

export type OverallHealthLevel = "healthy" | "warning" | "critical" | "emergency";

export const HEALTH_DOMAIN_WEIGHTS: Record<HealthDomain, number> = {
  wallet: 23,
  market: 23,
  fraud: 18,
  live: 10,
  offline: 10,
  notification: 8,
  backup: 0,
  iap: 8,
};

export const HEALTH_DOMAIN_LABELS: Record<HealthDomain, string> = {
  wallet: "Wallet",
  market: "Market",
  live: "Live",
  notification: "Notification",
  fraud: "Fraud",
  offline: "Offline",
  backup: "Backup",
  iap: "IAP",
};

export type HealthMetrics = {
  wallet: {
    goldCreated: number;
    goldBurned: number;
    netInflation: number;
    negativeBalance: number;
    walletErrors: number;
    duplicateReference: number;
  };
  market: {
    listingSuccess: number;
    listingAttempts: number;
    purchaseSuccess: number;
    purchaseAttempts: number;
    cancelSuccess: number;
    medianPrice: number;
    priceSpike: number;
    priceCrash: number;
    duplicatePurchase: number;
    marketErrorRate: number;
  };
  live: {
    goldReward: number;
    dailyLimitHit: number;
    duplicateReward: number;
    rewardErrors: number;
  };
  notification: {
    generated: number;
    delivered: number;
    unread: number;
    failures: number;
    queue: number;
  };
  fraud: {
    newWatch: number;
    newSuspicious: number;
    newHighRisk: number;
    freeze: number;
    falsePositive: number;
    detectionRate: number;
    fraudIncrease: number;
  };
  offline: {
    pendingOps: number;
    replayFailure: number;
    syncFailure: number;
    expiredPending: number;
  };
  backup: {
    latestSnapshotAgeHours: number;
    restoreSuccess: number;
    restoreFailure: number;
    checksumError: number;
  };
  iap: {
    verifyFail: number;
    fulfillFail: number;
    ackFail: number;
    refund: number;
    chargeback: number;
    pendingQueue: number;
  };
};

export type DomainHealthScore = {
  domain: HealthDomain;
  label: string;
  score: number;
  status: "green" | "yellow" | "red";
  weight: number;
  metrics: Record<string, number | string>;
};

export type HealthDashboard = {
  overallScore: number;
  overallLevel: OverallHealthLevel;
  domains: DomainHealthScore[];
  alerts: HealthAlertDto[];
  timeline: HealthTimelineItem[];
  heatmap: HealthHeatmapRow[];
  rules: HealthRuleDto[];
  restoreCandidates: { id: string; label: string; type: string; createdAt: string }[];
};

export type HealthRuleDto = {
  id: string;
  code: string;
  domain: string;
  label: string;
  metric: string;
  operator: string;
  threshold: number;
  severity: HealthSeverity;
  autoAction: HealthAutoAction;
  enabled: boolean;
};

export type HealthAlertDto = {
  id: string;
  ruleCode: string;
  domain: string;
  severity: HealthSeverity;
  status: "OPEN" | "RESOLVED";
  message: string;
  metricValue: number | null;
  threshold: number | null;
  correlationId: string;
  autoAction: string | null;
  autoActionOk: boolean | null;
  resolvedAt: string | null;
  resolvedByName: string | null;
  createdAt: string;
  durationMs: number | null;
};

export type HealthTimelineItem = {
  id: string;
  at: string;
  kind: string;
  label: string;
  correlationId: string | null;
  severity: string | null;
};

export type HealthHeatmapRow = {
  domain: HealthDomain;
  label: string;
  cells: { hour: string; score: number; level: "green" | "yellow" | "red" }[];
};

export function overallLevelFromScore(score: number): OverallHealthLevel {
  if (score >= 83) return "healthy";
  if (score >= 62) return "warning";
  if (score >= 40) return "critical";
  return "emergency";
}

export function scoreToStatus(score: number): "green" | "yellow" | "red" {
  if (score >= 83) return "green";
  if (score >= 62) return "yellow";
  return "red";
}

export function compareMetric(
  value: number,
  operator: string,
  threshold: number
): boolean {
  switch (operator) {
    case "gte":
      return value >= threshold;
    case "eq":
      return value === threshold;
    case "gt":
    default:
      return value > threshold;
  }
}
