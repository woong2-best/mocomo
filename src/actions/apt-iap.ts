"use server";

import { revalidatePath } from "next/cache";
import { revalidateAptHub } from "@/lib/apt/revalidate-hub";
import { getCachedCurrentUser } from "@/lib/auth";
import { ensureEconomyConfig, getEconomyConfig } from "@/lib/apt/economy/config-service";
import { exchangeGemsForGold } from "@/lib/apt/economy/gem-exchange-service";
import { fulfillIapPurchase } from "@/lib/apt/economy/iap-fulfillment-service";
import { loadEconomySnapshot } from "@/lib/apt/economy/service";
import {
  listEnabledShopProducts,
  seedShopProducts,
} from "@/lib/apt/economy/shop-product-service";
import type { AptEconomyConfigDto, AptShopProductDto } from "@/lib/apt/economy/wallet-types";
import type { EconomySnapshot } from "@/lib/apt/economy/types";
import { mirrorEconomyToGameState } from "@/actions/apt-economy";

export type AptGemShopCatalog = {
  products: AptShopProductDto[];
  config: AptEconomyConfigDto;
};

export async function getAptGemShopCatalog(): Promise<AptGemShopCatalog | null> {
  const user = await getCachedCurrentUser();
  if (!user) return null;

  await seedShopProducts();
  const [products, config] = await Promise.all([
    listEnabledShopProducts(),
    ensureEconomyConfig(),
  ]);
  return { products: products.filter((p) => p.type === "gems" || p.type === "bundle"), config };
}

export async function restoreAptIapPurchases(
  purchases: Array<{
    provider: "google_play" | "app_store";
    productId: string;
    purchaseToken: string;
    orderId?: string;
  }>
): Promise<{ ok: true; restored: number } | { error: string }> {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "Î°úÍ∑∏?∏Ïù¥ ?ÑÏöî?©Îãà??" };

  let restored = 0;
  for (const p of purchases) {
    const res = await fulfillIapPurchase(user.id, p);
    if ("error" in res) continue;
    if (!("alreadyFulfilled" in res && res.alreadyFulfilled)) restored += 1;
  }

  if (restored > 0) {
    await mirrorEconomyToGameState(user.id);
    revalidateAptHub();
  }

  return { ok: true, restored };
}

/** @deprecated ?¥Îùº?¥Ïñ∏?∏Îäî /api/iap/google/verify ?¨Ïö© */
export async function fulfillAptIapPurchase(input: {
  provider: "google_play" | "app_store";
  productId: string;
  purchaseToken: string;
  orderId?: string;
}): Promise<
  | {
      ok: true;
      economy: EconomySnapshot;
      gemsGranted: number;
      goldGranted: number;
      alreadyFulfilled?: boolean;
    }
  | { error: string }
> {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "Î°úÍ∑∏?∏Ïù¥ ?ÑÏöî?©Îãà??" };

  await seedShopProducts();
  const res = await fulfillIapPurchase(user.id, input);
  if ("error" in res) return res;

  await mirrorEconomyToGameState(user.id);
  const economy = await loadEconomySnapshot(user.id);
  revalidateAptHub();

  if ("alreadyFulfilled" in res && res.alreadyFulfilled) {
    return {
      ok: true,
      economy,
      gemsGranted: 0,
      goldGranted: 0,
      alreadyFulfilled: true,
    };
  }

  if (!("gemsGranted" in res)) return { error: "Í≤∞Ï†ú Ï≤òÎ¶¨???§Ìå®?àÏäµ?àÎã§." };

  return {
    ok: true,
    economy,
    gemsGranted: res.gemsGranted,
    goldGranted: res.goldGranted,
  };
}

export async function exchangeAptGemsForGold(gems: number) {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "Î°úÍ∑∏?∏Ïù¥ ?ÑÏöî?©Îãà??" as const };

  const res = await exchangeGemsForGold(user.id, gems);
  if ("error" in res) return res;

  await mirrorEconomyToGameState(user.id);
  revalidateAptHub();
  return res;
}

export async function getAptExchangeConfig(): Promise<AptEconomyConfigDto> {
  return getEconomyConfig();
}
