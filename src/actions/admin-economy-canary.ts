"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  createConfigCanaryDraft,
  getCanaryAdminPageData,
  previewCanaryForUser,
  promoteCanary,
  rollbackCanary,
  buildPromotePreview,
} from "@/lib/apt/economy/canary/admin-canary-service";
import { getCanaryById } from "@/lib/apt/economy/canary/canary-service";
import type { EconomyConfigValues } from "@/lib/apt/economy/economy-config-types";

const CANARY_PATH = "/admin/economy/canary";

function revalidate() {
  revalidatePath(CANARY_PATH);
  revalidatePath("/admin/economy");
  revalidatePath("/admin/economy/config");
}

export async function getEconomyCanaryAdminPageData() {
  await requireAdmin();
  return getCanaryAdminPageData();
}

export async function adminCreateConfigCanary(
  draft: Partial<EconomyConfigValues>,
  operatorUserIds: string[],
  testerUserIds: string[],
  reason: string
) {
  const admin = await requireAdmin();
  const canary = await createConfigCanaryDraft(
    admin.id,
    draft,
    operatorUserIds,
    testerUserIds,
    reason
  );
  revalidate();
  return canary;
}

export async function adminPromoteCanary(canaryId: string, reason: string) {
  const admin = await requireAdmin();
  const canary = await getCanaryById(canaryId);
  if (!canary) return { error: "Canary를 찾을 수 없습니다." };
  const preview = await buildPromotePreview(canary);
  const result = await promoteCanary(canaryId, admin.id, reason);
  revalidate();
  return { ...result, preview };
}

export async function adminRollbackCanary(
  canaryId: string,
  reason: string,
  restoreFromSnapshot?: boolean
) {
  const admin = await requireAdmin();
  const result = await rollbackCanary({
    canaryId,
    adminId: admin.id,
    reason,
    restoreFromSnapshot,
  });
  revalidate();
  return result;
}

export async function adminPreviewCanaryUser(canaryId: string, userId: string) {
  await requireAdmin();
  return previewCanaryForUser(canaryId, userId);
}

export async function adminGetPromotePreview(canaryId: string) {
  await requireAdmin();
  const canary = await getCanaryById(canaryId);
  if (!canary) return { error: "Canary를 찾을 수 없습니다." };
  const preview = await buildPromotePreview(canary);
  return { ok: true as const, preview };
}
