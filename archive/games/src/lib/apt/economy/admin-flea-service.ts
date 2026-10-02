import { db } from "@/lib/db";
import { STICKER_CATALOG } from "@/lib/diorama/sticker-catalog";
import { getStickerGoldPrice } from "@/lib/apt/game/shop";
import { autoSnapshotBeforeAction } from "./backup/snapshot-service";
import {
  resolveFleaEventStatus,
  type FleaEventStatus,
} from "./flea-service";
import { listShopEligibleItems } from "./admin-gold-shop-service";

export type FleaNpcKind = "sell" | "buy";

export type FleaChangeLogDto = {
  id: string;
  field: string;
  before: string;
  after: string;
  adminName: string;
  createdAt: string;
};

export type FleaNpcOfferDto = {
  id: string;
  kind: FleaNpcKind;
  stickerTypeId: string;
  label: string;
  src: string;
  goldPrice: number;
  discountPercent: number | null;
  stock: number | null;
  remaining: number | null;
  soldCount: number;
  boughtCount: number;
  enabled: boolean;
};

export type FleaTopProduct = {
  stickerTypeId: string;
  label: string;
  src: string;
  salesCount: number;
  volume: number;
};

export type FleaEventStats = {
  visitCount: number;
  listingCount: number;
  activeListings: number;
  salesCount: number;
  volume: number;
  avgPrice: number;
  avgDiscountPercent: number | null;
  participantCount: number;
  topProducts: FleaTopProduct[];
};

export type AdminFleaEventDto = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  notice: string | null;
  bannerUrl: string | null;
  startsAt: string;
  endsAt: string;
  feeRate: number;
  feePercent: number;
  active: boolean;
  published: boolean;
  status: FleaEventStatus;
  listingCount: number;
  salesCount: number;
  volume: number;
};

export type AdminFleaEventDetailDto = AdminFleaEventDto & {
  stats: FleaEventStats;
  npcOffers: FleaNpcOfferDto[];
  changeLogs: FleaChangeLogDto[];
};

const FIELD_LABELS: Record<string, string> = {
  title: "이벤트명",
  description: "설명",
  notice: "공지",
  bannerUrl: "배너",
  startsAt: "시작일",
  endsAt: "종료일",
  feeRate: "수수료",
  active: "ON/OFF",
  published: "공개",
  created: "생성",
  forceStart: "강제 시작",
  forceEnd: "강제 종료",
  deleted: "삭제",
  npc_add: "NPC 추가",
  npc_enabled: "NPC ON/OFF",
  npc_delete: "NPC 삭제",
};

