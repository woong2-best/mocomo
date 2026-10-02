import { db } from "@/lib/db";
import { resolveAptHomeOwnerId } from "@/actions/apt-cohabitation";
import { adjustWallet, addInventoryAndStorage } from "./service";
import { writeEconomyLog } from "./economy-log-service";
import {
  adminFreezeUser,
  adminUnfreezeUser,
} from "./fraud/admin-fraud-service";
import type { EconomyAuditEvent, AuditLine } from "./audit/audit-types";
import { buildAuditTimeline, buildWalletLedgerFromAudit } from "./audit/build-audit-timeline";
import { formatAuditLines } from "./audit/format-audit-line";
import {
  isCorrelationIdQuery,
  normalizeCorrelationQuery,
} from "./audit/correlation-id";
import { auditEventsToLegacy } from "./audit/audit-to-legacy";
import type { EconomyEvent, EconomyEventCategory } from "./economy-event-types";
import {
  auditEventsToCsv,
  buildWalletLedger,
  eventsToCsv,
  invalidateEconomyReplayCache,
  searchAuditByCorrelation,
  type WalletLedgerRow,
} from "./economy-event-stream";

export type CsSearchHit = {
  kind: "user" | "wallet_tx" | "listing" | "economy_log" | "iap" | "offline_op";
  id: string;
  userId: string;
  label: string;
  sublabel?: string;
};

export type CsUserSummary = {
  userId: string;
  economyOwnerId: string;
  username: string;
  name: string | null;
  email: string | null;
  gold: number;
  gems: number;
  fraudScore: number;
  fraudStatus: string;
  frozenAt: string | null;
};

export type CsMemoDto = {
  id: string;
  memo: string;
  adminName: string;
  createdAt: string;
};

export type CsUserDetail = {
  user: CsUserSummary;
  /** Audit Source of Truth */
  auditTimeline: EconomyAuditEvent[];
  auditLines: AuditLine[];
  /** @deprecated auditTimeline — 레거시 호환 */
  timeline: EconomyEvent[];
  walletLedger: WalletLedgerRow[];
  storageHistory: EconomyAuditEvent[];
  marketHistory: EconomyAuditEvent[];
  liveHistory: EconomyAuditEvent[];
  memos: CsMemoDto[];
};

export async function searchEconomyCs(query: string): Promise<CsSearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const hits: CsSearchHit[] = [];
  const pushUser = (u: { id: string; username: string; email: string | null; name: string | null }) => {
    if (hits.some((h) => h.kind === "user" && h.userId === u.id)) return;
    hits.push({
      kind: "user",
      id: u.id,
      userId: u.id,
      label: u.username,
      sublabel: u.email ?? u.name ?? undefined,
    });
  };

  if (q.includes("@")) {
    const byEmail = await db.user.findFirst({
      where: { email: { equals: q, mode: "insensitive" } },
      select: { id: true, username: true, email: true, name: true },
    });
    if (byEmail) pushUser(byEmail);
  }

  const [byUsername, byId] = await Promise.all([
    db.user.findFirst({
      where: { username: { equals: q, mode: "insensitive" } },
      select: { id: true, username: true, email: true, name: true },
    }),
    db.user.findUnique({
      where: { id: q },
      select: { id: true, username: true, email: true, name: true },
    }),
  ]);
  if (byUsername) pushUser(byUsername);
  if (byId) pushUser(byId);

  if (isCorrelationIdQuery(q)) {
    const corr = normalizeCorrelationQuery(q);
    const groups = await searchAuditByCorrelation(corr, 50);
    for (const g of groups) {
      const u = await db.user.findUnique({
        where: { id: g.userId },
        select: { id: true, username: true, email: true, name: true },
      });
      if (u) {
        hits.push({
          kind: "user",
          id: corr,
          userId: u.id,
          label: `@${u.username} · corr`,
          sublabel: `${g.events.length} events · ${corr.slice(0, 20)}…`,
        });
      }
    }
    if (hits.length) return hits;
  }

  const [walletTx, listing, economyLog, iap, offlineOp] = await Promise.all([
    db.aptWalletTransaction.findUnique({
      where: { id: q },
      select: { id: true, userId: true, memo: true, amount: true, currency: true },
    }),
    db.aptMarketListing.findUnique({
      where: { id: q },
      select: { id: true, sellerId: true, buyerId: true, stickerTypeId: true, status: true },
    }),
    db.aptEconomyLog.findUnique({
      where: { id: q },
      select: { id: true, userId: true, action: true, reason: true },
    }),
    db.aptIapPurchase.findFirst({
      where: { OR: [{ id: q }, { orderId: q }] },
      select: { id: true, userId: true, orderId: true, productId: true },
    }),
    db.aptEconomyOperation.findUnique({
      where: { id: q },
      select: { id: true, userId: true, kind: true },
    }),
  ]);

  if (walletTx) {
    hits.push({
      kind: "wallet_tx",
      id: walletTx.id,
      userId: walletTx.userId,
      label: `Wallet Tx ${walletTx.id.slice(0, 8)}…`,
      sublabel: walletTx.memo ?? `${walletTx.amount}${walletTx.currency}`,
    });
  }
  if (listing) {
    hits.push({
      kind: "listing",
      id: listing.id,
      userId: listing.buyerId ?? listing.sellerId,
      label: `Listing ${listing.id.slice(0, 8)}…`,
      sublabel: `${listing.stickerTypeId ?? "?"} · ${listing.status}`,
    });
  }
  if (economyLog) {
    hits.push({
      kind: "economy_log",
      id: economyLog.id,
      userId: economyLog.userId,
      label: economyLog.action,
      sublabel: economyLog.reason ?? undefined,
    });
  }
  if (iap) {
    hits.push({
      kind: "iap",
      id: iap.id,
      userId: iap.userId,
      label: `IAP ${iap.orderId}`,
      sublabel: iap.productId,
    });
  }
  if (offlineOp) {
    hits.push({
      kind: "offline_op",
      id: offlineOp.id,
      userId: offlineOp.userId,
      label: `Offline ${offlineOp.kind}`,
      sublabel: offlineOp.id.slice(0, 8),
    });
  }

  return hits.slice(0, 20);
}

