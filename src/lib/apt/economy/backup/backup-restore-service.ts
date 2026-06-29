import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type {
  EconomySnapshotPayload,
  RestorePlan,
  RestoreScope,
  SnapshotStats,
} from "./backup-types";
import { captureCurrentStats } from "./backup-capture-service";
import { verifyPayloadChecksum } from "./backup-checksum";

export function newRestoreCorrelationId(): string {
  return `corr_restore_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function buildRestorePlan(
  payload: EconomySnapshotPayload,
  scopes: RestoreScope[],
  currentStats: SnapshotStats
): RestorePlan {
  const snapshotGold = payload.wallets.reduce((s, w) => s + w.gold, 0);
  const snapshotGems = payload.wallets.reduce((s, w) => s + w.gems, 0);

  const warnings: string[] = [];
  if (scopes.includes("listings") && payload.listings.length > 0) {
    warnings.push("Listing 복구는 스냅샷 SELLING 목록을 upsert합니다. 이후 생성된 판매글은 유지됩니다.");
  }
  if (scopes.includes("inventory")) {
    warnings.push("Inventory 복구는 스냅샷에 포함된 유저의 인벤토리를 전체 교체합니다.");
  }

  return {
    scopes,
    walletUsers: scopes.includes("wallet") ? payload.wallets.length : 0,
    inventoryRows: scopes.includes("inventory") ? payload.inventory.length : 0,
    storageRows: scopes.includes("storage") ? payload.storage.length : 0,
    listingRows: scopes.includes("listings") ? payload.listings.length : 0,
    goldShopRows: scopes.includes("goldShop") ? payload.goldShop.length : 0,
    fleaEventRows: scopes.includes("flea") ? payload.fleaEvents.length : 0,
    npcOfferRows: scopes.includes("flea") ? payload.fleaNpcOffers.length : 0,
    fraudRuleRows: scopes.includes("fraudRules") ? payload.fraudRules.length : 0,
    configChanged: scopes.includes("config"),
    featureFlagsChanged: scopes.includes("featureFlags"),
    goldDelta: scopes.includes("wallet") ? snapshotGold - currentStats.goldSupply : 0,
    gemDelta: scopes.includes("wallet") ? snapshotGems - currentStats.gemSupply : 0,
    warnings,
  };
}

export async function dryRunRestore(
  payload: EconomySnapshotPayload,
  checksum: string,
  scopes: RestoreScope[]
): Promise<{ ok: true; plan: RestorePlan } | { error: string }> {
  if (!verifyPayloadChecksum(payload, checksum)) {
    return { error: "Snapshot corrupted — checksum 불일치" };
  }
  const currentStats = await captureCurrentStats();
  const plan = buildRestorePlan(payload, scopes, currentStats);
  return { ok: true, plan };
}

async function restoreWallets(tx: Prisma.TransactionClient, payload: EconomySnapshotPayload) {
  for (const w of payload.wallets) {
    await tx.aptWallet.upsert({
      where: { userId: w.userId },
      create: {
        userId: w.userId,
        gold: w.gold,
        gems: w.gems,
        legacyMigrated: w.legacyMigrated,
      },
      update: {
        gold: w.gold,
        gems: w.gems,
        legacyMigrated: w.legacyMigrated,
      },
    });
  }
}

async function restoreInventory(tx: Prisma.TransactionClient, payload: EconomySnapshotPayload) {
  const userIds = [...new Set(payload.inventory.map((r) => r.userId))];
  if (userIds.length === 0) return;
  await tx.aptInventoryItem.deleteMany({ where: { userId: { in: userIds } } });
  if (payload.inventory.length > 0) {
    await tx.aptInventoryItem.createMany({
      data: payload.inventory.map((r) => ({
        id: r.id,
        userId: r.userId,
        itemId: r.itemId,
        quantity: r.quantity,
        source: r.source,
        acquiredAt: new Date(r.acquiredAt),
      })),
      skipDuplicates: true,
    });
  }
}

async function restoreStorage(tx: Prisma.TransactionClient, payload: EconomySnapshotPayload) {
  const userIds = [...new Set(payload.storage.map((r) => r.userId))];
  if (userIds.length > 0) {
    await tx.aptStorageItem.deleteMany({ where: { userId: { in: userIds } } });
  }
  for (const r of payload.storage) {
    await tx.aptStorageItem.upsert({
      where: { userId_itemId: { userId: r.userId, itemId: r.itemId } },
      create: { userId: r.userId, itemId: r.itemId, quantity: r.quantity },
      update: { quantity: r.quantity },
    });
  }
}

async function restoreListings(tx: Prisma.TransactionClient, payload: EconomySnapshotPayload) {
  for (const r of payload.listings) {
    await tx.aptMarketListing.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        sellerId: r.sellerId,
        buyerId: r.buyerId,
        itemId: r.itemId,
        itemKind: r.itemKind,
        stickerTypeId: r.stickerTypeId,
        roomId: r.roomId,
        itemData: r.itemData as Prisma.InputJsonValue,
        source: r.source,
        status: r.status,
        priceGold: r.priceGold,
        priceKrw: r.priceKrw,
        fleaEventId: r.fleaEventId,
        hiddenByAdmin: r.hiddenByAdmin,
        suspiciousFlag: r.suspiciousFlag,
        viewCount: r.viewCount,
        expiresAt: r.expiresAt ? new Date(r.expiresAt) : null,
        createdAt: new Date(r.createdAt),
        soldAt: r.soldAt ? new Date(r.soldAt) : null,
      },
      update: {
        sellerId: r.sellerId,
        buyerId: r.buyerId,
        itemId: r.itemId,
        itemKind: r.itemKind,
        stickerTypeId: r.stickerTypeId,
        roomId: r.roomId,
        itemData: r.itemData as Prisma.InputJsonValue,
        source: r.source,
        status: r.status,
        priceGold: r.priceGold,
        priceKrw: r.priceKrw,
        fleaEventId: r.fleaEventId,
        hiddenByAdmin: r.hiddenByAdmin,
        suspiciousFlag: r.suspiciousFlag,
        viewCount: r.viewCount,
        expiresAt: r.expiresAt ? new Date(r.expiresAt) : null,
        soldAt: r.soldAt ? new Date(r.soldAt) : null,
      },
    });
  }
}

async function restoreConfig(tx: Prisma.TransactionClient, payload: EconomySnapshotPayload) {
  if (!payload.economyConfig) return;
  const raw = { ...payload.economyConfig };
  delete raw.publishedBy;
  const { id: _id, publishedAt, publishedById, ...rest } = raw;
  const publishedAtDate = publishedAt ? new Date(String(publishedAt)) : null;
  const publishedByIdStr = publishedById ? String(publishedById) : null;
  await tx.aptEconomyConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      version: Number(rest.version ?? 1),
      goldPerGem: Number(rest.goldPerGem ?? 100),
      bonusRate: Number(rest.bonusRate ?? 0),
      dailyGemExchangeLimit: Number(rest.dailyGemExchangeLimit ?? 10000),
      dailyGoldLimit: Number(rest.dailyGoldLimit ?? 50000),
      marketFee: Number(rest.marketFee ?? 0.05),
      npcBuyRate: Number(rest.npcBuyRate ?? 0.65),
      npcSellRate: Number(rest.npcSellRate ?? 0.7),
      starterGold: Number(rest.starterGold ?? 500),
      liveGoldPerCheer: Number(rest.liveGoldPerCheer ?? 2),
      dailyLiveGoldLimit: Number(rest.dailyLiveGoldLimit ?? 5000),
      liveWatchGoldPerMin: Number(rest.liveWatchGoldPerMin ?? 15),
      dailyWatchGoldLimit: Number(rest.dailyWatchGoldLimit ?? 3000),
      dailyMissionReward: Number(rest.dailyMissionReward ?? 80),
      weeklyMissionReward: Number(rest.weeklyMissionReward ?? 400),
      featuredRefreshHour: Number(rest.featuredRefreshHour ?? 0),
      newItemDays: Number(rest.newItemDays ?? 7),
      discountDefaultRate: Number(rest.discountDefaultRate ?? 0.2),
      recommendPriceWindow: Number(rest.recommendPriceWindow ?? 20),
      maxListingDays: Number(rest.maxListingDays ?? 30),
      priceHistoryDays: Number(rest.priceHistoryDays ?? 90),
      defaultFleaFee: Number(rest.defaultFleaFee ?? 0.05),
      defaultFleaDiscount: Number(rest.defaultFleaDiscount ?? 0.3),
      fleaEventCooldownHrs: Number(rest.fleaEventCooldownHrs ?? 168),
      pendingExpireDays: Number(rest.pendingExpireDays ?? 30),
      maxOfflineOps: Number(rest.maxOfflineOps ?? 100),
      emergencyMode: Boolean(rest.emergencyMode ?? false),
      fraudRestrictScore: Number(rest.fraudRestrictScore ?? 70),
      fraudMarketBlockScore: Number(rest.fraudMarketBlockScore ?? 90),
      fraudLiveBlockScore: Number(rest.fraudLiveBlockScore ?? 95),
      publishedAt: publishedAtDate,
      publishedById: publishedByIdStr,
    },
    update: {
      version: Number(rest.version ?? 1),
      goldPerGem: Number(rest.goldPerGem ?? 100),
      bonusRate: Number(rest.bonusRate ?? 0),
      dailyGemExchangeLimit: Number(rest.dailyGemExchangeLimit ?? 10000),
      dailyGoldLimit: Number(rest.dailyGoldLimit ?? 50000),
      marketFee: Number(rest.marketFee ?? 0.05),
      npcBuyRate: Number(rest.npcBuyRate ?? 0.65),
      npcSellRate: Number(rest.npcSellRate ?? 0.7),
      starterGold: Number(rest.starterGold ?? 500),
      liveGoldPerCheer: Number(rest.liveGoldPerCheer ?? 2),
      dailyLiveGoldLimit: Number(rest.dailyLiveGoldLimit ?? 5000),
      liveWatchGoldPerMin: Number(rest.liveWatchGoldPerMin ?? 15),
      dailyWatchGoldLimit: Number(rest.dailyWatchGoldLimit ?? 3000),
      dailyMissionReward: Number(rest.dailyMissionReward ?? 80),
      weeklyMissionReward: Number(rest.weeklyMissionReward ?? 400),
      featuredRefreshHour: Number(rest.featuredRefreshHour ?? 0),
      newItemDays: Number(rest.newItemDays ?? 7),
      discountDefaultRate: Number(rest.discountDefaultRate ?? 0.2),
      recommendPriceWindow: Number(rest.recommendPriceWindow ?? 20),
      maxListingDays: Number(rest.maxListingDays ?? 30),
      priceHistoryDays: Number(rest.priceHistoryDays ?? 90),
      defaultFleaFee: Number(rest.defaultFleaFee ?? 0.05),
      defaultFleaDiscount: Number(rest.defaultFleaDiscount ?? 0.3),
      fleaEventCooldownHrs: Number(rest.fleaEventCooldownHrs ?? 168),
      pendingExpireDays: Number(rest.pendingExpireDays ?? 30),
      maxOfflineOps: Number(rest.maxOfflineOps ?? 100),
      emergencyMode: Boolean(rest.emergencyMode ?? false),
      fraudRestrictScore: Number(rest.fraudRestrictScore ?? 70),
      fraudMarketBlockScore: Number(rest.fraudMarketBlockScore ?? 90),
      fraudLiveBlockScore: Number(rest.fraudLiveBlockScore ?? 95),
      publishedAt: publishedAtDate,
      publishedById: publishedByIdStr,
    },
  });
}

async function restoreFeatureFlags(tx: Prisma.TransactionClient, payload: EconomySnapshotPayload) {
  if (!payload.featureFlags) return;
  const raw = { ...payload.featureFlags };
  delete raw.updatedBy;
  const {
    id: _id,
    updatedAt: _u,
    updatedById,
    shopEnabled,
    marketEnabled,
    liveEnabled,
    missionEnabled,
    notificationEnabled,
    fleaEnabled,
    iapEnabled,
  } = raw;
  await tx.aptEconomyFeatureFlag.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      shopEnabled: Boolean(shopEnabled ?? true),
      marketEnabled: Boolean(marketEnabled ?? true),
      liveEnabled: Boolean(liveEnabled ?? true),
      missionEnabled: Boolean(missionEnabled ?? true),
      notificationEnabled: Boolean(notificationEnabled ?? true),
      fleaEnabled: Boolean(fleaEnabled ?? true),
      iapEnabled: Boolean(iapEnabled ?? true),
      updatedById: updatedById ? String(updatedById) : null,
    },
    update: {
      shopEnabled: Boolean(shopEnabled ?? true),
      marketEnabled: Boolean(marketEnabled ?? true),
      liveEnabled: Boolean(liveEnabled ?? true),
      missionEnabled: Boolean(missionEnabled ?? true),
      notificationEnabled: Boolean(notificationEnabled ?? true),
      fleaEnabled: Boolean(fleaEnabled ?? true),
      iapEnabled: Boolean(iapEnabled ?? true),
      updatedById: updatedById ? String(updatedById) : null,
    },
  });
}

async function restoreFraudRules(tx: Prisma.TransactionClient, payload: EconomySnapshotPayload) {
  await tx.aptFraudRule.deleteMany();
  for (const r of payload.fraudRules) {
    await tx.aptFraudRule.create({
      data: {
        id: r.id,
        label: r.label,
        weight: r.weight,
        enabled: r.enabled,
        threshold: r.threshold as Prisma.InputJsonValue,
        description: r.description,
      },
    });
  }
  if (payload.fraudRuleMeta) {
    const raw = { ...payload.fraudRuleMeta };
    delete raw.publishedBy;
    const { id: _id, publishedAt, publishedById, version } = raw;
    await tx.aptFraudRuleMeta.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        version: Number(version ?? 1),
        publishedAt: publishedAt ? new Date(String(publishedAt)) : null,
        publishedById: publishedById ? String(publishedById) : null,
      },
      update: {
        version: Number(version ?? 1),
        publishedAt: publishedAt ? new Date(String(publishedAt)) : null,
        publishedById: publishedById ? String(publishedById) : null,
      },
    });
  }
}

async function restoreGoldShop(tx: Prisma.TransactionClient, payload: EconomySnapshotPayload) {
  for (const r of payload.goldShop) {
    await tx.aptGoldShopOffer.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        itemId: r.itemId,
        goldPrice: r.goldPrice,
        originalGoldPrice: r.originalGoldPrice,
        featured: r.featured,
        isNew: r.isNew,
        limitedStock: r.limitedStock,
        soldCount: r.soldCount,
        startsAt: r.startsAt ? new Date(r.startsAt) : null,
        endsAt: r.endsAt ? new Date(r.endsAt) : null,
        enabled: r.enabled,
        sortOrder: r.sortOrder,
      },
      update: {
        goldPrice: r.goldPrice,
        originalGoldPrice: r.originalGoldPrice,
        featured: r.featured,
        isNew: r.isNew,
        limitedStock: r.limitedStock,
        soldCount: r.soldCount,
        startsAt: r.startsAt ? new Date(r.startsAt) : null,
        endsAt: r.endsAt ? new Date(r.endsAt) : null,
        enabled: r.enabled,
        sortOrder: r.sortOrder,
      },
    });
  }
}

async function restoreFlea(tx: Prisma.TransactionClient, payload: EconomySnapshotPayload) {
  for (const r of payload.fleaEvents) {
    await tx.aptFleaEvent.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        slug: r.slug,
        title: r.title,
        description: r.description,
        notice: r.notice,
        bannerUrl: r.bannerUrl,
        startsAt: new Date(r.startsAt),
        endsAt: new Date(r.endsAt),
        feeRate: r.feeRate,
        active: r.active,
        published: r.published,
        visitCount: r.visitCount,
      },
      update: {
        slug: r.slug,
        title: r.title,
        description: r.description,
        notice: r.notice,
        bannerUrl: r.bannerUrl,
        startsAt: new Date(r.startsAt),
        endsAt: new Date(r.endsAt),
        feeRate: r.feeRate,
        active: r.active,
        published: r.published,
        visitCount: r.visitCount,
      },
    });
  }
  for (const r of payload.fleaNpcOffers) {
    await tx.aptFleaNpcOffer.upsert({
      where: { id: r.id },
      create: {
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
      },
      update: {
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
      },
    });
  }
}

async function applyRestoreScopes(
  tx: Prisma.TransactionClient,
  payload: EconomySnapshotPayload,
  scopes: RestoreScope[]
) {
  if (scopes.includes("wallet")) await restoreWallets(tx, payload);
  if (scopes.includes("inventory")) await restoreInventory(tx, payload);
  if (scopes.includes("storage")) await restoreStorage(tx, payload);
  if (scopes.includes("listings")) await restoreListings(tx, payload);
  if (scopes.includes("config")) await restoreConfig(tx, payload);
  if (scopes.includes("featureFlags")) await restoreFeatureFlags(tx, payload);
  if (scopes.includes("fraudRules")) await restoreFraudRules(tx, payload);
  if (scopes.includes("goldShop")) await restoreGoldShop(tx, payload);
  if (scopes.includes("flea")) await restoreFlea(tx, payload);
}

export async function executePartialRestore(input: {
  snapshotId: string;
  payload: EconomySnapshotPayload;
  checksum: string;
  scopes: RestoreScope[];
  adminId: string;
  reason: string;
  dryRun?: boolean;
}): Promise<
  | { ok: true; correlationId: string; plan: RestorePlan; restoreLogId: string }
  | { error: string }
> {
  if (!input.reason.trim()) return { error: "복구 사유를 입력하세요." };
  if (input.scopes.length === 0) return { error: "복구 범위를 하나 이상 선택하세요." };
  if (!verifyPayloadChecksum(input.payload, input.checksum)) {
    return { error: "Snapshot corrupted — checksum 불일치로 복구가 차단되었습니다." };
  }

  const currentStats = await captureCurrentStats();
  const plan = buildRestorePlan(input.payload, input.scopes, currentStats);
  const correlationId = newRestoreCorrelationId();

  if (input.dryRun) {
    const log = await db.aptEconomyRestoreLog.create({
      data: {
        snapshotId: input.snapshotId,
        adminId: input.adminId,
        correlationId,
        scopes: input.scopes,
        dryRun: true,
        reason: input.reason,
        stats: plan as unknown as Prisma.InputJsonValue,
      },
    });
    return { ok: true, correlationId, plan, restoreLogId: log.id };
  }

  const { createEconomySnapshot } = await import("./snapshot-service");
  await createEconomySnapshot({
    type: "before_restore",
    label: `before_restore_${correlationId.slice(-8)}`,
    createdById: input.adminId,
  });

  await db.$transaction(
    async (tx) => {
      await applyRestoreScopes(tx, input.payload, input.scopes);
    },
    { timeout: 120_000 }
  );

  const log = await db.aptEconomyRestoreLog.create({
    data: {
      snapshotId: input.snapshotId,
      adminId: input.adminId,
      correlationId,
      scopes: input.scopes,
      dryRun: false,
      reason: input.reason,
      stats: {
        walletUsers: plan.walletUsers,
        inventoryRows: plan.inventoryRows,
        storageRows: plan.storageRows,
        listingRows: plan.listingRows,
        goldShopRows: plan.goldShopRows,
        fleaEventRows: plan.fleaEventRows,
        npcOfferRows: plan.npcOfferRows,
        fraudRuleRows: plan.fraudRuleRows,
        goldDelta: plan.goldDelta,
        gemDelta: plan.gemDelta,
      } as Prisma.InputJsonValue,
    },
  });

  return { ok: true, correlationId, plan, restoreLogId: log.id };
}

export function parseSnapshotPayload(raw: unknown): EconomySnapshotPayload {
  return raw as EconomySnapshotPayload;
}
