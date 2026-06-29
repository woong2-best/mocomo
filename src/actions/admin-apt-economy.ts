"use server";

import { requireAdmin } from "@/lib/auth";
import { loadEconomyDashboard } from "@/lib/apt/economy/admin-dashboard-service";
import { backfillEconomyDailyStats } from "@/lib/apt/economy/daily-stat-service";
import { revalidatePath } from "next/cache";

export async function getEconomyDashboard() {
  await requireAdmin();
  return loadEconomyDashboard();
}

export async function refreshEconomyDailyStats(days = 14) {
  await requireAdmin();
  const count = await backfillEconomyDailyStats(days);
  revalidatePath("/admin/economy");
  return { ok: true as const, count };
}
