"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  resolveHealthAlert,
  runHealthMonitorCycle,
} from "@/lib/apt/economy/health/health-monitor-service";
import { updateHealthRule } from "@/lib/apt/economy/health/health-rules-service";

const HEALTH_PATH = "/admin/economy/health";

function revalidate() {
  revalidatePath(HEALTH_PATH);
  revalidatePath("/admin/economy");
}

export async function getEconomyHealthAdminPageData() {
  await requireAdmin();
  return runHealthMonitorCycle();
}

export async function adminResolveHealthAlert(alertId: string) {
  const admin = await requireAdmin();
  await resolveHealthAlert(alertId, admin.id);
  revalidate();
  return { ok: true as const };
}

export async function adminUpdateHealthRule(
  ruleId: string,
  patch: { threshold?: number; severity?: string; autoAction?: string; enabled?: boolean }
) {
  const admin = await requireAdmin();
  const rule = await updateHealthRule(ruleId, admin.id, patch);
  revalidate();
  return rule;
}

export async function adminRefreshHealthMonitor() {
  await requireAdmin();
  const data = await runHealthMonitorCycle();
  revalidate();
  return data;
}
