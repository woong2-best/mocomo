"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { AdminAccessError, requireAdminPermission, requireAdminStepUp } from "@/lib/admin/access";
import { checkRateLimit, authLimiter } from "@/lib/ratelimit";
import {
  getIdolVrmsNow,
  prepareIdolVrmSignedUpload,
  removeReplacedIdolVrm,
  setIdolVrmSlot,
} from "@/lib/ai-live/idol-vrm";
import { isCustomIdolVrmUrl, isIdolVrmSlot, type IdolVrmUrls } from "@/lib/ai-live/idol-vrm-shared";

function errMsg(e: unknown) {
  if (e instanceof AdminAccessError) {
    if (e.message === "ADMIN_STEPUP_REQUIRED") return "ADMIN_STEPUP_REQUIRED";
    return e.message === "UNAUTHORIZED" ? "common.error.authRequired" : "actions.st3onev";
  }
  if (e instanceof Error) {
    if (
      e.message === "IDOL_VRM_FILE" ||
      e.message === "IDOL_VRM_TYPE" ||
      e.message === "IDOL_VRM_SIZE" ||
      e.message === "IDOL_VRM_STORAGE" ||
      e.message === "IDOL_VRM_SLOT" ||
      e.message === "IDOL_VRM_RATE"
    ) {
      return e.message;
    }
  }
  return "actions.s1su4v2o";
}

function bustIdolVrm() {
  revalidateTag("idol-vrm");
  revalidatePath("/live");
  revalidatePath("/live/moco");
  revalidatePath("/live/airi");
  revalidatePath("/live/chloe");
  revalidatePath("/live/stella");
  revalidatePath("/live/zelie");
  revalidatePath("/live/cleo");
  revalidatePath("/live/mio");
  revalidatePath("/live/nangnang");
  revalidatePath("/admin/live/avatars");
}

const recent = new Map<string, number[]>();

function allowWrite(actorId: string): boolean {
  const now = Date.now();
  const prev = (recent.get(actorId) ?? []).filter((t) => now - t < 60_000);
  if (prev.length >= 8) {
    recent.set(actorId, prev);
    return false;
  }
  prev.push(now);
  recent.set(actorId, prev);
  return true;
}

export async function adminLoadIdolVrms(): Promise<
  { ok: true; data: IdolVrmUrls } | { ok: false; error: string }
> {
  try {
    await requireAdminPermission("live");
    return { ok: true, data: await getIdolVrmsNow() };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

async function guardWrite(slot: string, countWrite = true) {
  if (!isIdolVrmSlot(slot)) throw new Error("IDOL_VRM_SLOT");
  const actor = await requireAdminStepUp("live", {
    action: "SETTINGS_UPDATE",
    targetType: "site_setting",
    targetId: "site.idolVrm",
    metadata: { slot },
  });
  const limited = await checkRateLimit(authLimiter, `idol-vrm:${actor.id}`);
  if (!limited.success || (countWrite && !allowWrite(actor.id))) throw new Error("IDOL_VRM_RATE");
  return actor;
}

export async function adminPrepareIdolVrmUploadAction(
  slot: string,
): Promise<
  | { ok: true; uploadUrl: string; publicUrl: string; token: string }
  | { ok: false; error: string }
> {
  try {
    if (!isIdolVrmSlot(slot)) return { ok: false, error: "IDOL_VRM_SLOT" };
    const actor = await guardWrite(slot, false);
    const uploaded = await prepareIdolVrmSignedUpload(slot, actor.id);
    return { ok: true, ...uploaded };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function adminConfirmIdolVrmUploadAction(
  slot: string,
  publicUrl: string,
): Promise<{ ok: true; data: IdolVrmUrls } | { ok: false; error: string }> {
  try {
    if (!isIdolVrmSlot(slot)) return { ok: false, error: "IDOL_VRM_SLOT" };
    if (!isCustomIdolVrmUrl(publicUrl)) return { ok: false, error: "IDOL_VRM_STORAGE" };
    const actor = await guardWrite(slot);
    const { next, previous } = await setIdolVrmSlot(actor.id, slot, publicUrl);
    await removeReplacedIdolVrm(previous, publicUrl);
    bustIdolVrm();
    return { ok: true, data: next };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function adminResetIdolVrmAction(
  slot: string,
): Promise<{ ok: true; data: IdolVrmUrls } | { ok: false; error: string }> {
  try {
    if (!isIdolVrmSlot(slot)) return { ok: false, error: "IDOL_VRM_SLOT" };
    const actor = await guardWrite(slot);
    const { next, previous } = await setIdolVrmSlot(actor.id, slot, null);
    await removeReplacedIdolVrm(previous, null);
    bustIdolVrm();
    return { ok: true, data: next };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
