import { db } from "@/lib/db";
import { getStickerGoldPrice } from "@/lib/apt/game/shop";
import { autoSnapshotBeforeAction } from "./backup/snapshot-service";
import { STICKER_CATALOG } from "@/lib/diorama/sticker-catalog";
import type { StickerCategory } from "@/lib/diorama/sticker-types";

export type GoldShopOfferStatus =
  | "selling"
  | "scheduled"
  | "ended"
  | "sold_out"
  | "hidden";

export type GoldShopOfferStats = {
  totalSold: number;
  sold7d: number;
  sold30d: number;
  revenue: number;
  revenue7d: number;
  revenue30d: number;
  buyerCount: number;
  avgPrice: number;
};

export type GoldShopChangeLogDto = {
  id: string;
  field: string;
  before: string;
  after: string;
  adminName: string;
  createdAt: string;
};

export type AdminGoldShopOfferDto = {
  id: string;
  itemId: string;
  label: string;
  src: string;
  category: string;
  goldPrice: number;
  originalGoldPrice: number | null;
  discountPercent: number | null;
  featured: boolean;
  isNew: boolean;
  enabled: boolean;
  isLimited: boolean;
  limitedStock: number | null;
  soldCount: number;
  remainingStock: number | null;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
  status: GoldShopOfferStatus;
};

export type AdminGoldShopDetailDto = AdminGoldShopOfferDto & {
  stats: GoldShopOfferStats;
  changeLogs: GoldShopChangeLogDto[];
};

export type CatalogItemOption = {
  itemId: string;
  label: string;
  src: string;
  category: StickerCategory;
  basePrice: number;
};

const FIELD_LABELS: Record<string, string> = {
  goldPrice: "가격",
  originalGoldPrice: "정가",
  featured: "추천",
  isNew: "신상품",
  enabled: "노출",
  limitedStock: "재고",
  startsAt: "시작일",
  endsAt: "종료일",
  sortOrder: "정렬",
};

