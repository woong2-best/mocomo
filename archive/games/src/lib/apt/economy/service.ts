import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { mergeGameState } from "@/lib/apt/game/defaults";
import { buildLegacyEconomySeed } from "./migrate-from-game";
import type {
  EconomySnapshot,
  InventoryItem,
  InventoryItemSource,
  StorageItem,
} from "./types";
import { resolveAptHomeOwnerId } from "@/actions/apt-cohabitation";
import { creditWallet, debitWallet, mutateWalletInTx } from "./wallet-service";
import {
  atomicConsumeStorageInTx,
  atomicReturnStorageInTx,
} from "./storage-atomic";
import {
  claimEconomyOperation,
  type StoragePendingOp,
} from "./operation-service";
import { writeEconomyLog } from "./economy-log-service";
import { newCorrelationId } from "./audit/correlation-id";
import { STICKER_CATALOG } from "@/lib/diorama/sticker-catalog";

type TxClient = Prisma.TransactionClient;

function toInventoryItem(row: {
  itemId: string;
  quantity: number;
  acquiredAt: Date;
  source: string;
}): InventoryItem {
  return {
    itemId: row.itemId,
    quantity: row.quantity,
    acquiredAt: row.acquiredAt.toISOString(),
    source: row.source as InventoryItemSource,
  };
}

export async function loadEconomySnapshot(userId: string): Promise<EconomySnapshot> {
  const ownerId = await resolveAptHomeOwnerId(userId);
  await ensureEconomyMigrated(ownerId);

  const [wallet, inventoryRows, storageRows] = await Promise.all([
    db.aptWallet.findUnique({ where: { userId: ownerId } }),
    db.aptInventoryItem.findMany({
      where: { userId: ownerId },
      orderBy: { acquiredAt: "asc" },
    }),
    db.aptStorageItem.findMany({ where: { userId: ownerId } }),
  ]);

  return {
    wallet: {
      gold: wallet?.gold ?? 0,
      gems: wallet?.gems ?? 0,
    },
    inventory: inventoryRows.map(toInventoryItem),
    storage: storageRows.map(
      (r): StorageItem => ({ itemId: r.itemId, quantity: r.quantity })
    ),
    syncedAt: new Date().toISOString(),
  };
}

export async function ensureEconomyMigrated(userId: string): Promise<void> {
  const existing = await db.aptWallet.findUnique({ where: { userId } });
  if (existing?.legacyMigrated) return;

  const profile = await db.aptProfile.findUnique({
    where: { userId },
    select: { simulationState: true },
  });
  const sim = profile?.simulationState as Record<string, unknown> | null;
  const seed = buildLegacyEconomySeed(mergeGameState(sim?.game));
  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.aptWallet.upsert({
      where: { userId },
      create: {
        userId,
        gold: seed.gold,
        gems: seed.gems,
        legacyMigrated: true,
      },
      update: {
        gold: seed.gold,
        gems: seed.gems,
        legacyMigrated: true,
      },
    });

    if (!existing?.legacyMigrated) {
      for (const item of seed.items) {
        await tx.aptInventoryItem.upsert({
          where: { userId_itemId: { userId, itemId: item.itemId } },
          create: {
            userId,
            itemId: item.itemId,
            quantity: item.quantity,
            source: item.source,
            acquiredAt: now,
          },
          update: {},
        });
        await tx.aptStorageItem.upsert({
          where: { userId_itemId: { userId, itemId: item.itemId } },
          create: {
            userId,
            itemId: item.itemId,
            quantity: item.quantity,
          },
          update: {},
        });
      }
    }
  });
}

export async function addInventoryAndStorageInTx(
  tx: TxClient,
  userId: string,
  itemId: string,
  quantity: number,
  source: InventoryItemSource
): Promise<void> {
  const now = new Date();
  await tx.aptInventoryItem.upsert({
    where: { userId_itemId: { userId, itemId } },
    create: {
      userId,
      itemId,
      quantity,
      source,
      acquiredAt: now,
    },
    update: {
      quantity: { increment: quantity },
      source,
    },
  });
  await tx.aptStorageItem.upsert({
    where: { userId_itemId: { userId, itemId } },
    create: { userId, itemId, quantity },
    update: { quantity: { increment: quantity } },
  });
}

export async function addInventoryAndStorage(
  userId: string,
  itemId: string,
  quantity: number,
  source: InventoryItemSource
): Promise<void> {
  await db.$transaction((tx) =>
    addInventoryAndStorageInTx(tx, userId, itemId, quantity, source)
  );
}

export async function adjustWallet(
  userId: string,
  delta: { gold?: number; gems?: number },
  meta?: { type?: "mission" | "admin"; referenceId?: string; memo?: string }
): Promise<void> {
  await ensureEconomyMigrated(userId);
  const type = meta?.type ?? "admin";
  if (delta.gold != null && delta.gold !== 0) {
    if (delta.gold > 0) {
      await creditWallet({
        userId,
        currency: "gold",
        amount: delta.gold,
        type,
        referenceId: meta?.referenceId,
        referenceType: "AptWallet",
        memo: meta?.memo,
      });
    } else {
      await debitWallet({
        userId,
        currency: "gold",
        amount: -delta.gold,
        type,
        referenceId: meta?.referenceId,
        referenceType: "AptWallet",
        memo: meta?.memo,
      });
    }
  }
  if (delta.gems != null && delta.gems !== 0) {
    if (delta.gems > 0) {
      await creditWallet({
        userId,
        currency: "gems",
        amount: delta.gems,
        type,
        referenceId: meta?.referenceId,
        referenceType: "AptWallet",
        memo: meta?.memo,
      });
    } else {
      await debitWallet({
        userId,
        currency: "gems",
        amount: -delta.gems,
        type,
        referenceId: meta?.referenceId,
        referenceType: "AptWallet",
        memo: meta?.memo,
      });
    }
  }
}

