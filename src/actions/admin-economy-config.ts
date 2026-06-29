"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
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
  revalidatePath("/apt");
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
  if (!reason.trim()) return { error: "변경 사유를 입력하세요." };
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
    reason.trim() || (enabled ? "긴급 점검 시작" : "긴급 점검 해제"),
    ip
  );
  revalidate();
  return config;
}
