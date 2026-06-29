"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { revalidateAptHub } from "@/lib/apt/revalidate-hub";
import { requireAdmin } from "@/lib/auth";
import {
  getAdminFeatureFlags,
  listFeatureFlagLogs,
  setAllEconomyFeatureFlags,
  setEconomyFeatureFlag,
} from "@/lib/apt/economy/admin-feature-flag-service";
import type { EconomyFeatureKey } from "@/lib/apt/economy/feature-flag-types";

const FLAGS_PATH = "/admin/economy/flags";

async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
}

function revalidate() {
  revalidatePath(FLAGS_PATH);
  revalidatePath("/admin/economy");
  revalidatePath("/admin/economy/config");
  revalidateAptHub();
}

export async function getEconomyFlagsAdminPageData() {
  await requireAdmin();
  const [flags, changeLogs] = await Promise.all([
    getAdminFeatureFlags(),
    listFeatureFlagLogs(50),
  ]);
  return { flags, changeLogs };
}

export async function adminToggleEconomyFeature(
  key: EconomyFeatureKey,
  enabled: boolean,
  reason?: string
) {
  const admin = await requireAdmin();
  const ip = await clientIp();
  const flags = await setEconomyFeatureFlag(
    admin.id,
    key,
    enabled,
    reason?.trim() || undefined,
    ip
  );
  revalidate();
  return flags;
}

/** 긴급 — 경제 기능 전체 OFF (Emergency Mode와 별도) */
export async function adminKillAllEconomyFeatures(reason?: string) {
  const admin = await requireAdmin();
  const ip = await clientIp();
  const flags = await setAllEconomyFeatureFlags(
    admin.id,
    {
      shopEnabled: false,
      marketEnabled: false,
      liveEnabled: false,
      missionEnabled: false,
      notificationEnabled: false,
      fleaEnabled: false,
      iapEnabled: false,
    },
    reason?.trim() || "긴급 전체 차단",
    ip
  );
  revalidate();
  return flags;
}

export async function adminRestoreAllEconomyFeatures(reason?: string) {
  const admin = await requireAdmin();
  const ip = await clientIp();
  const flags = await setAllEconomyFeatureFlags(
    admin.id,
    {
      shopEnabled: true,
      marketEnabled: true,
      liveEnabled: true,
      missionEnabled: true,
      notificationEnabled: true,
      fleaEnabled: true,
      iapEnabled: true,
    },
    reason?.trim() || "전체 기능 복구",
    ip
  );
  revalidate();
  return flags;
}
