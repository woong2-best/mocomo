import { db } from "@/lib/db";
import { getStickerGoldPrice } from "@/lib/apt/game/shop";
import { STICKER_CATALOG } from "@/lib/diorama/sticker-catalog";

export type GoldShopOfferDto = {
  itemId: string;
  label: string;
  src: string;
  category: string;
  goldPrice: number;
  originalGoldPrice: number | null;
  featured: boolean;
  isNew: boolean;
  limitedStock: number | null;
  soldOut: boolean;
  discountPercent: number | null;
  endsAt: string | null;
};

function isOfferActive(row: {
  enabled: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}): boolean {
  if (!row.enabled) return false;
  const now = Date.now();
  if (row.startsAt && row.startsAt.getTime() > now) return false;
  if (row.endsAt && row.endsAt.getTime() < now) return false;
  return true;
}

export async function listGoldShopCatalog(): Promise<GoldShopOfferDto[]> {
  const rows = await db.aptGoldShopOffer.findMany({
    where: { enabled: true },
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
  });

  return rows
    .filter(isOfferActive)
    .map((row) => {
      const asset = STICKER_CATALOG[row.itemId];
      const soldOut =
        row.limitedStock != null && row.soldCount >= row.limitedStock;
      const discountPercent =
        row.originalGoldPrice && row.originalGoldPrice > row.goldPrice
          ? Math.round((1 - row.goldPrice / row.originalGoldPrice) * 100)
          : null;
      return {
        itemId: row.itemId,
        label: asset?.label ?? row.itemId,
        src: asset?.src ?? "",
        category: asset?.category ?? "furniture",
        goldPrice: row.goldPrice,
        originalGoldPrice: row.originalGoldPrice,
        featured: row.featured,
        isNew: row.isNew,
        limitedStock: row.limitedStock,
        soldOut,
        discountPercent,
        endsAt: row.endsAt?.toISOString() ?? null,
      };
    })
    .filter((o) => o.src);
}

export async function resolveGoldShopPrice(itemId: string): Promise<{
  goldPrice: number;
  offerId: string | null;
  limitedStock: number | null;
  soldCount: number;
} | null> {
  const row = await db.aptGoldShopOffer.findUnique({ where: { itemId } });
  if (row && isOfferActive(row)) {
    return {
      goldPrice: row.goldPrice,
      offerId: row.id,
      limitedStock: row.limitedStock,
      soldCount: row.soldCount,
    };
  }
  const base = getStickerGoldPrice(itemId);
  if (base <= 0 && !STICKER_CATALOG[itemId]) return null;
  return { goldPrice: base, offerId: null, limitedStock: null, soldCount: 0 };
}

export async function resolveGoldShopPriceForUser(
  userId: string,
  itemId: string
): Promise<{
  goldPrice: number;
  offerId: string | null;
  limitedStock: number | null;
  soldCount: number;
} | null> {
  const published = await resolveGoldShopPrice(itemId);
  const { getActiveCanary } = await import("./canary/canary-service");
  const { shouldApplyCanary } = await import("./canary/canary-resolve");
  const canary = await getActiveCanary("SHOP", itemId);
  if (!canary || !shouldApplyCanary(userId, canary)) return published;
  const draft = canary.draftPayload as { goldPrice?: number; id?: string };
  if (!published) return published;
  return {
    ...published,
    goldPrice: draft.goldPrice ?? published.goldPrice,
    offerId: draft.id ?? published.offerId,
  };
}

export async function incrementGoldShopSold(offerId: string): Promise<void> {
  await db.aptGoldShopOffer.update({
    where: { id: offerId },
    data: { soldCount: { increment: 1 } },
  });
}

const SEED_OFFERS = [
  { itemId: "sofa", goldPrice: 960, originalGoldPrice: 1200, featured: true, isNew: false, sortOrder: 1 },
  { itemId: "bed", goldPrice: 1200, originalGoldPrice: 1500, featured: true, isNew: false, sortOrder: 2 },
  { itemId: "bookshelf", goldPrice: 512, originalGoldPrice: 640, featured: false, isNew: true, sortOrder: 10 },
  { itemId: "wardrobe", goldPrice: 560, originalGoldPrice: 700, featured: false, isNew: true, sortOrder: 11 },
  { itemId: "garland", goldPrice: 256, originalGoldPrice: 320, featured: false, isNew: false, limitedStock: 50, sortOrder: 20 },
  { itemId: "gamepad", goldPrice: 88, originalGoldPrice: 110, featured: false, isNew: false, limitedStock: 30, sortOrder: 21 },
] as const;

export async function seedGoldShopOffers(): Promise<void> {
  const endsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  for (const o of SEED_OFFERS) {
    await db.aptGoldShopOffer.upsert({
      where: { itemId: o.itemId },
      create: {
        itemId: o.itemId,
        goldPrice: o.goldPrice,
        originalGoldPrice: o.originalGoldPrice,
        featured: o.featured,
        isNew: o.isNew,
        limitedStock: "limitedStock" in o ? o.limitedStock : null,
        endsAt: "limitedStock" in o ? endsAt : null,
        sortOrder: o.sortOrder,
        enabled: true,
      },
      update: {
        goldPrice: o.goldPrice,
        originalGoldPrice: o.originalGoldPrice,
        featured: o.featured,
        isNew: o.isNew,
        limitedStock: "limitedStock" in o ? o.limitedStock : null,
        sortOrder: o.sortOrder,
        enabled: true,
      },
    });
  }
}
