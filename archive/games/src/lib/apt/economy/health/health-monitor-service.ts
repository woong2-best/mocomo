import { db } from "@/lib/db";
import { collectHealthMetrics, getMetricValue } from "./health-metrics";
import { computeHealthSummary } from "./health-score";
import { listHealthRules } from "./health-rules-service";
import {
  compareMetric,
  scoreToStatus,
  type HealthAlertDto,
  type HealthDashboard,
  type HealthDomain,
  type HealthHeatmapRow,
  type HealthTimelineItem,
} from "./health-types";
import { executeHealthAutoAction, newHealthCorrelationId } from "./health-auto-action";
import type { Prisma } from "@prisma/client";

function truncateHour(d: Date): Date {
  const x = new Date(d);
  x.setUTCMinutes(0, 0, 0);
  return x;
}

async function persistHourlySnapshots(
  domains: { domain: HealthDomain; score: number; metrics: Record<string, unknown> }[]
): Promise<void> {
  const hour = truncateHour(new Date());
  for (const d of domains) {
    await db.aptEconomyHealthSnapshot.upsert({
      where: { hour_domain: { hour, domain: d.domain } },
      create: { hour, domain: d.domain, score: d.score, metrics: d.metrics as Prisma.InputJsonValue },
      update: { score: d.score, metrics: d.metrics as Prisma.InputJsonValue },
    });
  }
}

async function evaluateRules(metrics: Awaited<ReturnType<typeof collectHealthMetrics>>): Promise<void> {
  const rules = await listHealthRules();
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const value = getMetricValue(metrics, rule.domain, rule.metric);
    if (!compareMetric(value, rule.operator, rule.threshold)) continue;

    const open = await db.aptEconomyHealthAlert.findFirst({
      where: { ruleCode: rule.code, status: "OPEN" },
    });
    if (open) continue;

    const correlationId = newHealthCorrelationId();
    const message = `${rule.label}: ${value} (threshold ${rule.operator} ${rule.threshold})`;
    let autoActionOk: boolean | null = null;
    if (rule.autoAction !== "NONE") {
      autoActionOk = await executeHealthAutoAction(rule.autoAction, {
        message,
        correlationId,
        ruleCode: rule.code,
      });
    }

    await db.aptEconomyHealthAlert.create({
      data: {
        ruleId: rule.id,
        ruleCode: rule.code,
        domain: rule.domain,
        severity: rule.severity,
        message,
        metricValue: value,
        threshold: rule.threshold,
        correlationId,
        autoAction: rule.autoAction,
        autoActionOk,
      },
    });
  }
}

async function buildHeatmap(): Promise<HealthHeatmapRow[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const snaps = await db.aptEconomyHealthSnapshot.findMany({
    where: { hour: { gte: since } },
    orderBy: { hour: "asc" },
  });

  const domains = ["wallet", "market", "fraud", "live", "notification"] as HealthDomain[];
  return domains.map((domain) => {
    const cells = snaps
      .filter((s) => s.domain === domain)
      .map((s) => ({
        hour: s.hour.toISOString().slice(11, 16),
        score: s.score,
        level: scoreToStatus(s.score),
      }));
    while (cells.length < 24) {
      cells.unshift({ hour: "--", score: 100, level: "green" as const });
    }
    return {
      domain,
      label: domain.charAt(0).toUpperCase() + domain.slice(1),
      cells: cells.slice(-24),
    };
  });
}

async function buildTimeline(): Promise<HealthTimelineItem[]> {
  const [alerts, canaryLogs, restores] = await Promise.all([
    db.aptEconomyHealthAlert.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.aptEconomyCanaryLog.findMany({
      where: { action: { in: ["health_stop", "rollback", "promote"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.aptEconomyRestoreLog.findMany({
      where: { dryRun: false },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const items: HealthTimelineItem[] = [];

  for (const a of alerts) {
    items.push({
      id: a.id,
      at: a.createdAt.toISOString(),
      kind: "alert",
      label: a.message,
      correlationId: a.correlationId,
      severity: a.severity,
    });
    if (a.autoAction && a.autoAction !== "NONE") {
      items.push({
        id: `${a.id}-action`,
        at: a.createdAt.toISOString(),
        kind: "auto_action",
        label: `Auto: ${a.autoAction}`,
        correlationId: a.correlationId,
        severity: a.severity,
      });
    }
  }
  for (const c of canaryLogs) {
    items.push({
      id: c.id,
      at: c.createdAt.toISOString(),
      kind: "canary",
      label: `Canary ${c.action}`,
      correlationId: c.correlationId,
      severity: null,
    });
  }
  for (const r of restores) {
    items.push({
      id: r.id,
      at: r.createdAt.toISOString(),
      kind: "restore",
      label: `Restore ${r.reason}`,
      correlationId: r.correlationId,
      severity: null,
    });
  }

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);
}

async function listAlerts(): Promise<HealthAlertDto[]> {
  const rows = await db.aptEconomyHealthAlert.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { resolvedBy: { select: { name: true, username: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    ruleCode: r.ruleCode,
    domain: r.domain,
    severity: r.severity as HealthAlertDto["severity"],
    status: r.status as "OPEN" | "RESOLVED",
    message: r.message,
    metricValue: r.metricValue,
    threshold: r.threshold,
    correlationId: r.correlationId,
    autoAction: r.autoAction,
    autoActionOk: r.autoActionOk,
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
    resolvedByName: r.resolvedBy?.name ?? r.resolvedBy?.username ?? null,
    createdAt: r.createdAt.toISOString(),
    durationMs: r.resolvedAt
      ? r.resolvedAt.getTime() - r.createdAt.getTime()
      : Date.now() - r.createdAt.getTime(),
  }));
}

export async function runHealthMonitorCycle(): Promise<HealthDashboard> {
  const metrics = await collectHealthMetrics();
  const summary = computeHealthSummary(metrics);

  await persistHourlySnapshots(
    summary.domains.map((d) => ({
      domain: d.domain,
      score: d.score,
      metrics: d.metrics,
    }))
  );

  await evaluateRules(metrics);

  const [alerts, timeline, heatmap, rules, restoreCandidates] = await Promise.all([
    listAlerts(),
    buildTimeline(),
    buildHeatmap(),
    listHealthRules(),
    db.aptEconomySnapshot.findMany({
      where: { type: { in: ["before_publish", "before_restore", "scheduled"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, label: true, type: true, createdAt: true },
    }),
  ]);

  return {
    overallScore: summary.overallScore,
    overallLevel: summary.overallLevel,
    domains: summary.domains,
    alerts,
    timeline,
    heatmap,
    rules,
    restoreCandidates: restoreCandidates.map((s) => ({
      id: s.id,
      label: s.label,
      type: s.type,
      createdAt: s.createdAt.toISOString(),
    })),
  };
}

export async function resolveHealthAlert(
  alertId: string,
  adminId: string
): Promise<void> {
  await db.aptEconomyHealthAlert.update({
    where: { id: alertId },
    data: { status: "RESOLVED", resolvedAt: new Date(), resolvedById: adminId },
  });
}

export { recordHealthDomainEvent } from "./health-metrics";