async function loadUserSummary(userId: string): Promise<CsUserSummary | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, name: true, email: true },
  });
  if (!user) return null;

  const economyOwnerId = await resolveAptHomeOwnerId(userId);
  const [wallet, fraud] = await Promise.all([
    db.aptWallet.findUnique({ where: { userId: economyOwnerId } }),
    db.aptFraudProfile.findUnique({ where: { userId: economyOwnerId } }),
  ]);

  return {
    userId: user.id,
    economyOwnerId,
    username: user.username,
    name: user.name,
    email: user.email,
    gold: wallet?.gold ?? 0,
    gems: wallet?.gems ?? 0,
    fraudScore: fraud?.riskScore ?? 0,
    fraudStatus: fraud?.status ?? "NORMAL",
    frozenAt: fraud?.frozenAt?.toISOString() ?? null,
  };
}

export async function getCsUserDetail(
  userId: string,
  options?: { days?: number; categories?: EconomyEventCategory[]; useCache?: boolean }
): Promise<CsUserDetail | null> {
  const user = await loadUserSummary(userId);
  if (!user) return null;

  const auditTimeline = await buildAuditTimeline(user.economyOwnerId, {
    days: options?.days ?? 30,
    limit: 500,
  });

  const auditLines = formatAuditLines(auditTimeline);
  const timeline = auditEventsToLegacy(auditTimeline);
  const memos = await listCsMemos(userId);

  return {
    user,
    auditTimeline,
    auditLines,
    timeline,
    walletLedger: buildWalletLedgerFromAudit(auditTimeline),
    storageHistory: auditTimeline.filter(
      (e) => e.category === "Storage" || e.category === "Inventory"
    ),
    marketHistory: auditTimeline.filter((e) => e.category === "Market" || e.category === "Flea"),
    liveHistory: auditTimeline.filter((e) => e.category === "Live"),
    memos,
  };
}