export function listShopEligibleItems(): CatalogItemOption[] {
  return Object.values(STICKER_CATALOG)
    .filter((a) => !["room", "character"].includes(a.category))
    .map((a) => ({
      itemId: a.id,
      label: a.label,
      src: a.src,
      category: a.category,
      basePrice: getStickerGoldPrice(a.id),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));
}

function discountPercent(gold: number, original: number | null): number | null {
  if (!original || original <= gold) return null;
  return Math.round((1 - gold / original) * 100);
}

export function resolveOfferStatus(row: {
  enabled: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  limitedStock: number | null;
  soldCount: number;
}): GoldShopOfferStatus {
  const now = Date.now();
  if (!row.enabled) return "hidden";
  if (row.startsAt && row.startsAt.getTime() > now) return "scheduled";
  if (row.endsAt && row.endsAt.getTime() < now) return "ended";
  if (row.limitedStock != null && row.soldCount >= row.limitedStock) return "sold_out";
  return "selling";
}

function toAdminDto(row: {
  id: string;
  itemId: string;
  goldPrice: number;
  originalGoldPrice: number | null;
  featured: boolean;
  isNew: boolean;
  enabled: boolean;
  limitedStock: number | null;
  soldCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  sortOrder: number;
}): AdminGoldShopOfferDto {
  const asset = STICKER_CATALOG[row.itemId];
  const remaining =
    row.limitedStock != null ? Math.max(0, row.limitedStock - row.soldCount) : null;
  return {
    id: row.id,
    itemId: row.itemId,
    label: asset?.label ?? row.itemId,
    src: asset?.src ?? "",
    category: asset?.category ?? "furniture",
    goldPrice: row.goldPrice,
    originalGoldPrice: row.originalGoldPrice,
    discountPercent: discountPercent(row.goldPrice, row.originalGoldPrice),
    featured: row.featured,
    isNew: row.isNew,
    enabled: row.enabled,
    isLimited: row.limitedStock != null,
    limitedStock: row.limitedStock,
    soldCount: row.soldCount,
    remainingStock: remaining,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    sortOrder: row.sortOrder,
    status: resolveOfferStatus(row),
  };
}

async function writeChangeLog(
  offerId: string,
  itemId: string,
  adminId: string,
  field: string,
  before: unknown,
  after: unknown
): Promise<void> {
  const b = before == null ? "" : String(before);
  const a = after == null ? "" : String(after);
  if (b === a) return;
  await db.aptGoldShopOfferChangeLog.create({
    data: {
      offerId,
      itemId,
      adminId,
      field: FIELD_LABELS[field] ?? field,
      before: b,
      after: a,
    },
  });
}

async function loadOfferStats(itemId: string, soldCount: number): Promise<GoldShopOfferStats> {
  const now = Date.now();
  const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const txs = await db.aptWalletTransaction.findMany({
    where: {
      type: "shop",
      referenceId: itemId,
      currency: "gold",
      amount: { lt: 0 },
    },
    select: { amount: true, userId: true, createdAt: true },
  });

  const spent = (t: { amount: number }) => -t.amount;
  const totalRevenue = txs.reduce((s, t) => s + spent(t), 0);
  const txs7 = txs.filter((t) => t.createdAt >= d7);
  const txs30 = txs.filter((t) => t.createdAt >= d30);
  const buyers = new Set(txs.map((t) => t.userId));

  return {
    totalSold: soldCount,
    sold7d: txs7.length,
    sold30d: txs30.length,
    revenue: totalRevenue,
    revenue7d: txs7.reduce((s, t) => s + spent(t), 0),
    revenue30d: txs30.reduce((s, t) => s + spent(t), 0),
    buyerCount: buyers.size,
    avgPrice: txs.length > 0 ? Math.round(totalRevenue / txs.length) : 0,
  };
}

export async function listAdminGoldShopOffers(): Promise<AdminGoldShopOfferDto[]> {
  const rows = await db.aptGoldShopOffer.findMany({
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(toAdminDto);
}

export async function getAdminGoldShopDetail(
  offerId: string
): Promise<AdminGoldShopDetailDto | null> {
  const row = await db.aptGoldShopOffer.findUnique({ where: { id: offerId } });
  if (!row) return null;

  const [stats, logs] = await Promise.all([
    loadOfferStats(row.itemId, row.soldCount),
    db.aptGoldShopOfferChangeLog.findMany({
      where: { offerId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { admin: { select: { name: true, username: true } } },
    }),
  ]);

  return {
    ...toAdminDto(row),
    stats,
    changeLogs: logs.map((l) => ({
      id: l.id,
      field: l.field,
      before: l.before,
      after: l.after,
      adminName: l.admin.name ?? l.admin.username,
      createdAt: l.createdAt.toISOString(),
    })),
  };
}

export async function toggleGoldShopField(
  offerId: string,
  adminId: string,
  field: "featured" | "isNew" | "enabled" | "isLimited",
  value: boolean
): Promise<AdminGoldShopOfferDto | null> {
  const row = await db.aptGoldShopOffer.findUnique({ where: { id: offerId } });
  if (!row) return null;

  const data: Record<string, unknown> = {};

  if (field === "isLimited") {
    const before = row.limitedStock;
    data.limitedStock = value ? (before ?? 50) : null;
    await writeChangeLog(offerId, row.itemId, adminId, "limitedStock", before, data.limitedStock);
  } else {
    data[field] = value;
    await writeChangeLog(offerId, row.itemId, adminId, field, row[field], value);
  }

  const updated = await db.aptGoldShopOffer.update({
    where: { id: offerId },
    data,
  });
  return toAdminDto(updated);
}

export async function updateGoldShopOffer(
  offerId: string,
  adminId: string,
  patch: {
    goldPrice?: number;
    originalGoldPrice?: number | null;
    limitedStock?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
    featured?: boolean;
    isNew?: boolean;
    enabled?: boolean;
  }
): Promise<AdminGoldShopOfferDto | null> {
  const row = await db.aptGoldShopOffer.findUnique({ where: { id: offerId } });
  if (!row) return null;

  await autoSnapshotBeforeAction("gold_shop_publish", adminId);

  const data: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(patch) as [keyof typeof patch, (typeof patch)[keyof typeof patch]][]) {
    if (val === undefined) continue;
    if (key === "startsAt" || key === "endsAt") {
      const before = row[key];
      const parsed = typeof val === "string" && val ? new Date(val) : null;
      data[key] = parsed;
      await writeChangeLog(
        offerId,
        row.itemId,
        adminId,
        key,
        before?.toISOString().slice(0, 10) ?? "",
        parsed?.toISOString().slice(0, 10) ?? ""
      );
    } else {
      const before = row[key as keyof typeof row];
      data[key] = val;
      await writeChangeLog(offerId, row.itemId, adminId, key, before, val);
    }
  }

  const updated = await db.aptGoldShopOffer.update({ where: { id: offerId }, data });
  return toAdminDto(updated);
}

export async function createGoldShopOffer(
  adminId: string,
  input: {
    itemId: string;
    goldPrice: number;
    originalGoldPrice?: number | null;
    limitedStock?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
    featured?: boolean;
    isNew?: boolean;
    enabled?: boolean;
  }
): Promise<{ ok: true; offer: AdminGoldShopOfferDto } | { error: string }> {
  if (!STICKER_CATALOG[input.itemId]) {
    return { error: "카탈로그에 없는 아이템입니다." };
  }
  const existing = await db.aptGoldShopOffer.findUnique({
    where: { itemId: input.itemId },
  });
  if (existing) return { error: "이미 등록된 상품입니다." };

  await autoSnapshotBeforeAction("gold_shop_publish", adminId);

  const maxSort = await db.aptGoldShopOffer.aggregate({ _max: { sortOrder: true } });
  const base = getStickerGoldPrice(input.itemId);
  const original =
    input.originalGoldPrice ?? (base > input.goldPrice ? base : null);

  const row = await db.aptGoldShopOffer.create({
    data: {
      itemId: input.itemId,
      goldPrice: input.goldPrice,
      originalGoldPrice: original,
      limitedStock: input.limitedStock ?? null,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      featured: input.featured ?? false,
      isNew: input.isNew ?? false,
      enabled: input.enabled ?? true,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  await writeChangeLog(row.id, row.itemId, adminId, "created", "", input.itemId);
  return { ok: true, offer: toAdminDto(row) };
}

export async function deleteGoldShopOffers(
  offerIds: string[],
  adminId: string
): Promise<number> {
  const rows = await db.aptGoldShopOffer.findMany({
    where: { id: { in: offerIds } },
    select: { id: true, itemId: true },
  });
  for (const row of rows) {
    await writeChangeLog(row.id, row.itemId, adminId, "deleted", row.itemId, "");
  }
  const res = await db.aptGoldShopOffer.deleteMany({ where: { id: { in: offerIds } } });
  return res.count;
}

export type BulkGoldShopAction =
  | { type: "show" }
  | { type: "hide" }
  | { type: "feature" }
  | { type: "unfeature" }
  | { type: "set_dates"; startsAt: string | null; endsAt: string | null }
  | { type: "price_percent"; percent: number }
  | { type: "delete" };

export async function bulkGoldShopAction(
  offerIds: string[],
  adminId: string,
  action: BulkGoldShopAction
): Promise<number> {
  if (action.type === "delete") {
    return deleteGoldShopOffers(offerIds, adminId);
  }

  const rows = await db.aptGoldShopOffer.findMany({ where: { id: { in: offerIds } } });
  let count = 0;

  for (const row of rows) {
    const patch: Record<string, unknown> = {};
    switch (action.type) {
      case "show":
        patch.enabled = true;
        break;
      case "hide":
        patch.enabled = false;
        break;
      case "feature":
        patch.featured = true;
        break;
      case "unfeature":
        patch.featured = false;
        break;
      case "set_dates":
        patch.startsAt = action.startsAt ? new Date(action.startsAt) : null;
        patch.endsAt = action.endsAt ? new Date(action.endsAt) : null;
        break;
      case "price_percent": {
        const next = Math.max(1, Math.round(row.goldPrice * (1 + action.percent / 100)));
        patch.goldPrice = next;
        break;
      }
    }

    for (const [key, val] of Object.entries(patch)) {
      const before = row[key as keyof typeof row];
      await writeChangeLog(row.id, row.itemId, adminId, key, before, val);
    }
    await db.aptGoldShopOffer.update({ where: { id: row.id }, data: patch });
    count += 1;
  }
  return count;
}

export function formatOfferPeriod(
  startsAt: string | null,
  endsAt: string | null
): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  if (startsAt && endsAt) return `${fmt(startsAt)} ~ ${fmt(endsAt)}`;
  if (endsAt) return `~ ${fmt(endsAt)}`;
  if (startsAt) return `${fmt(startsAt)} ~`;
  return "상시";
}

const STATUS_LABEL: Record<GoldShopOfferStatus, string> = {
  selling: "판매중",
  scheduled: "예정",
  ended: "종료",
  sold_out: "품절",
  hidden: "숨김",
};

export function statusLabel(status: GoldShopOfferStatus): string {
  return STATUS_LABEL[status];
}
