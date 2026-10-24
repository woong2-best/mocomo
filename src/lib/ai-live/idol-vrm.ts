import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  IDOL_VRM_KEY,
  effectiveIdolVrmUrl,
  isCustomIdolVrmUrl,
  isIdolVrmSlot,
  parseIdolVrmValue,
  vrmSlotForAvatar,
  type IdolVrmSlot,
  type IdolVrmUrls,
} from "@/lib/ai-live/idol-vrm-shared";
import {
  createSupabaseSignedUpload,
  deletePublicStorageUrl,
} from "@/lib/supabase-storage";

async function readIdolVrms(): Promise<IdolVrmUrls> {
  const row = await db.siteSetting.findUnique({ where: { key: IDOL_VRM_KEY } });
  return parseIdolVrmValue(row?.value);
}

export const getCachedIdolVrms = unstable_cache(readIdolVrms, ["idol-vrm-v1"], {
  tags: ["idol-vrm"],
  revalidate: 3600,
});

export async function getIdolVrmUrl(slotOrAvatar: string): Promise<string> {
  const slot = vrmSlotForAvatar(slotOrAvatar);
  if (!slot) return "/avatars/zelie.vrm";
  const urls = await getCachedIdolVrms();
  return effectiveIdolVrmUrl(slot, urls[slot]);
}

export async function setIdolVrmSlot(
  actorId: string,
  slot: IdolVrmSlot,
  modelUrl: string | null,
): Promise<{ next: IdolVrmUrls; previous: string | null }> {
  if (modelUrl !== null && !isCustomIdolVrmUrl(modelUrl)) {
    throw new Error("IDOL_VRM_STORAGE");
  }
  return db.$transaction(async (tx) => {
    const row = await tx.siteSetting.findUnique({ where: { key: IDOL_VRM_KEY } });
    const current = parseIdolVrmValue(row?.value);
    const previous = current[slot];
    const next: IdolVrmUrls = { ...current, [slot]: modelUrl };
    const value = next as unknown as Prisma.InputJsonValue;
    await tx.siteSetting.upsert({
      where: { key: IDOL_VRM_KEY },
      create: { key: IDOL_VRM_KEY, value, updatedBy: actorId },
      update: { value, updatedBy: actorId },
    });
    return { next, previous };
  });
}

export async function prepareIdolVrmSignedUpload(
  slot: IdolVrmSlot,
  actorId: string,
): Promise<{ uploadUrl: string; publicUrl: string; token: string }> {
  if (!isIdolVrmSlot(slot)) throw new Error("IDOL_VRM_SLOT");
  const uploaded = await createSupabaseSignedUpload(
    actorId,
    `live-vrm-${slot}.vrm`,
    "model/gltf-binary",
    "model",
  );
  if (!uploaded) throw new Error("IDOL_VRM_STORAGE");
  if (!isCustomIdolVrmUrl(uploaded.publicUrl)) throw new Error("IDOL_VRM_STORAGE");
  return uploaded;
}

export async function removeReplacedIdolVrm(previous: string | null, nextUrl: string | null) {
  if (!previous || previous === nextUrl) return;
  try {
    await deletePublicStorageUrl(previous);
  } catch {
    /* old object can remain; the live URL no longer points at it */
  }
}
