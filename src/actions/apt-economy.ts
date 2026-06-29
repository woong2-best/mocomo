"use server";

import { revalidatePath } from "next/cache";
import { revalidateAptHub } from "@/lib/apt/revalidate-hub";
import { getCachedCurrentUser } from "@/lib/auth";
import {
  loadEconomySnapshot,
  purchaseShopItemAtomic,
  returnStorageItem,
  consumeStorageItem,
  syncPendingStorageOps,
  adjustWallet,
} from "@/lib/apt/economy/service";
import type { EconomySnapshot, LocalEconomyCache, StoragePendingOp } from "@/lib/apt/economy/types";
import { shouldConsumeStorage } from "@/lib/apt/economy/storage-utils";
import { mergePendingOps } from "@/lib/apt/economy/operation-service";
import {
  isStarterOwned,
} from "@/lib/apt/game/shop";
import {
  resolveGoldShopPrice,
  seedGoldShopOffers,
  listGoldShopCatalog,
  type GoldShopOfferDto,
} from "@/lib/apt/economy/gold-shop-service";
import { db } from "@/lib/db";
import { mergeGameState } from "@/lib/apt/game/defaults";
import type { AptGameState } from "@/lib/apt/game/types";
import { resolveAptHomeOwnerId } from "@/actions/apt-cohabitation";
import { assertShopEnabled } from "@/lib/apt/economy/economy-emergency";
import { assertFraudAllowed } from "@/lib/apt/economy/fraud/fraud-restrictions";

export type AptEconomyActionResult =
  | { ok: true; economy: EconomySnapshot }
  | { error: string };

export async function getAptEconomySnapshot(): Promise<EconomySnapshot | null> {
  const user = await getCachedCurrentUser();
  if (!user) return null;
  return loadEconomySnapshot(user.id);
}

/** 로그인 시 서버 스냅샷 + 오프라인 pending 창고 동기화 */
export async function syncAptEconomyCache(
  pendingOps: StoragePendingOp[] = [],
  legacyPending: Record<string, number> = {}
): Promise<AptEconomyActionResult | null> {
  const user = await getCachedCurrentUser();
  if (!user) return null;

  const merged = mergePendingOps(pendingOps, legacyPending);
  if (merged.length > 0) {
    const sync = await syncPendingStorageOps(user.id, merged);
    if ("error" in sync) return sync;
  }

  const economy = await loadEconomySnapshot(user.id);
  revalidateAptHub();
  return { ok: true, economy };
}

export async function getAptGoldShopCatalog(): Promise<GoldShopOfferDto[]> {
  await seedGoldShopOffers();
  return listGoldShopCatalog();
}

export async function purchaseAptShopItem(itemId: string): Promise<
  | { ok: true; economy: EconomySnapshot; price: number }
  | { ok: true; alreadyOwned: true; economy: EconomySnapshot }
  | { error: string }
> {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const economy = await loadEconomySnapshot(user.id);
  const owned = economy.inventory.find((i) => i.itemId === itemId && i.quantity > 0);
  if (isStarterOwned(itemId) || owned) {
    return { ok: true, alreadyOwned: true, economy };
  }

  const priceInfo = await resolveGoldShopPrice(itemId);
  if (!priceInfo) return { error: "판매하지 않는 상품입니다." };
  if (
    priceInfo.limitedStock != null &&
    priceInfo.soldCount >= priceInfo.limitedStock
  ) {
    return { error: "한정 수량이 모두 판매되었습니다." };
  }

  const price = priceInfo.goldPrice;
  if (economy.wallet.gold < price) {
    return { error: `골드가 부족합니다. (${price.toLocaleString()}G 필요)` };
  }

  const ownerId = await resolveAptHomeOwnerId(user.id);
  try {
    await assertShopEnabled();
    await assertFraudAllowed(ownerId, "shop");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "구매할 수 없습니다." };
  }
  try {
    await purchaseShopItemAtomic(
      ownerId,
      itemId,
      price,
      priceInfo.offerId && priceInfo.limitedStock != null
        ? { offerId: priceInfo.offerId, limitedStock: priceInfo.limitedStock }
        : null
    );
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "구매에 실패했습니다.",
    };
  }

  const next = await loadEconomySnapshot(user.id);
  revalidateAptHub();
  return { ok: true, economy: next, price };
}

export async function consumeAptStorageItem(
  itemId: string,
  amount = 1,
  opId?: string
): Promise<AptEconomyActionResult | { ok: true; skipped: true }> {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };
  if (!shouldConsumeStorage(itemId)) return { ok: true, skipped: true };

  const res = await consumeStorageItem(user.id, itemId, amount, opId);
  if ("error" in res) return res;
  const economy = await loadEconomySnapshot(user.id);
  return { ok: true, economy };
}

export async function returnAptStorageItem(
  itemId: string,
  amount = 1,
  opId?: string
): Promise<AptEconomyActionResult | { ok: true; skipped: true }> {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };
  if (!shouldConsumeStorage(itemId)) return { ok: true, skipped: true };

  const res = await returnStorageItem(user.id, itemId, amount, opId);
  if ("error" in res) return res;
  const economy = await loadEconomySnapshot(user.id);
  return { ok: true, economy };
}

/** 미션·에너지 등 — wallet만 game state와 함께 노출 */
export async function syncGameWalletFromEconomy(
  game: AptGameState
): Promise<AptGameState> {
  const user = await getCachedCurrentUser();
  if (!user) return game;
  const economy = await loadEconomySnapshot(user.id);
  return {
    ...game,
    gold: economy.wallet.gold,
    gems: economy.wallet.gems,
  };
}

export async function grantAptWalletRewards(delta: {
  gold?: number;
  gems?: number;
}): Promise<AptEconomyActionResult | null> {
  const user = await getCachedCurrentUser();
  if (!user) return null;
  const ownerId = await resolveAptHomeOwnerId(user.id);
  await adjustWallet(ownerId, delta, { type: "mission", memo: "미션 보상" });
  const economy = await loadEconomySnapshot(user.id);
  revalidateAptHub();
  return { ok: true, economy };
}

/** @deprecated game.simulationState — wallet 읽기 전용 동기화 */
export async function mirrorEconomyToGameState(userId: string): Promise<void> {
  const ownerId = await resolveAptHomeOwnerId(userId);
  const economy = await loadEconomySnapshot(ownerId);
  const row = await db.aptProfile.findUnique({
    where: { userId: ownerId },
    select: { simulationState: true },
  });
  const sim = (row?.simulationState as Record<string, unknown>) ?? {};
  const game = mergeGameState(sim.game);
  game.gold = economy.wallet.gold;
  game.gems = economy.wallet.gems;
  game.ownedStickers = economy.inventory
    .filter((i) => i.quantity > 0)
    .map((i) => i.itemId);

  await db.aptProfile.upsert({
    where: { userId: ownerId },
    create: {
      userId: ownerId,
      simulationState: { ...sim, game },
      moveInCompletedAt: new Date(),
    },
    update: { simulationState: { ...sim, game } },
  });
}

export type { EconomySnapshot, LocalEconomyCache };
