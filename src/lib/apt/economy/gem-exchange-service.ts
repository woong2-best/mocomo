import { db } from "@/lib/db";
import { resolveAptHomeOwnerId } from "@/actions/apt-cohabitation";
import { countGemsExchangedToday } from "./config-service";
import { mutateWalletInTx } from "./wallet-service";
import { loadEconomySnapshot } from "./service";
import type { EconomySnapshot } from "./types";

export type GemExchangeResult =
  | { ok: true; economy: EconomySnapshot; goldReceived: number; gemsSpent: number }
  | { error: string };

import { calcGoldFromGems } from "./economy-config-types";

export { calcGoldFromGems };

export async function exchangeGemsForGold(
  userId: string,
  gems: number
): Promise<GemExchangeResult> {
  if (!Number.isInteger(gems) || gems <= 0) {
    return { error: "환전할 젬 수량이 올바르지 않습니다." };
  }

  const ownerId = await resolveAptHomeOwnerId(userId);
  const config = await import("./config-service").then((m) =>
    m.resolveEconomyConfigForUser(ownerId)
  );
  const exchangedToday = await countGemsExchangedToday(ownerId);
  if (exchangedToday + gems > config.dailyGemExchangeLimit) {
    return {
      error: `일일 젬 환전 한도(${config.dailyGemExchangeLimit.toLocaleString()}💎)를 초과했습니다.`,
    };
  }

  const goldReceived = calcGoldFromGems(gems, config);
  const refId = `gem-exchange-${Date.now()}`;

  try {
    await db.$transaction(async (tx) => {
      await mutateWalletInTx(tx, {
        userId: ownerId,
        currency: "gems",
        amount: -gems,
        type: "exchange",
        referenceId: refId,
        referenceType: "GemExchange",
        memo: `젬 ${gems} → 골드 ${goldReceived}`,
      });
      await mutateWalletInTx(tx, {
        userId: ownerId,
        currency: "gold",
        amount: goldReceived,
        type: "exchange",
        referenceId: refId,
        referenceType: "GemExchange",
        memo: `젬 ${gems} → 골드 ${goldReceived}`,
      });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "환전에 실패했습니다.";
    return { error: msg };
  }

  const economy = await loadEconomySnapshot(userId);
  return { ok: true, economy, goldReceived, gemsSpent: gems };
}