async function writeFleaChangeLog(
  eventId: string,
  adminId: string,
  field: string,
  before: unknown,
  after: unknown
): Promise<void> {
  const b = before == null ? "" : String(before);
  const a = after == null ? "" : String(after);
  if (b === a) return;
  await db.aptFleaEventChangeLog.create({
    data: {
      eventId,
      adminId,
      field: FIELD_LABELS[field] ?? field,
      before: b,
      after: a,
    },
  });
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "flea"}-${Date.now().toString(36)}`;
}

function toNpcDto(row: {
  id: string;
  kind: string;
  stickerTypeId: string;
  goldPrice: number;
  discountPercent: number | null;
  stock: number | null;
  soldCount: number;
  boughtCount: number;
  enabled: boolean;
}): FleaNpcOfferDto {
  const asset = STICKER_CATALOG[row.stickerTypeId];
  const remaining =
    row.stock != null ? Math.max(0, row.stock - row.soldCount) : null;
  return {
    id: row.id,
    kind: row.kind as FleaNpcKind,
    stickerTypeId: row.stickerTypeId,
    label: asset?.label ?? row.stickerTypeId,
    src: asset?.src ?? "",
    goldPrice: row.goldPrice,
    discountPercent: row.discountPercent,
    stock: row.stock,
    remaining,
    soldCount: row.soldCount,
    boughtCount: row.boughtCount,
    enabled: row.enabled,
  };
}

async function loadEventListStats(eventId: string) {
  const [listingCount, sales] = await Promise.all([
    db.aptMarketListing.count({ where: { fleaEventId: eventId } }),
    db.aptMarketListing.findMany({
      where: { fleaEventId: eventId, status: "SOLD" },
      select: { priceGold: true },
    }),
  ]);
  return {
    listingCount,
    salesCount: sales.length,
    volume: sales.reduce((a, s) => a + s.priceGold, 0),
  };
}

async function loadEventStats(eventId: string): Promise<FleaEventStats> {
  const event = await db.aptFleaEvent.findUnique({ where: { id: eventId } });
  const [listings, sold, npcOffers] = await Promise.all([
    db.aptMarketListing.findMany({
      where: { fleaEventId: eventId },
      select: { status: true, sellerId: true, buyerId: true, priceGold: true, stickerTypeId: true, itemKind: true, itemData: true },
    }),
    db.aptMarketListing.findMany({
      where: { fleaEventId: eventId, status: "SOLD" },
      select: { priceGold: true, stickerTypeId: true, itemKind: true, itemData: true, sellerId: true, buyerId: true },
    }),
    db.aptFleaNpcOffer.findMany({ where: { eventId, kind: "sell", enabled: true } }),
  ]);

  const participants = new Set<string>();
  for (const l of listings) {
    participants.add(l.sellerId);
    if (l.buyerId) participants.add(l.buyerId);
  }

  const volume = sold.reduce((a, s) => a + s.priceGold, 0);
  const avgPrice = sold.length > 0 ? Math.round(volume / sold.length) : 0;

  const discounts: number[] = [];
  for (const npc of npcOffers) {
    if (npc.discountPercent != null) discounts.push(npc.discountPercent);
  }
  const avgDiscountPercent =
    discounts.length > 0
      ? Math.round(discounts.reduce((a, b) => a + b, 0) / discounts.length)
      : null;

  const topMap = new Map<string, { count: number; volume: number }>();
  for (const s of sold) {
    const typeId =
      s.stickerTypeId ??
      (typeof s.itemData === "object" && s.itemData && "typeId" in s.itemData
        ? String((s.itemData as { typeId: string }).typeId)
        : s.itemKind);
    const cur = topMap.get(typeId) ?? { count: 0, volume: 0 };
    cur.count += 1;
    cur.volume += s.priceGold;
    topMap.set(typeId, cur);
  }

  const topProducts: FleaTopProduct[] = [...topMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([stickerTypeId, v]) => {
      const asset = STICKER_CATALOG[stickerTypeId];
      return {
        stickerTypeId,
        label: asset?.label ?? stickerTypeId,
        src: asset?.src ?? "",
        salesCount: v.count,
        volume: v.volume,
      };
    });

  return {
    visitCount: event?.visitCount ?? 0,
    listingCount: listings.length,
    activeListings: listings.filter((l) => l.status === "SELLING").length,
    salesCount: sold.length,
    volume,
    avgPrice,
    avgDiscountPercent,
    participantCount: participants.size,
    topProducts,
  };
}

function toListDto(
  row: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    notice: string | null;
    bannerUrl: string | null;
    startsAt: Date;
    endsAt: Date;
    feeRate: number;
    active: boolean;
    published: boolean;
  },
  stats: { listingCount: number; salesCount: number; volume: number }
): AdminFleaEventDto {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    notice: row.notice,
    bannerUrl: row.bannerUrl,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    feeRate: row.feeRate,
    feePercent: Math.round(row.feeRate * 1000) / 10,
    active: row.active,
    published: row.published,
    status: resolveFleaEventStatus(row),
    listingCount: stats.listingCount,
    salesCount: stats.salesCount,
    volume: stats.volume,
  };
}

export async function listAdminFleaEvents(): Promise<AdminFleaEventDto[]> {
  const rows = await db.aptFleaEvent.findMany({
    orderBy: { startsAt: "desc" },
  });
  const out: AdminFleaEventDto[] = [];
  for (const row of rows) {
    const stats = await loadEventListStats(row.id);
    out.push(toListDto(row, stats));
  }
  return out;
}

export async function getAdminFleaEventDetail(
  eventId: string
): Promise<AdminFleaEventDetailDto | null> {
  const row = await db.aptFleaEvent.findUnique({ where: { id: eventId } });
  if (!row) return null;

  const [stats, npcRows, logs, listStats] = await Promise.all([
    loadEventStats(eventId),
    db.aptFleaNpcOffer.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    db.aptFleaEventChangeLog.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { admin: { select: { name: true, username: true } } },
    }),
    loadEventListStats(eventId),
  ]);

  return {
    ...toListDto(row, listStats),
    stats,
    npcOffers: npcRows.map(toNpcDto),
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

export async function createFleaEvent(
  adminId: string,
  input: {
    title: string;
    startsAt: string;
    endsAt: string;
    feePercent: number;
    bannerUrl?: string | null;
    description?: string | null;
    published?: boolean;
  }
): Promise<{ ok: true; event: AdminFleaEventDto } | { error: string }> {
  if (!input.title.trim()) return { error: "이벤트명을 입력하세요." };
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (endsAt <= startsAt) return { error: "종료일은 시작일 이후여야 합니다." };

  const row = await db.aptFleaEvent.create({
    data: {
      slug: slugify(input.title),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      bannerUrl: input.bannerUrl?.trim() || null,
      startsAt,
      endsAt,
      feeRate: input.feePercent / 100,
      active: true,
      published: input.published ?? false,
    },
  });

  await writeFleaChangeLog(row.id, adminId, "created", "", row.title);
  const stats = await loadEventListStats(row.id);
  return { ok: true, event: toListDto(row, stats) };
}

export async function updateFleaEventField(
  eventId: string,
  adminId: string,
  field: keyof {
    title: string;
    description: string | null;
    notice: string | null;
    bannerUrl: string | null;
    startsAt: string;
    endsAt: string;
    feePercent: number;
    active: boolean;
    published: boolean;
  },
  value: string | number | boolean | null
): Promise<AdminFleaEventDto | null> {
  const row = await db.aptFleaEvent.findUnique({ where: { id: eventId } });
  if (!row) return null;

  if (field === "published" && value === true && !row.published) {
    await autoSnapshotBeforeAction("flea_publish", adminId);
  }

  const data: Record<string, unknown> = {};
  if (field === "feePercent") {
    data.feeRate = Number(value) / 100;
    await writeFleaChangeLog(eventId, adminId, "feeRate", `${row.feeRate * 100}%`, `${value}%`);
  } else if (field === "startsAt" || field === "endsAt") {
    const parsed = value ? new Date(String(value)) : row[field];
    data[field] = parsed;
    await writeFleaChangeLog(
      eventId,
      adminId,
      field,
      row[field].toISOString().slice(0, 16),
      parsed.toISOString().slice(0, 16)
    );
  } else {
    data[field] = value;
    await writeFleaChangeLog(eventId, adminId, field, row[field as keyof typeof row], value);
  }

  const updated = await db.aptFleaEvent.update({ where: { id: eventId }, data });
  const stats = await loadEventListStats(eventId);
  return toListDto(updated, stats);
}

export async function toggleFleaEventField(
  eventId: string,
  adminId: string,
  field: "active" | "published",
  value: boolean
): Promise<AdminFleaEventDto | null> {
  return updateFleaEventField(eventId, adminId, field, value);
}

export async function forceStartFleaEvent(
  eventId: string,
  adminId: string
): Promise<AdminFleaEventDto | null> {
  const now = new Date();
  const row = await db.aptFleaEvent.findUnique({ where: { id: eventId } });
  if (!row) return null;

  await writeFleaChangeLog(eventId, adminId, "forceStart", row.startsAt.toISOString(), now.toISOString());
  const updated = await db.aptFleaEvent.update({
    where: { id: eventId },
    data: { startsAt: now, active: true, published: true },
  });
  const stats = await loadEventListStats(eventId);
  return toListDto(updated, stats);
}

export async function forceEndFleaEvent(
  eventId: string,
  adminId: string
): Promise<AdminFleaEventDto | null> {
  const now = new Date();
  const row = await db.aptFleaEvent.findUnique({ where: { id: eventId } });
  if (!row) return null;

  await writeFleaChangeLog(eventId, adminId, "forceEnd", row.endsAt.toISOString(), now.toISOString());
  const updated = await db.aptFleaEvent.update({
    where: { id: eventId },
    data: { endsAt: now, active: false },
  });
  const stats = await loadEventListStats(eventId);
  return toListDto(updated, stats);
}

export async function deleteFleaEvent(eventId: string, adminId: string): Promise<boolean> {
  const row = await db.aptFleaEvent.findUnique({ where: { id: eventId } });
  if (!row) return false;
  const listingCount = await db.aptMarketListing.count({
    where: { fleaEventId: eventId, status: "SELLING" },
  });
  if (listingCount > 0) return false;

  await writeFleaChangeLog(eventId, adminId, "deleted", row.title, "");
  await db.aptFleaEvent.delete({ where: { id: eventId } });
  return true;
}

export async function createFleaNpcOffer(
  eventId: string,
  adminId: string,
  input: {
    kind: FleaNpcKind;
    stickerTypeId: string;
    goldPrice?: number;
    discountPercent?: number | null;
    stock?: number | null;
  }
): Promise<FleaNpcOfferDto | { error: string }> {
  if (!STICKER_CATALOG[input.stickerTypeId]) {
    return { error: "카탈로그에 없는 아이템입니다." };
  }

  const base = getStickerGoldPrice(input.stickerTypeId);
  let goldPrice = input.goldPrice;
  if (input.kind === "sell") {
    const discount = input.discountPercent ?? 0;
    goldPrice = goldPrice ?? Math.max(1, Math.round(base * (1 - discount / 100)));
  } else {
    goldPrice = goldPrice ?? Math.max(1, Math.round(base * 0.65));
  }

  const maxSort = await db.aptFleaNpcOffer.aggregate({
    where: { eventId },
    _max: { sortOrder: true },
  });

  const row = await db.aptFleaNpcOffer.create({
    data: {
      eventId,
      kind: input.kind,
      stickerTypeId: input.stickerTypeId,
      goldPrice,
      discountPercent: input.kind === "sell" ? (input.discountPercent ?? null) : null,
      stock: input.kind === "sell" ? (input.stock ?? null) : null,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  await writeFleaChangeLog(
    eventId,
    adminId,
    "npc_add",
    "",
    `${input.kind}:${input.stickerTypeId}`
  );
  return toNpcDto(row);
}

export async function toggleFleaNpcOffer(
  offerId: string,
  adminId: string,
  enabled: boolean
): Promise<FleaNpcOfferDto | null> {
  const row = await db.aptFleaNpcOffer.findUnique({ where: { id: offerId } });
  if (!row) return null;
  await writeFleaChangeLog(row.eventId, adminId, "npc_enabled", row.enabled, enabled);
  const updated = await db.aptFleaNpcOffer.update({
    where: { id: offerId },
    data: { enabled },
  });
  return toNpcDto(updated);
}

export async function deleteFleaNpcOffer(
  offerId: string,
  adminId: string
): Promise<boolean> {
  const row = await db.aptFleaNpcOffer.findUnique({ where: { id: offerId } });
  if (!row) return false;
  await writeFleaChangeLog(row.eventId, adminId, "npc_delete", row.stickerTypeId, "");
  await db.aptFleaNpcOffer.delete({ where: { id: offerId } });
  return true;
}

export function getFleaCatalogItems() {
  return listShopEligibleItems();
}

export function formatFleaPeriod(startsAt: string, endsAt: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  return `${fmt(startsAt)} ~ ${fmt(endsAt)}`;
}
