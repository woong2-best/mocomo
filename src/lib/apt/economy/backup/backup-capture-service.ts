import { db } from "@/lib/db";
import type {
  EconomySnapshotPayload,
  SnapshotFleaEventRow,
  SnapshotFleaNpcRow,
  SnapshotGoldShopRow,
  SnapshotInventoryRow,
  SnapshotListingRow,
  SnapshotStats,
  SnapshotStorageRow,
  SnapshotWalletRow,
} from "./backup-types";

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export async function captureEconomyPayload(): Promise<{
  payload: EconomySnapshotPayload;
  stats: SnapshotStats;
}> {
  const [
    wallets,
    inventory,
    storage,
    listings,
    economyConfig,
    featureFlags,
    fraudRules,
    fraudRuleMeta,
    goldShop,
    fleaEvents,
    fleaNpcOffers,
  ] = await Promise.all([
    db.aptWallet.findMany(),
    db.aptInventoryItem.findMany(),
    db.aptStorageItem.findMany(),
    db.aptMarketListing.findMany({ where: { status: "SELLING" } }),
    db.aptEconomyConfig.findUnique({ where: { id: "default" } }),
    db.aptEconomyFeatureFlag.findUnique({ where: { id: "default" } }),
    db.aptFraudRule.findMany(),
    db.aptFraudRuleMeta.findUnique({ where: { id: "default" } }),
    db.aptGoldShopOffer.findMany(),
    db.aptFleaEvent.findMany(),
    db.aptFleaNpcOffer.findMany(),
  ]);

  const walletRows: SnapshotWalletRow[] = wallets.map((w) => ({
    userId: w.userId,
    gold: w.gold,
    gems: w.gems,
    legacyMigrated: w.legacyMigrated,
  }));

  const inventoryRows: SnapshotInventoryRow[] = inventory.map((r) => ({
    id: r.id,
    userId: r.userId,
    itemId: r.itemId,
    quantity: r.quantity,
    source: r.source,
    acquiredAt: r.acquiredAt.toISOString(),
  }));

  const storageRows: SnapshotStorageRow[] = storage.map((r) => ({
    userId: r.userId,
    itemId: r.itemId,
    quantity: r.quantity,
  }));

  const listingRows: SnapshotListingRow[] = listings.map((r) => ({
    id: r.id,
    sellerId: r.sellerId,
    buyerId: r.buyerId,
    itemId: r.itemId,
    itemKind: r.itemKind,
    stickerTypeId: r.stickerTypeId,
    roomId: r.roomId,
    itemData: r.itemData,
    source: r.source,
    status: r.status,
    priceGold: r.priceGold,
    priceKrw: r.priceKrw,
    fleaEventId: r.fleaEventId,
    hiddenByAdmin: r.hiddenByAdmin,
    suspiciousFlag: r.suspiciousFlag,
    viewCount: r.viewCount,
    expiresAt: iso(r.expiresAt),
    createdAt: r.createdAt.toISOString(),
    soldAt: iso(r.soldAt),
  }));

  const goldShopRows: SnapshotGoldShopRow[] = goldShop.map((r) => ({
    id: r.id,
    itemId: r.itemId,
    goldPrice: r.goldPrice,
    originalGoldPrice: r.originalGoldPrice,
    featured: r.featured,
    isNew: r.isNew,
    limitedStock: r.limitedStock,
    soldCount: r.soldCount,
    startsAt: iso(r.startsAt),
    endsAt: iso(r.endsAt),
    enabled: r.enabled,
    sortOrder: r.sortOrder,
  }));

  const fleaEventRows: SnapshotFleaEventRow[] = fleaEvents.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    notice: r.notice,
    bannerUrl: r.bannerUrl,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt.toISOString(),
    feeRate: r.feeRate,
    active: r.active,
    published: r.published,
    visitCount: r.visitCount,
  }));

  const fleaNpcRows: SnapshotFleaNpcRow[] = fleaNpcOffers.map((r) => ({
    id: r.id,
    eventId: r.eventId,
    kind: r.kind,
    stickerTypeId: r.stickerTypeId,
    goldPrice: r.goldPrice,
    discountPercent: r.discountPercent,
    stock: r.stock,
    soldCount: r.soldCount,
    boughtCount: r.boughtCount,
    enabled: r.enabled,
    sortOrder: r.sortOrder,
  }));

  const goldSupply = wallets.reduce((s, w) => s + w.gold, 0);
  const gemSupply = wallets.reduce((s, w) => s + w.gems, 0);

  const payload: EconomySnapshotPayload = {
    version: 1,
    wallets: walletRows,
    inventory: inventoryRows,
    storage: storageRows,
    listings: listingRows,
    economyConfig: economyConfig
      ? {
          ...economyConfig,
          publishedAt: iso(economyConfig.publishedAt),
        }
      : null,
    featureFlags: featureFlags
      ? {
          ...featureFlags,
          updatedAt: featureFlags.updatedAt.toISOString(),
        }
      : null,
    fraudRules: fraudRules.map((r) => ({
      id: r.id,
      label: r.label,
      weight: r.weight,
      enabled: r.enabled,
      threshold: r.threshold,
      description: r.description,
    })),
    fraudRuleMeta: fraudRuleMeta
      ? {
          ...fraudRuleMeta,
          publishedAt: iso(fraudRuleMeta.publishedAt),
        }
      : null,
    goldShop: goldShopRows,
    fleaEvents: fleaEventRows,
    fleaNpcOffers: fleaNpcRows,
  };

  const stats: SnapshotStats = {
    walletCount: walletRows.length,
    inventoryCount: inventoryRows.length,
    storageCount: storageRows.length,
    listingCount: listingRows.length,
    goldSupply,
    gemSupply,
    userCount: walletRows.length,
    goldShopOfferCount: goldShopRows.length,
    fleaEventCount: fleaEventRows.length,
    npcOfferCount: fleaNpcRows.length,
    fraudRuleCount: fraudRules.length,
    capturedAt: new Date().toISOString(),
  };

  return { payload, stats };
}

export async function captureCurrentStats(): Promise<SnapshotStats> {
  const { stats } = await captureEconomyPayload();
  return stats;
}
