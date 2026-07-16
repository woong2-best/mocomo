"use server";

import { revalidatePath } from "next/cache";
import {
  AdminAccessError,
  requireAdminPermission,
  requireAdminStepUp,
} from "@/lib/admin/access";
import {
  ensureDefaultFeatureFlags,
  listFeatureFlags,
  setFeatureFlag,
} from "@/lib/platform/feature-flags";

function errMsg(e: unknown) {
  if (e instanceof AdminAccessError) {
    if (e.message === "ADMIN_STEPUP_REQUIRED") return "ADMIN_STEPUP_REQUIRED";
    return e.status === 401 ? "로그인이 필요합니다." : "권한이 없습니다.";
  }
  return e instanceof Error ? e.message : "오류가 발생했습니다.";
}

export async function adminListFeatureFlagsAction() {
  try {
    await requireAdminPermission("settings");
    await ensureDefaultFeatureFlags();
    return { ok: true as const, data: await listFeatureFlags() };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function adminToggleFeatureFlagAction(key: string, enabled: boolean) {
  try {
    const actor = await requireAdminStepUp("settings");
    await setFeatureFlag(key, enabled, { updatedById: actor.id });
    revalidatePath("/admin/settings");
    return { success: true as const };
  } catch (e) {
    return { error: errMsg(e) };
  }
}
