import { db } from "@/lib/db";
import { compactWorkKey, normalizeWorkTitle } from "@/lib/used-catalog";
import { createNotification } from "@/lib/notifications";
import { formatUsedPrice } from "@/lib/used-market";
import type { UsedListing } from "@prisma/client";

const WTB_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export type WtbAlertInput = {
  workTitle?: string | null;
  animeSlug?: string | null;
  productType?: string | null;
  characterName?: string | null;
  maxPrice?: number | null;
  currency?: string | null;
  note?: string | null;
};

function listingMatchesAlert(listing: UsedListing, alert: {
  workTitle: string | null;
  animeSlug: string | null;
  productType: string | null;
  characterName: string | null;
  maxPrice: number | null;
  currency: string;
}): boolean {
  if (listing.status !== "SELLING") return false;
  if (alert.animeSlug && listing.animeSlug !== alert.animeSlug) {
    if (!listing.workTitle || compactWorkKey(listing.workTitle) !== compactWorkKey(alert.workTitle)) {
      return false;
    }
  } else if (alert.workTitle) {
    const want = compactWorkKey(alert.workTitle);
    const have = compactWorkKey(listing.workTitle);
    if (!want || !have || !have.includes(want)) return false;
  }
  if (alert.productType && listing.productType !== alert.productType) return false;
  if (alert.characterName?.trim()) {
    const c = alert.characterName.trim().toLowerCase();
    const lc = (listing.characterName ?? "").toLowerCase();
    if (!lc.includes(c)) return false;
  }
  if (alert.maxPrice != null && alert.maxPrice > 0) {
    const cur = (listing.currency ?? "krw").toLowerCase();
    const alertCur = alert.currency.toLowerCase();
    if (cur === alertCur && listing.price > alert.maxPrice) return false;
  }
  return !!(alert.workTitle || alert.animeSlug || alert.productType || alert.characterName);
}

export async function notifyWtbAlertsForListing(listingId: string): Promise<number> {
  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.status !== "SELLING") return 0;

  const alerts = await db.subcultureWtbAlert.findMany({
    where: {
      active: true,
      userId: { not: listing.sellerId },
      OR: [
        listing.animeSlug ? { animeSlug: listing.animeSlug } : undefined,
        listing.workTitle ? { workTitle: listing.workTitle } : undefined,
        listing.productType ? { productType: listing.productType } : undefined,
      ].filter(Boolean) as { animeSlug?: string; workTitle?: string; productType?: string }[],
    },
    take: 200,
  });

  const now = Date.now();
  let sent = 0;
  for (const alert of alerts) {
    if (!listingMatchesAlert(listing, alert)) continue;
    if (alert.lastNotifiedAt && now - alert.lastNotifiedAt.getTime() < WTB_COOLDOWN_MS) continue;

    await createNotification({
      userId: alert.userId,
      type: "subculture_wtb",
      title: "WTB 조건 상품 등록",
      body: `${listing.title} · ${formatUsedPrice(listing.price, listing.currency)}`,
      link: `/used/${listing.id}`,
      actorId: listing.sellerId,
    });

    await db.subcultureWtbAlert.update({
      where: { id: alert.id },
      data: { lastNotifiedAt: new Date() },
    });
    sent++;
  }
  return sent;
}

export async function createWtbAlert(userId: string, input: WtbAlertInput) {
  const workTitle = normalizeWorkTitle(input.workTitle);
  const animeSlug = input.animeSlug?.trim().slice(0, 120) || null;
  const productType = input.productType?.trim().slice(0, 40) || null;
  const characterName = input.characterName?.trim().slice(0, 80) || null;
  const maxPrice =
    input.maxPrice != null && input.maxPrice > 0 ? Math.floor(input.maxPrice) : null;
  const currency = (input.currency ?? "krw").toLowerCase().slice(0, 3);
  const note = input.note?.trim().slice(0, 200) || null;

  if (!workTitle && !animeSlug && !productType && !characterName) {
    return { error: "작품·상품종류·캐릭터 중 하나 이상을 입력해 주세요." as const };
  }

  const row = await db.subcultureWtbAlert.create({
    data: {
      userId,
      workTitle,
      animeSlug,
      productType,
      characterName,
      maxPrice,
      currency,
      note,
    },
  });
  return { alertId: row.id };
}

export async function listMyWtbAlerts(userId: string) {
  return db.subcultureWtbAlert.findMany({
    where: { userId, active: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function deactivateWtbAlert(userId: string, alertId: string) {
  const row = await db.subcultureWtbAlert.findUnique({ where: { id: alertId } });
  if (!row || row.userId !== userId) return { error: "권한이 없습니다." as const };
  await db.subcultureWtbAlert.update({
    where: { id: alertId },
    data: { active: false },
  });
  return { success: true as const };
}