export async function spendGoldForShop(
  userId: string,
  amount: number,
  itemId: string
): Promise<void> {
  await ensureEconomyMigrated(userId);
  await debitWallet({
    userId,
    currency: "gold",
    amount,
    type: "shop",
    referenceId: itemId,
    referenceType: "AptInventoryItem",
    memo: `가구 구매: ${itemId}`,
  });
}

export async function purchaseShopItemAtomic(
  userId: string,
  itemId: string,
  price: number,
  offer: { offerId: string; limitedStock: number } | null,
  correlationId?: string
): Promise<string> {
  const corrId = correlationId ?? newCorrelationId();
  await ensureEconomyMigrated(userId);
  await db.$transaction(async (tx) => {
    if (offer) {
      const stock = await tx.aptGoldShopOffer.updateMany({
        where: {
          id: offer.offerId,
          soldCount: { lt: offer.limitedStock },
        },
        data: { soldCount: { increment: 1 } },
      });
      if (stock.count !== 1) {
        throw new Error("한정 수량이 모두 판매되었습니다.");
      }
    }

    await mutateWalletInTx(tx, {
      userId,
      currency: "gold",
      amount: -price,
      type: "shop",
      referenceId: itemId,
      referenceType: "AptInventoryItem",
      correlationId: corrId,
      memo: `가구 구매: ${itemId}`,
    });

    await addInventoryAndStorageInTx(tx, userId, itemId, 1, "shop");

    await writeEconomyLog(tx, {
      userId,
      action: "shop_purchase",
      deltaGold: -price,
      reason: `상점 구매 ${itemId}`,
      referenceId: itemId,
      referenceType: "AptInventoryItem",
      correlationId: corrId,
    });
  });

  const asset = STICKER_CATALOG[itemId];
  const { notifyShopPurchase } = await import("./notification/economy-notify");
  notifyShopPurchase({
    userId,
    itemLabel: asset?.label ?? itemId,
    priceGold: price,
    itemId,
    correlationId: corrId,
  });
  return corrId;
}

export async function consumeStorageItem(
  userId: string,
  itemId: string,
  amount = 1,
  opId?: string
): Promise<{ ok: true } | { error: string }> {
  const ownerId = await resolveAptHomeOwnerId(userId);
  try {
    await db.$transaction(async (tx) => {
      if (opId) {
        const claimed = await claimEconomyOperation(tx, {
          opId,
          userId: ownerId,
          kind: "storage_consume",
          itemId,
          amount,
        });
        if (!claimed) return;
      }
      const ok = await atomicConsumeStorageInTx(tx, ownerId, itemId, amount);
      if (!ok) throw new Error("창고에 배치 가능한 아이템이 없습니다.");
      await writeEconomyLog(tx, {
        userId: ownerId,
        action: "storage_consume",
        reason: `${itemId} x${amount}`,
        referenceId: opId,
        referenceType: "AptStorageItem",
      });
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "창고 처리에 실패했습니다.",
    };
  }
  return { ok: true };
}

export async function returnStorageItem(
  userId: string,
  itemId: string,
  amount = 1,
  opId?: string
): Promise<{ ok: true } | { error: string }> {
  const ownerId = await resolveAptHomeOwnerId(userId);
  try {
    await db.$transaction(async (tx) => {
      if (opId) {
        const claimed = await claimEconomyOperation(tx, {
          opId,
          userId: ownerId,
          kind: "storage_return",
          itemId,
          amount,
        });
        if (!claimed) return;
      }
      const ok = await atomicReturnStorageInTx(tx, ownerId, itemId, amount);
      if (!ok) throw new Error("창고 반환 한도를 초과했습니다.");
      await writeEconomyLog(tx, {
        userId: ownerId,
        action: "storage_return",
        reason: `${itemId} x${amount}`,
        referenceId: opId,
        referenceType: "AptStorageItem",
      });
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "창고 반환에 실패했습니다.",
    };
  }
  return { ok: true };
}

export async function syncPendingStorageOps(
  userId: string,
  ops: StoragePendingOp[]
): Promise<{ ok: true; applied: number } | { error: string }> {
  const { assertOfflineSyncEnabled } = await import("./economy-emergency");
  try {
    await assertOfflineSyncEnabled();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "동기화가 일시 중단되었습니다." };
  }

  const config = await import("./config-service").then((m) => m.getEconomyConfigFull());
  const capped = ops.slice(0, config.maxOfflineOps);

  let applied = 0;
  for (const op of capped) {
    if (op.amount <= 0) continue;
    if (op.kind === "consume") {
      const res = await consumeStorageItem(userId, op.itemId, op.amount, op.opId);
      if ("error" in res) return res;
      applied += 1;
    } else {
      const res = await returnStorageItem(userId, op.itemId, op.amount, op.opId);
      if ("error" in res) return res;
      applied += 1;
    }
  }
  return { ok: true, applied };
}

/** @deprecated syncPendingStorageOps 사용 */
export async function syncPendingStorageConsume(
  userId: string,
  pending: Record<string, number>
): Promise<{ ok: true } | { error: string }> {
  const ops: StoragePendingOp[] = Object.entries(pending)
    .filter(([, n]) => n > 0)
    .map(([itemId, amount]) => ({
      opId: `legacy-${itemId}-${amount}`,
      itemId,
      amount,
      kind: "consume" as const,
    }));
  const res = await syncPendingStorageOps(userId, ops);
  if ("error" in res) return res;
  return { ok: true };
}
