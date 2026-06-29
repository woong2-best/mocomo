import { db } from "@/lib/db";
import { resolveAptHomeOwnerId } from "@/actions/apt-cohabitation";
import { bondeeKindToStickerId } from "@/lib/apt/isometric/catalog-map";
import { getStickerGoldPrice } from "@/lib/apt/game/shop";
import { STICKER_CATALOG } from "@/lib/diorama/sticker-catalog";
import {
  addInventoryAndStorageInTx,
} from "./service";
import { mutateWalletInTx } from "./wallet-service";
import { atomicConsumeStorageInTx, atomicReturnStorageInTx } from "./storage-atomic";
import { writeEconomyLog } from "./economy-log-service";
import { newCorrelationId } from "./audit/correlation-id";
import { assertMarketEnabled } from "./economy-emergency";
import { assertMarketAdminAllows } from "./market-admin-guards";
import { assertFraudAllowed } from "./fraud/fraud-restrictions";
import { assertNoWashTradeAtPurchase } from "./fraud/fraud-detectors";
import { recalculateUserFraudRisk } from "./fraud/fraud-engine";
import type { BondeeFurnitureKind } from "@/lib/apt/bondee/types";
import type { InventoryItemSource } from "./types";

export type MarketListingDto = {
  id: string;
  sellerId: string;
  sellerName: string | null;
  stickerTypeId: string;
  label: string;
  src: string;
  priceGold: number;
  source: string;
  fleaEventId: string | null;
  createdAt: string;
  avgPrice?: number | null;
  priceChangePercent?: number | null;
};

function listingStickerId(row: {
  stickerTypeId: string | null;
  itemKind: string;
}): string {
  if (row.stickerTypeId) return row.stickerTypeId;
  return bondeeKindToStickerId(row.itemKind as BondeeFurnitureKind);
}

function toDto(row: {
  id: string;
  sellerId: string;
  stickerTypeId: string | null;
  itemKind: string;
  priceGold: number;
  source: string;
  fleaEventId: string | null;
  createdAt: Date;
  seller: { name: string | null; username: string };
}): MarketListingDto {
  const stickerTypeId = listingStickerId(row);
  const asset = STICKER_CATALOG[stickerTypeId];
  return {
    id: row.id,
    sellerId: row.sellerId,
    sellerName: row.seller.name ?? row.seller.username,
    stickerTypeId,
    label: asset?.label ?? stickerTypeId,
    src: asset?.src ?? "",
    priceGold: row.priceGold,
    source: row.source,
    fleaEventId: row.fleaEventId,
    createdAt: row.createdAt.toISOString(),
  };
}

async function attachPriceStats(items: MarketListingDto[]): Promise<MarketListingDto[]> {
  const { getMarketPriceStats } = await import("./market-price-service");
  const out: MarketListingDto[] = [];
  for (const item of items) {
    const stats = await getMarketPriceStats(item.stickerTypeId);
    out.push({
      ...item,
      avgPrice: stats?.avgPrice ?? null,
      priceChangePercent: stats?.changePercent ?? null,
    });
  }
  return out;
}

