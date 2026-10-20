"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { AdminAccessError, requireAdminPermission, requireAdminStepUp } from "@/lib/admin/access";
import { checkRateLimit, authLimiter } from "@/lib/ratelimit";
import {
  getCachedHomeChrome,
  prepareHomeChromeUpload,
  removeReplacedHomeChrome,
  setHomeChromeSlot,
} from "@/lib/home-chrome";
import { isHomeChromeSlot, type HomeChromeUrls } from "@/lib/home-chrome-shared";

function errMsg(e: unknown) {
  if (e instanceof AdminAccessError) {
    if (e.message === "ADMIN_STEPUP_REQUIRED") return "ADMIN_STEPUP_REQUIRED";
    return e.message === "UNAUTHORIZED" ? "common.error.authRequired" : "actions.st3onev";
  }
  if (e instanceof Error) {
    if (
      e.message === "HOME_CHROME_FILE" ||
      e.message === "HOME_CHROME_TYPE" ||
      e.message === "HOME_CHROME_SIZE" ||
      e.message === "HOME_CHROME_DIMENSIONS" ||
      e.message === "HOME_CHROME_STORAGE" ||
      e.message === "HOME_CHROME_SLOT" ||
      e.message === "HOME_CHROME_RATE"
    ) {
      return e.message;
    }
  }
  return "actions.s1su4v2o";
}

function bustHomeChrome() {
  revalidateTag("home-chrome");
  revalidatePath("/", "layout");
  revalidatePath("/");
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

export async function adminLoadHomeChrome(): Promise<
  { ok: true; data: HomeChromeUrls } | { ok: false; error: string }
> {
  try {
    await requireAdminPermission("settings");
    return { ok: true, data: await getCachedHomeChrome() };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

async function guardWrite(slot: string) {
  if (!isHomeChromeSlot(slot)) throw new Error("HOME_CHROME_SLOT");
  const actor = await requireAdminStepUp("settings", {
    action: "SETTINGS_UPDATE",
    targetType: "site_setting",
    targetId: "site.homeChrome",
    metadata: { slot },
  });
  const limited = await checkRateLimit(authLimiter, `home-chrome:${actor.id}`);
  if (!limited.success || !allowWrite(actor.id)) throw new Error("HOME_CHROME_RATE");
  return actor;
}

export async function adminSaveHomeChromeAction(
  formData: FormData
): Promise<{ ok: true; data: HomeChromeUrls } | { ok: false; error: string }> {
  const slot = formData.get("slot");
  try {
    if (!isHomeChromeSlot(slot)) return { ok: false, error: "HOME_CHROME_SLOT" };
    const actor = await guardWrite(slot);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size < 32) return { ok: false, error: "HOME_CHROME_FILE" };
    const buf = Buffer.from(await file.arrayBuffer());
    const uploaded = await prepareHomeChromeUpload(slot, buf, actor.id);
    try {
      const { next, previous } = await setHomeChromeSlot(actor.id, slot, uploaded.publicUrl);
      await removeReplacedHomeChrome(previous, uploaded.publicUrl);
      bustHomeChrome();
      return { ok: true, data: next };
    } catch (e) {
      await removeReplacedHomeChrome(uploaded.publicUrl, null);
      throw e;
    }
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function adminResetHomeChromeAction(
  slot: string
): Promise<{ ok: true; data: HomeChromeUrls } | { ok: false; error: string }> {
  try {
    if (!isHomeChromeSlot(slot)) return { ok: false, error: "HOME_CHROME_SLOT" };
    const actor = await guardWrite(slot);
    const { next, previous } = await setHomeChromeSlot(actor.id, slot, null);
    await removeReplacedHomeChrome(previous, null);
    bustHomeChrome();
    return { ok: true, data: next };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
