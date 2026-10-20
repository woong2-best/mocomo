import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { sniffMimeFromBuffer } from "@/lib/file-magic";
import {
  HOME_CHROME_KEY,
  HOME_CHROME_SIZE,
  homeChromeCss,
  isCustomHomeChromeUrl,
  isHomeChromeSlot,
  readRasterSize,
  type HomeChromeSlot,
  type HomeChromeUrls,
} from "@/lib/home-chrome-shared";
import { deletePublicStorageUrl, uploadBufferToSupabase } from "@/lib/supabase-storage";

export const HOME_CHROME_MAX_BYTES = 4 * 1024 * 1024;

const EMPTY_URLS: HomeChromeUrls = { sidebarImageUrl: null, heroImageUrl: null };

function cleanUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return isCustomHomeChromeUrl(value) ? value : null;
}

export function parseHomeChromeValue(value: unknown): HomeChromeUrls {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...EMPTY_URLS };
  const row = value as Record<string, unknown>;
  return {
    sidebarImageUrl: cleanUrl(row.sidebarImageUrl),
    heroImageUrl: cleanUrl(row.heroImageUrl),
  };
}

async function readHomeChrome(): Promise<HomeChromeUrls> {
  const row = await db.siteSetting.findUnique({ where: { key: HOME_CHROME_KEY } });
  return parseHomeChromeValue(row?.value);
}

export const getCachedHomeChrome = unstable_cache(readHomeChrome, ["home-chrome-v1"], {
  tags: ["home-chrome"],
  revalidate: 3600,
});

export async function getHomeChromeCssText(): Promise<string> {
  const urls = await getCachedHomeChrome();
  return homeChromeCss(urls);
}

export async function setHomeChromeSlot(
  actorId: string,
  slot: HomeChromeSlot,
  imageUrl: string | null
): Promise<{ next: HomeChromeUrls; previous: string | null }> {
  if (imageUrl !== null && !isCustomHomeChromeUrl(imageUrl)) {
    throw new Error("HOME_CHROME_STORAGE");
  }
  const field = slot === "sidebar" ? "sidebarImageUrl" : "heroImageUrl";
  return db.$transaction(async (tx) => {
    const row = await tx.siteSetting.findUnique({ where: { key: HOME_CHROME_KEY } });
    const current = parseHomeChromeValue(row?.value);
    const previous = current[field];
    const next: HomeChromeUrls = { ...current, [field]: imageUrl };
    const value = next as unknown as Prisma.InputJsonValue;
    await tx.siteSetting.upsert({
      where: { key: HOME_CHROME_KEY },
      create: { key: HOME_CHROME_KEY, value, updatedBy: actorId },
      update: { value, updatedBy: actorId },
    });
    return { next, previous };
  });
}

export async function prepareHomeChromeUpload(
  slot: HomeChromeSlot,
  buf: Buffer,
  actorId: string
): Promise<{ publicUrl: string }> {
  if (!isHomeChromeSlot(slot)) throw new Error("HOME_CHROME_SLOT");
  if (buf.length < 32) throw new Error("HOME_CHROME_FILE");
  if (buf.length > HOME_CHROME_MAX_BYTES) throw new Error("HOME_CHROME_SIZE");

  const sniffed = sniffMimeFromBuffer(buf);
  if (sniffed !== "image/jpeg" && sniffed !== "image/png" && sniffed !== "image/webp") {
    throw new Error("HOME_CHROME_TYPE");
  }

  const size = readRasterSize(buf, sniffed);
  const target = HOME_CHROME_SIZE[slot];
  if (!size || size.width !== target.width || size.height !== target.height) {
    throw new Error("HOME_CHROME_DIMENSIONS");
  }

  const ext = sniffed === "image/png" ? "png" : sniffed === "image/webp" ? "webp" : "jpg";
  const uploaded = await uploadBufferToSupabase(
    actorId,
    buf,
    `home-${slot}.${ext}`,
    sniffed,
    "image"
  );
  if ("error" in uploaded) throw new Error("HOME_CHROME_STORAGE");
  if (!isCustomHomeChromeUrl(uploaded.publicUrl)) throw new Error("HOME_CHROME_STORAGE");
  return { publicUrl: uploaded.publicUrl };
}

export async function removeReplacedHomeChrome(previous: string | null, nextUrl: string | null) {
  if (!previous || previous === nextUrl) return;
  try {
    await deletePublicStorageUrl(previous);
  } catch {
    /* old object can remain; the live URL no longer points at it */
  }
}