export async function listMarketFeed(options?: {
  fleaEventId?: string | null;
  query?: string;
  limit?: number;
}): Promise<MarketListingDto[]> {
  const limit = options?.limit ?? 40;
  const rows = await db.aptMarketListing.findMany({
    where: {
      status: "SELLING",
      priceGold: { gt: 0 },
      hiddenByAdmin: false,
      ...(options?.fleaEventId != null
        ? { fleaEventId: options.fleaEventId }
        : { fleaEventId: null }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      seller: { select: { name: true, username: true } },
    },
  });

  let items = rows.map(toDto);
  if (options?.query?.trim()) {
    const q = options.query.trim().toLowerCase();
    items = items.filter(
      (i) => i.label.toLowerCase().includes(q) || i.stickerTypeId.includes(q)
    );
  }
  return attachPriceStats(items);
}

export async function listMyMarketListings(userId: string): Promise<MarketListingDto[]> {
  const rows = await db.aptMarketListing.findMany({
    where: { sellerId: userId, status: "SELLING" },
    orderBy: { createdAt: "desc" },
    include: { seller: { select: { name: true, username: true } } },
  });
  return rows.map(toDto);
}

export function suggestMarketPriceGold(stickerTypeId: string): number {
  const base = getStickerGoldPrice(stickerTypeId);
  return Math.max(50, Math.floor(base * 0.65));
}

export async function createMarketListingFromStorage(input: {
  sellerId: string;
  stickerTypeId: string;
  priceGold: number;
  fleaEventId?: string | null;
}): Promise<{ ok: true; listingId: string } | { error: string }> {
  if (input.priceGold < 1) return { error: "가격을 입력하세요." };

  const ownerId = await resolveAptHomeOwnerId(input.sellerId);
  try {
    if (input.fleaEventId) {
      const { assertFleaEnabled } = await import("./economy-emergency");
      await assertFleaEnabled();
      await assertMarketAdminAllows("create");
      await assertFraudAllowed(ownerId, "market");
    } else {
      await assertMarketEnabled();
      await assertMarketAdminAllows("create");
      await assertFraudAllowed(ownerId, "market");
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "거래할 수 없습니다." };
  }

  if (input.fleaEventId) {
    const flea = await db.aptFleaEvent.findUnique({ where: { id: input.fleaEventId } });
    const now = new Date();
    if (!flea?.active || !flea.published || flea.startsAt > now || flea.endsAt < now) {
      return { error: "벼룩시장이 진행 중이 아닙니다." };
    }
  }

  const asset = STICKER_CATALOG[input.stickerTypeId];

  try {
    const { resolveEconomyConfigForUser } = await import("./config-service");
    const config = await resolveEconomyConfigForUser(ownerId);
    const expiresAt = new Date(Date.now() + config.maxListingDays * 24 * 60 * 60 * 1000);

    const listingId = await db.$transaction(async (tx) => {
      const ok = await atomicConsumeStorageInTx(
        tx,
        ownerId,
        input.stickerTypeId,
        1
      );
      if (!ok) throw new Error("창고에 판매할 아이템이 없습니다.");

      const row = await tx.aptMarketListing.create({
        data: {
          sellerId: ownerId,
          itemId: `market-${crypto.randomUUID()}`,
          itemKind: asset?.category ?? "furniture",
          stickerTypeId: input.stickerTypeId,
          itemData: { typeId: input.stickerTypeId },
          source: input.fleaEventId ? "FLEA" : "PLAYER",
          status: "SELLING",
          priceGold: input.priceGold,
          fleaEventId: input.fleaEventId ?? null,
          expiresAt,
        },
      });

      await writeEconomyLog(tx, {
        userId: ownerId,
        action: "market_list",
        reason: `판매 등록 ${input.stickerTypeId} ${input.priceGold}G`,
        referenceId: row.id,
        referenceType: "AptMarketListing",
      });

      return row.id;
    });
    return { ok: true, listingId };
  } catch (e) {
    void import("./canary/canary-health").then((m) =>
      m.recordCanaryHealthEvent("CONFIG", { marketError: true, marketOp: true })
    );
    return { error: e instanceof Error ? e.message : "판매 등록에 실패했습니다." };
  }
}

export async function cancelMarketListing(
  userId: string,
  listingId: string
): Promise<{ ok: true } | { error: string }> {
  const ownerId = await resolveAptHomeOwnerId(userId);

  try {
    await db.$transaction(async (tx) => {
      const row = await tx.aptMarketListing.findUnique({ where: { id: listingId } });
      if (!row || row.sellerId !== ownerId) {
        throw new Error("판매글을 찾을 수 없습니다.");
      }

      const cancelled = await tx.aptMarketListing.updateMany({
        where: { id: listingId, sellerId: ownerId, status: "SELLING" },
        data: { status: "CANCELLED" },
      });
      if (cancelled.count !== 1) {
        throw new Error("이미 처리된 판매입니다.");
      }

      const stickerTypeId = listingStickerId(row);
      const returned = await atomicReturnStorageInTx(tx, ownerId, stickerTypeId, 1);
      if (!returned) throw new Error("창고 반환에 실패했습니다.");

      await writeEconomyLog(tx, {
        userId: ownerId,
        action: "market_cancel",
        reason: `판매 취소 ${stickerTypeId}`,
        referenceId: listingId,
        referenceType: "AptMarketListing",
      });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "취소에 실패했습니다." };
  }

  const row = await db.aptMarketListing.findUnique({
    where: { id: listingId },
    select: { stickerTypeId: true, itemKind: true },
  });
  if (row) {
    const sticker = listingStickerId(row);
    const asset = STICKER_CATALOG[sticker];
    const { notifyMarketCancelled } = await import("./notification/economy-notify");
    notifyMarketCancelled({
      sellerId: ownerId,
      itemLabel: asset?.label ?? sticker,
      listingId,
    });
  }

  return { ok: true };
}

export async function buyMarketListing(
  buyerId: string,
  listingId: string
): Promise<{ ok: true; stickerTypeId: string } | { error: string }> {
  const ownerId = await resolveAptHomeOwnerId(buyerId);

  try {
    await assertMarketEnabled();
    await assertMarketAdminAllows("purchase");
    await assertFraudAllowed(ownerId, "market");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "구매할 수 없습니다." };
  }

  try {
    const corrId = newCorrelationId();
    const stickerTypeId = await db.$transaction(async (tx) => {
      const row = await tx.aptMarketListing.findUnique({
        where: { id: listingId },
        include: { fleaEvent: true },
      });
      if (!row) throw new Error("판매 중인 상품이 아닙니다.");
      if (row.hiddenByAdmin) throw new Error("판매 중인 상품이 아닙니다.");
      if (row.sellerId === ownerId) throw new Error("본인 상품은 구매할 수 없습니다.");
      if (row.priceGold < 1) throw new Error("가격이 설정되지 않았습니다.");
      await assertNoWashTradeAtPurchase(tx, ownerId, row.sellerId);

      if (row.fleaEvent) {
        const now = new Date();
        if (
          !row.fleaEvent.active ||
          !row.fleaEvent.published ||
          row.fleaEvent.endsAt < now ||
          row.fleaEvent.startsAt > now
        ) {
          throw new Error("벼룩시장이 종료되었습니다.");
        }
      }

      const sold = await tx.aptMarketListing.updateMany({
        where: { id: listingId, status: "SELLING" },
        data: { status: "SOLD", buyerId: ownerId, soldAt: new Date() },
      });
      if (sold.count !== 1) {
        throw new Error("다른 구매자가 먼저 구매했거나 판매가 취소되었습니다.");
      }

      const typeId = listingStickerId(row);
      const feeRate = row.fleaEvent?.feeRate ?? 0;
      const fee = Math.floor(row.priceGold * feeRate);
      const sellerProceeds = row.priceGold - fee;
      const txType = row.fleaEventId ? "flea" : "market";
      const source: InventoryItemSource = row.fleaEventId ? "flea" : "market";

      await mutateWalletInTx(tx, {
        userId: ownerId,
        currency: "gold",
        amount: -row.priceGold,
        type: txType,
        referenceId: `${listingId}:buy`,
        referenceType: "AptMarketListing",
        correlationId: corrId,
        memo: `장터 구매: ${typeId}`,
      });

      await mutateWalletInTx(tx, {
        userId: row.sellerId,
        currency: "gold",
        amount: sellerProceeds,
        type: txType,
        referenceId: `${listingId}:sell`,
        referenceType: "AptMarketListing",
        correlationId: corrId,
        memo: `장터 판매: ${typeId}`,
        idempotent: true,
      });

      await addInventoryAndStorageInTx(tx, ownerId, typeId, 1, source);

      await tx.aptMarketPriceHistory.create({
        data: {
          stickerTypeId: typeId,
          soldPrice: row.priceGold,
          listingId,
        },
      });

      await writeEconomyLog(tx, {
        userId: ownerId,
        action: "market_buy",
        deltaGold: -row.priceGold,
        reason: `구매 ${typeId}`,
        referenceId: listingId,
        referenceType: "AptMarketListing",
        correlationId: corrId,
      });

      return typeId;
    });

    const sold = await db.aptMarketListing.findUnique({
      where: { id: listingId },
      select: { sellerId: true, priceGold: true, buyerId: true },
    });
    if (sold?.buyerId) {
      const asset = STICKER_CATALOG[stickerTypeId];
      const label = asset?.label ?? stickerTypeId;
      const buyer = await db.user.findUnique({
        where: { id: sold.buyerId },
        select: { username: true, name: true },
      });
      const { notifyMarketSold, notifyMarketPurchase } = await import(
        "./notification/economy-notify"
      );
      notifyMarketSold({
        sellerId: sold.sellerId,
        itemLabel: label,
        priceGold: sold.priceGold,
        listingId,
        buyerName: buyer?.name ?? buyer?.username ?? null,
      });
      notifyMarketPurchase({
        buyerId: sold.buyerId,
        itemLabel: label,
        priceGold: sold.priceGold,
        listingId,
      });
    }

    void import("./canary/canary-health").then((m) =>
      m.recordCanaryHealthEvent("CONFIG", { marketOp: true })
    );
    void recalculateUserFraudRisk(ownerId);
    if (sold?.sellerId) void recalculateUserFraudRisk(sold.sellerId);

    return { ok: true, stickerTypeId };
  } catch (e) {
    void import("./health/health-metrics").then((m) =>
      m.recordHealthDomainEvent("market", "marketError", 1)
    );
    void import("./canary/canary-health").then((m) =>
      m.recordCanaryHealthEvent("CONFIG", { marketError: true, marketOp: true })
    );
    return { error: e instanceof Error ? e.message : "구매에 실패했습니다." };
  }
}
