import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { sniffMimeFromBuffer } from "@/lib/file-magic";
import {
  IDOL_BACKDROP_KEY,
  effectiveIdolBackdropUrl,
  isCustomIdolBackdropUrl,
  backdropSlotForAvatar,
  isIdolBackdropSlot,
  parseIdolBackdropValue,
  type IdolBackdropSlot,
  type IdolBackdropUrls,
} from "@/lib/ai-live/idol-backdrop-shared";
import { deletePublicStorageUrl, uploadBufferToSupabase } from "@/lib/supabase-storage";

export const IDOL_BACKDROP_MAX_BYTES = 4 * 1024 * 1024;

async function readIdolBackdrops(): Promise<IdolBackdropUrls> {
  const row = await db.siteSetting.findUnique({ where: { key: IDOL_BACKDROP_KEY } });
  return parseIdolBackdropValue(row?.value);
}

export const getCachedIdolBackdrops = unstable_cache(readIdolBackdrops, ["idol-backdrop-v1"], {
  tags: ["idol-backdrop"],
  revalidate: 3600,
});

export async function getIdolBackdropUrl(slotOrAvatar: string): Promise<string | null> {
  const slot = backdropSlotForAvatar(slotOrAvatar);
  if (!slot) return null;
  const urls = await getCachedIdolBackdrops();
  return effectiveIdolBackdropUrl(slot, urls[slot]);
}

export async function setIdolBackdropSlot(
  actorId: string,
  slot: IdolBackdropSlot,
  imageUrl: string | null,
): Promise<{ next: IdolBackdropUrls; previous: string | null }> {
  if (imageUrl !== null && !isCustomIdolBackdropUrl(imageUrl)) {
    throw new Error("IDOL_BACKDROP_STORAGE");
  }
  return db.$transaction(async (tx) => {
    const row = await tx.siteSetting.findUnique({ where: { key: IDOL_BACKDROP_KEY } });
    const current = parseIdolBackdropValue(row?.value);
    const previous = current[slot];
    const next: IdolBackdropUrls = { ...current, [slot]: imageUrl };
    const value = next as unknown as Prisma.InputJsonValue;
    await tx.siteSetting.upsert({
      where: { key: IDOL_BACKDROP_KEY },
      create: { key: IDOL_BACKDROP_KEY, value, updatedBy: actorId },
      update: { value, updatedBy: actorId },
    });
    return { next, previous };
  });
}

export async function prepareIdolBackdropUpload(
  slot: IdolBackdropSlot,
  buf: Buffer,
  actorId: string,
): Promise<{ publicUrl: string }> {
  if (!isIdolBackdropSlot(slot)) throw new Error("IDOL_BACKDROP_SLOT");
  if (buf.length < 32) throw new Error("IDOL_BACKDROP_FILE");
  if (buf.length > IDOL_BACKDROP_MAX_BYTES) throw new Error("IDOL_BACKDROP_SIZE");

  const sniffed = sniffMimeFromBuffer(buf);
  if (sniffed !== "image/jpeg" && sniffed !== "image/png" && sniffed !== "image/webp") {
    throw new Error("IDOL_BACKDROP_TYPE");
  }

  const ext = sniffed === "image/png" ? "png" : sniffed === "image/webp" ? "webp" : "jpg";
  const uploaded = await uploadBufferToSupabase(
    actorId,
    buf,
    `live-backdrop-${slot}.${ext}`,
    sniffed,
    "image",
  );
  if ("error" in uploaded) throw new Error("IDOL_BACKDROP_STORAGE");
  if (!isCustomIdolBackdropUrl(uploaded.publicUrl)) throw new Error("IDOL_BACKDROP_STORAGE");
  return { publicUrl: uploaded.publicUrl };
}

export async function removeReplacedIdolBackdrop(previous: string | null, nextUrl: string | null) {
  if (!previous || previous === nextUrl) return;
  try {
    await deletePublicStorageUrl(previous);
  } catch {
    /* old object can remain; the live URL no longer points at it */
  }
}

