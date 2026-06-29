"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { revalidateAptHub } from "@/lib/apt/revalidate-hub";
import { requireAdmin } from "@/lib/auth";
import {
  getAdminEconomyConfig,
  listConfigChangeLogs,
  publishEconomyConfig,
  setEmergencyMode,
} from "@/lib/apt/economy/admin-economy-config-service";
import type { EconomyConfigValues } from "@/lib/apt/economy/economy-config-types";

const CONFIG_PATH = "/admin/economy/config";

async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
}

function revalidate() {
  revalidatePath(CONFIG_PATH);
  revalidatePath("/admin/economy");
  revalidateAptHub();
}

export async function getEconomyConfigAdminPageData() {
  await requireAdmin();
  const [config, changeLogs] = await Promise.all([
    getAdminEconomyConfig(),
    listConfigChangeLogs(40),
  ]);
  return { config, changeLogs };
}

export async function adminPublishEconomyConfig(
  draft: Partial<EconomyConfigValues>,
  reason: string
) {
  const admin = await requireAdmin();
  if (!reason.trim()) return { error: "Î≥ÄÍ≤??¨Ïú†Î•??ÖÎ†•?òÏÑ∏??" };
  const ip = await clientIp();
  const res = await publishEconomyConfig(admin.id, draft, reason.trim(), ip);
  if ("ok" in res) revalidate();
  return res;
}

export async function adminSetEmergencyMode(enabled: boolean, reason: string) {
  const admin = await requireAdmin();
  const ip = await clientIp();
  const config = await setEmergencyMode(
    admin.id,
    enabled,
    reason.trim() || (enabled ? "Í∏¥Í∏â ?êÍ? ?úÏûë" : "Í∏¥Í∏â ?êÍ? ?¥Ï†ú"),
    ip
  );
  revalidate();
  return config;
}