export async function listCsMemos(userId: string): Promise<CsMemoDto[]> {
  const rows = await db.aptCsMemo.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { admin: { select: { name: true, username: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    memo: r.memo,
    adminName: r.admin.name ?? r.admin.username,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function addCsMemo(
  userId: string,
  adminId: string,
  memo: string
): Promise<{ ok: true } | { error: string }> {
  const text = memo.trim();
  if (!text) return { error: "메모를 입력하세요." };
  await db.aptCsMemo.create({ data: { userId, adminId, memo: text } });
  return { ok: true };
}

export async function csRefundGold(
  userId: string,
  adminId: string,
  amount: number,
  reason: string
): Promise<{ ok: true } | { error: string }> {
  if (!Number.isInteger(amount) || amount === 0) return { error: "유효한 골드 금액을 입력하세요." };
  const ownerId = await resolveAptHomeOwnerId(userId);
  const refId = `cs-refund:${adminId}:${Date.now()}`;

  await adjustWallet(ownerId, { gold: amount }, {
    type: "admin",
    referenceId: refId,
    memo: `[CS] ${reason}`,
  });

  await invalidateEconomyReplayCache(ownerId);
  return { ok: true };
}

export async function csGrantItem(
  userId: string,
  adminId: string,
  itemId: string,
  quantity: number,
  reason: string
): Promise<{ ok: true } | { error: string }> {
  const id = itemId.trim();
  if (!id) return { error: "아이템 ID를 입력하세요." };
  if (!Number.isInteger(quantity) || quantity < 1) return { error: "수량은 1 이상이어야 합니다." };

  const ownerId = await resolveAptHomeOwnerId(userId);
  await addInventoryAndStorage(ownerId, id, quantity, "gift");

  await db.$transaction(async (tx) => {
    await writeEconomyLog(tx, {
      userId: ownerId,
      action: "cs_admin_grant_item",
      reason: `[CS] ${reason} · ${id} x${quantity}`,
      referenceId: `cs-grant:${adminId}:${Date.now()}`,
      referenceType: "CsAdminAction",
    });
  });

  await invalidateEconomyReplayCache(ownerId);
  return { ok: true };
}

export async function csWarnUser(
  userId: string,
  adminId: string,
  reason: string
): Promise<void> {
  const ownerId = await resolveAptHomeOwnerId(userId);
  await db.aptFraudAction.create({
    data: { userId: ownerId, action: "WARN", reason, adminId },
  });
  const { notifyFraudWarn } = await import("./notification/economy-notify");
  notifyFraudWarn(ownerId, reason);
  await invalidateEconomyReplayCache(ownerId);
}

export async function csFreezeUser(userId: string, adminId: string, reason: string): Promise<void> {
  const ownerId = await resolveAptHomeOwnerId(userId);
  await adminFreezeUser(ownerId, adminId, reason);
  await invalidateEconomyReplayCache(ownerId);
}

export async function csUnfreezeUser(userId: string, adminId: string, reason: string): Promise<void> {
  const ownerId = await resolveAptHomeOwnerId(userId);
  await adminUnfreezeUser(ownerId, adminId, reason);
  await invalidateEconomyReplayCache(ownerId);
}

export async function csReplayIapPurchase(
  purchaseIdOrOrderId: string,
  adminId: string
): Promise<{ ok: true; correlationId?: string } | { error: string }> {
  const purchase = await db.aptIapPurchase.findFirst({
    where: { OR: [{ id: purchaseIdOrOrderId }, { orderId: purchaseIdOrOrderId }] },
  });
  if (!purchase) return { error: "구매 기록을 찾을 수 없습니다." };

  const { fulfillIapPurchase } = await import("./iap/iap-fulfillment-pipeline");
  const res = await fulfillIapPurchase(purchase.userId, {
    provider: "google_play",
    productId: purchase.productId,
    purchaseToken: purchase.purchaseToken,
    orderId: purchase.orderId,
  });
  if ("error" in res) return res;

  await db.aptCsMemo.create({
    data: {
      userId: purchase.userId,
      adminId,
      memo: `[CS IAP Replay] ${purchase.orderId} · ${purchase.productId}`,
    },
  });
  await invalidateEconomyReplayCache(purchase.userId);
  return {
    ok: true,
    correlationId: "correlationId" in res ? res.correlationId : purchase.correlationId ?? undefined,
  };
}

export function exportCsTimelineJson(events: EconomyEvent[]): string {
  return JSON.stringify(events, null, 2);
}

export function exportCsAuditJson(events: EconomyAuditEvent[]): string {
  return JSON.stringify(events, null, 2);
}

export function exportCsTimelineCsv(events: EconomyEvent[]): string {
  return eventsToCsv(events);
}

export function exportCsAuditCsv(events: EconomyAuditEvent[]): string {
  return auditEventsToCsv(events);
}

export type { EconomyEvent, EconomyAuditEvent, AuditLine, WalletLedgerRow };
