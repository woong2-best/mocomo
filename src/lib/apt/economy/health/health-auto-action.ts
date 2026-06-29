import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { setEmergencyMode } from "../admin-economy-config-service";
import { setAllEconomyFeatureFlags } from "../admin-feature-flag-service";
import { rollbackCanary, listActiveCanaries } from "../canary/canary-service";
import { writeCanaryLog } from "../canary/canary-audit";
import { getEconomySnapshot } from "../backup/snapshot-service";
import { executePartialRestore } from "../backup/backup-restore-service";
import { sendAptNotification } from "../notification/notification-service";
import type { HealthAutoAction } from "./health-types";

export function newHealthCorrelationId(): string {
  return `corr_health_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

async function getSystemAdminId(): Promise<string> {
  const admin = await db.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return admin?.id ?? "system";
}

async function notifyAdmins(title: string, body: string, correlationId: string): Promise<void> {
  const { sendAptNotification } = await import("../notification/notification-service");
  const admins = await db.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
    take: 20,
  });
  for (const a of admins) {
    await sendAptNotification({
      userId: a.id,
      type: "ADMIN_NOTICE",
      title,
      body,
      correlationId,
      payload: { href: "/admin/economy/health" },
    });
  }
}

async function stopActiveCanaries(reason: string, correlationId: string): Promise<number> {
  const active = await listActiveCanaries();
  let count = 0;
  for (const c of active) {
    if (c.stage === "ROLLBACK" || c.completedAt) continue;
    await db.aptEconomyCanary.update({
      where: { id: c.id },
      data: { stage: "ROLLBACK", completedAt: new Date() },
    });
    await writeCanaryLog({
      canaryId: c.id,
      action: "health_stop",
      correlationId,
      fromStage: c.stage,
      toStage: "ROLLBACK",
      fromPercent: c.percent,
      reason,
    });
    count++;
  }
  return count;
}

async function rollbackFromSnapshot(correlationId: string, reason: string): Promise<boolean> {
  const snap = await db.aptEconomySnapshot.findFirst({
    where: { type: { in: ["before_publish", "before_restore", "scheduled"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!snap) return false;
  const full = await getEconomySnapshot(snap.id);
  if (!full) return false;
  const adminId = await getSystemAdminId();
  const result = await executePartialRestore({
    snapshotId: snap.id,
    payload: full.payload,
    checksum: full.checksum,
    scopes: ["config", "featureFlags", "goldShop"],
    adminId,
    reason: `Health auto rollback: ${reason}`,
    dryRun: false,
  });
  return !("error" in result);
}

export async function executeHealthAutoAction(
  action: HealthAutoAction,
  context: { message: string; correlationId: string; ruleCode: string }
): Promise<boolean> {
  if (action === "NONE") return true;
  const adminId = await getSystemAdminId();

  try {
    switch (action) {
      case "NOTIFY":
        await notifyAdmins(`🔴 ${context.ruleCode}`, context.message, context.correlationId);
        return true;
      case "STOP_CANARY":
        await stopActiveCanaries(context.message, context.correlationId);
        await notifyAdmins("Canary Stopped", context.message, context.correlationId);
        return true;
      case "MARKET_OFF":
        await setAllEconomyFeatureFlags(
          adminId,
          {
            shopEnabled: true,
            marketEnabled: false,
            liveEnabled: true,
            missionEnabled: true,
            notificationEnabled: true,
            fleaEnabled: true,
            iapEnabled: true,
          },
          `Health: ${context.message}`
        );
        await notifyAdmins("Market OFF", context.message, context.correlationId);
        return true;
      case "EMERGENCY":
        await setEmergencyMode(adminId, true, `Health: ${context.message}`);
        await notifyAdmins("Emergency Mode", context.message, context.correlationId);
        return true;
      case "ROLLBACK": {
        await stopActiveCanaries(context.message, context.correlationId);
        const active = await listActiveCanaries();
        for (const c of active) {
          if (c.rollbackSnapshotId) {
            await rollbackCanary({
              canaryId: c.id,
              adminId,
              reason: context.message,
              restoreFromSnapshot: true,
            });
          }
        }
        await rollbackFromSnapshot(context.correlationId, context.message);
        await notifyAdmins("Rollback Executed", context.message, context.correlationId);
        return true;
      }
      default:
        return false;
    }
  } catch (e) {
    console.error("[health-auto-action]", action, e);
    return false;
  }
}
