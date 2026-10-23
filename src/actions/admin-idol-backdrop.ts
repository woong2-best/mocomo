"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { AdminAccessError, requireAdminPermission, requireAdminStepUp } from "@/lib/admin/access";
import { checkRateLimit, authLimiter } from "@/lib/ratelimit";
import {
  getCachedIdolBackdrops,
  prepareIdolBackdropUpload,
  removeReplacedIdolBackdrop,
  setIdolBackdropSlot,
} from "@/lib/ai-live/idol-backdrop";
import { isIdolBackdropSlot, type IdolBackdropUrls } from "@/lib/ai-live/idol-backdrop-shared";

function errMsg(e: unknown) {
  if (e instanceof AdminAccessError) {
    if (e.message === "ADMIN_STEPUP_REQUIRED") return "ADMIN_STEPUP_REQUIRED";
    return e.message === "UNAUTHORIZED" ? "common.error.authRequired" : "actions.st3onev";
  }
  if (e instanceof Error) {
    if (
      e.message === "IDOL_BACKDROP_FILE" ||
      e.message === "IDOL_BACKDROP_TYPE" ||
      e.message === "IDOL_BACKDROP_SIZE" ||
      e.message === "IDOL_BACKDROP_STORAGE" ||
      e.message === "IDOL_BACKDROP_SLOT" ||
      e.message === "IDOL_BACKDROP_RATE"
    ) {
      return e.message;
    }
  }
  return "actions.s1su4v2o";
}

function bustIdolBackdrop() {
  revalidateTag("idol-backdrop");
  revalidatePath("/live");
  revalidatePath("/live/moco");
  revalidatePath("/live/airi");
  revalidatePath("/live/chloe");
  revalidatePath("/live/stella");
  revalidatePath("/admin/live/backgrounds");
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

export async function adminLoadIdolBackdrops(): Promise<
  { ok: true; data: IdolBackdropUrls } | { ok: false; error: string }
> {
  try {
    await requireAdminPermission("live");
    return { ok: true, data: await getCachedIdolBackdrops() };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

async function guardWrite(slot: string) {
  if (!isIdolBackdropSlot(slot)) throw new Error("IDOL_BACKDROP_SLOT");
  const actor = await requireAdminStepUp("live", {
    action: "SETTINGS_UPDATE",
    targetType: "site_setting",
    targetId: "site.idolBackdrop",
    metadata: { slot },
  });
  const limited = await checkRateLimit(authLimiter, `idol-backdrop:${actor.id}`);
  if (!limited.success || !allowWrite(actor.id)) throw new Error("IDOL_BACKDROP_RATE");
  return actor;
}

export async function adminSaveIdolBackdropAction(
  formData: FormData,
): Promise<{ ok: true; data: IdolBackdropUrls } | { ok: false; error: string }> {
  const slot = formData.get("slot");
  try {
    if (!isIdolBackdropSlot(slot)) return { ok: false, error: "IDOL_BACKDROP_SLOT" };
    const actor = await guardWrite(slot);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size < 32) return { ok: false, error: "IDOL_BACKDROP_FILE" };
    const buf = Buffer.from(await file.arrayBuffer());
    const uploaded = await prepareIdolBackdropUpload(slot, buf, actor.id);
    try {
      const { next, previous } = await setIdolBackdropSlot(actor.id, slot, uploaded.publicUrl);
      await removeReplacedIdolBackdrop(previous, uploaded.publicUrl);
      bustIdolBackdrop();
      return { ok: true, data: next };
    } catch (e) {
      await removeReplacedIdolBackdrop(uploaded.publicUrl, null);
      throw e;
    }
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function adminResetIdolBackdropAction(
  slot: string,
): Promise<{ ok: true; data: IdolBackdropUrls } | { ok: false; error: string }> {
  try {
    if (!isIdolBackdropSlot(slot)) return { ok: false, error: "IDOL_BACKDROP_SLOT" };
    const actor = await guardWrite(slot);
    const { next, previous } = await setIdolBackdropSlot(actor.id, slot, null);
    await removeReplacedIdolBackdrop(previous, null);
    bustIdolBackdrop();
    return { ok: true, data: next };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
