import { db } from "@/lib/db";
import { getActiveFleaEvent } from "./flea-service";
import { assertFleaEnabled } from "./economy-emergency";
import { addInventoryAndStorageInTx } from "./service";
import { mutateWalletInTx } from "./wallet-service";
import { atomicConsumeStorageInTx } from "./storage-atomic";
import { writeEconomyLog } from "./economy-log-service";

export type FleaNpcOfferPublicDto = {
  id: string;
  kind: "sell" | "buy";
  stickerTypeId: string;
  label: string;
  src: string;
  goldPrice: number;
  discountPercent: number | null;
  soldOut: boolean;
};

export async function listActiveFleaNpcOffers(
  eventId: string
): Promise<FleaNpcOfferPublicDto[]> {
  const { STICKER_CATALOG } = await import("@/lib/diorama/sticker-catalog");
  const rows = await db.aptFleaNpcOffer.findMany({
    where: { eventId, enabled: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return rows.map((row) => {
    const asset = STICKER_CATALOG[row.stickerTypeId];
    const soldOut =
      row.kind === "sell" &&
      row.stock != null &&
      row.soldCount >= row.stock;
    return {
      id: row.id,
      kind: row.kind as "sell" | "buy",
      stickerTypeId: row.stickerTypeId,
      label: asset?.label ?? row.stickerTypeId,
      src: asset?.src ?? "",
      goldPrice: row.goldPrice,
      discountPercent: row.discountPercent,
      soldOut,
    };
  });
}

/** NPC에게서 구매 (NPC 판매) */
export async function buyFromFleaNpc(
  userId: string,
  offerId: string
): Promise<{ ok: true } | { error: string }> {
  const flea = await getActiveFleaEvent();
  if (!flea) return { error: "진행 중인 벼룩시장이 없습니다." };

  try {
    await assertFleaEnabled();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "벼룩시장을 이용할 수 없습니다." };
  }

  try {
    await db.$transaction(async (tx) => {
      const offer = await tx.aptFleaNpcOffer.findUnique({ where: { id: offerId } });
      if (!offer || offer.eventId !== flea.id || !offer.enabled || offer.kind !== "sell") {
        throw new Error("NPC 상품을 찾을 수 없습니다.");
      }
      if (offer.stock != null && offer.soldCount >= offer.stock) {
        throw new Error("품절되었습니다.");
      }

      const stock = await tx.aptFleaNpcOffer.updateMany({
        where: {
          id: offerId,
          ...(offer.stock != null ? { soldCount: { lt: offer.stock } } : {}),
        },
        data: { soldCount: { increment: 1 } },
      });
      if (stock.count !== 1) throw new Error("품절되었습니다.");

      const updated = await tx.aptFleaNpcOffer.findUniqueOrThrow({ where: { id: offerId } });

      await mutateWalletInTx(tx, {
        userId,
        currency: "gold",
        amount: -offer.goldPrice,
        type: "flea",
        referenceId: `npc-sell:${offerId}:${updated.soldCount}`,
        referenceType: "AptFleaNpcOffer",
        memo: `벼룩 NPC 구매: ${offer.stickerTypeId}`,
      });

      await addInventoryAndStorageInTx(tx, userId, offer.stickerTypeId, 1, "flea");

      await writeEconomyLog(tx, {
        userId,
        action: "flea_npc_buy",
        deltaGold: -offer.goldPrice,
        reason: offer.stickerTypeId,
        referenceId: offerId,
        referenceType: "AptFleaNpcOffer",
      });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "구매에 실패했습니다." };
  }
  return { ok: true };
}

/** NPC에게 판매 (NPC 매입) */
export async function sellToFleaNpc(
  userId: string,
  offerId: string
): Promise<{ ok: true } | { error: string }> {
  const flea = await getActiveFleaEvent();
  if (!flea) return { error: "진행 중인 벼룩시장이 없습니다." };

  try {
    await assertFleaEnabled();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "벼룩시장을 이용할 수 없습니다." };
  }

  try {
    await db.$transaction(async (tx) => {
      const offer = await tx.aptFleaNpcOffer.findUnique({ where: { id: offerId } });
      if (!offer || offer.eventId !== flea.id || !offer.enabled || offer.kind !== "buy") {
        throw new Error("NPC 매입 항목을 찾을 수 없습니다.");
      }

      const ok = await atomicConsumeStorageInTx(tx, userId, offer.stickerTypeId, 1);
      if (!ok) throw new Error("창고에 판매할 아이템이 없습니다.");

      await tx.aptFleaNpcOffer.update({
        where: { id: offerId },
        data: { boughtCount: { increment: 1 } },
      });

      await mutateWalletInTx(tx, {
        userId,
        currency: "gold",
        amount: offer.goldPrice,
        type: "flea",
        referenceId: `npc-buy:${offerId}:${Date.now()}`,
        referenceType: "AptFleaNpcOffer",
        memo: `벼룩 NPC 매입: ${offer.stickerTypeId}`,
        idempotent: false,
      });

      await writeEconomyLog(tx, {
        userId,
        action: "flea_npc_sell",
        deltaGold: offer.goldPrice,
        reason: offer.stickerTypeId,
        referenceId: offerId,
        referenceType: "AptFleaNpcOffer",
      });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "매입에 실패했습니다." };
  }
  return { ok: true };
}
