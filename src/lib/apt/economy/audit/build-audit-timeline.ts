import { db } from "@/lib/db";
import { humanReason } from "./audit-reasons";
import { severityFor } from "./audit-severity";
import { deriveTags } from "./audit-tags";
import type {
  AuditAction,
  AuditActor,
  AuditCategory,
  AuditTimelineOptions,
  EconomyAuditEvent,
} from "./audit-types";

const SYSTEM_ACTOR: AuditActor = { kind: "system", label: "System" };

function pushDedup(events: EconomyAuditEvent[], seen: Set<string>, e: EconomyAuditEvent) {
  const key = `${e.occurredAt}|${e.category}|${e.action}|${e.referenceId ?? ""}|${e.id}`;
  if (seen.has(key)) return;
  seen.add(key);
  events.push(e);
}

function finalize(
  partial: Omit<EconomyAuditEvent, "severity" | "tags"> & {
    severity?: EconomyAuditEvent["severity"];
    tags?: string[];
  }
): EconomyAuditEvent {
  const severity =
    partial.severity ?? severityFor(partial.category, partial.action, partial.metadata);
  const tags =
    partial.tags ??
    deriveTags({
      category: partial.category,
      action: partial.action,
      delta: partial.delta,
      referenceType: partial.referenceType,
      reasonCode: partial.reasonCode,
      metadata: partial.metadata,
    });
  return { ...partial, severity, tags };
}

function categoryFromLogAction(action: string, referenceType?: string | null): AuditCategory {
  if (action.startsWith("cs_admin_")) return "Admin";
  if (action.startsWith("fraud_")) return "Fraud";
  if (action.startsWith("market_")) return "Market";
  if (action.startsWith("storage_")) return "Storage";
  if (action.startsWith("shop_")) return "Shop";
  if (action.startsWith("flea_")) return "Flea";
  if (action.includes("mission")) return "Mission";
  if (action.includes("live") || referenceType === "LiveSupportEvent") return "Live";
  if (referenceType === "AptIapPurchase") return "IAP";
  return "Wallet";
}

function actionFromLog(action: string): AuditAction {
  if (action.includes("buy") || action.includes("purchase")) return "BUY";
  if (action.includes("sell") || action.includes("sold")) return "SELL";
  if (action.includes("cancel")) return "CANCEL";
  if (action.includes("list")) return "LIST";
  if (action.includes("refund") || action.includes("debit")) return "REFUND";
  if (action.includes("return")) return "RESTORE";
  if (action.includes("consume")) return "REMOVE";
  if (action.includes("grant")) return "ADD";
  return "TRANSFER";
}

function actionFromWalletType(type: string, amount: number): AuditAction {
  if (type === "admin") return amount >= 0 ? "ADD" : "REFUND";
  if (amount >= 0) return "ADD";
  if (type === "shop" || type === "market" || type === "flea" || type === "purchase") return "BUY";
  return "REMOVE";
}

function walletCategory(type: string, referenceType?: string | null): AuditCategory {
  if (type === "live" || referenceType === "LiveSupportEvent") return "Live";
  if (type === "mission") return "Mission";
  if (type === "admin") return "Admin";
  if (type === "purchase") return "IAP";
  if (type === "market" || type === "flea") return "Market";
  if (type === "shop") return "Shop";
  return "Wallet";
}

/** 경제 Audit Timeline — Replay·CS·Fraud 공용 Source of Truth */
export async function buildAuditTimeline(
  userId: string,
  options: AuditTimelineOptions = {}
): Promise<EconomyAuditEvent[]> {
  const days = options.days ?? 30;
  const limit = options.limit ?? 500;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const corrFilter = options.correlationId;
  const corrWhere = corrFilter ? { correlationId: corrFilter } : {};

  const [
    economyLogs,
    walletTx,
    listingsAsSeller,
    listingsAsBuyer,
    offlineOps,
    fraudEvents,
    fraudActions,
    iapPurchases,
    notifications,
  ] = await Promise.all([
    db.aptEconomyLog.findMany({
      where: { userId, createdAt: { gte: since }, ...corrWhere },
      orderBy: { createdAt: "asc" },
      take: limit,
    }),
    db.aptWalletTransaction.findMany({
      where: { userId, createdAt: { gte: since }, ...corrWhere },
      orderBy: { createdAt: "asc" },
      take: limit,
    }),
    db.aptMarketListing.findMany({
      where: { sellerId: userId, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      take: 150,
    }),
    db.aptMarketListing.findMany({
      where: { buyerId: userId, soldAt: { gte: since } },
      orderBy: { soldAt: "asc" },
      take: 150,
    }),
    db.aptEconomyOperation.findMany({
      where: { userId, createdAt: { gte: since }, ...corrWhere },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
    db.aptFraudEvent.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
    db.aptFraudAction.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      take: 50,
      include: { admin: { select: { username: true, name: true } } },
    }),
    db.aptIapPurchase.findMany({
      where: { userId, createdAt: { gte: since }, ...corrWhere },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    db.aptNotification.findMany({
      where: { userId, createdAt: { gte: since }, ...corrWhere },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
  ]);

  const events: EconomyAuditEvent[] = [];
  const seen = new Set<string>();

  for (const log of economyLogs) {
    const category = categoryFromLogAction(log.action, log.referenceType);
    const action = actionFromLog(log.action);
    pushDedup(
      events,
      seen,
      finalize({
        id: log.id,
        occurredAt: log.createdAt.toISOString(),
        category,
        action,
        actor: log.action.startsWith("cs_admin_")
          ? { kind: "admin", label: "Admin (CS)" }
          : SYSTEM_ACTOR,
        target: { userId },
        delta: {
          gold: log.deltaGold !== 0 ? log.deltaGold : undefined,
          gems: log.deltaGems !== 0 ? log.deltaGems : undefined,
        },
        before: { gold: log.goldBefore ?? undefined, gems: log.gemsBefore ?? undefined },
        after: { gold: log.goldAfter ?? undefined, gems: log.gemsAfter ?? undefined },
        reason: humanReason(log.action, log.reason),
        reasonCode: log.action,
        referenceType: log.referenceType ?? undefined,
        referenceId: log.referenceId ?? undefined,
        correlationId: log.correlationId ?? undefined,
        source: "AptEconomyLog",
        metadata: { rawAction: log.action },
      })
    );
  }

  const loggedWalletRefs = new Set(
    economyLogs
      .filter((l) => l.referenceType === "AptWalletTransaction")
      .map((l) => l.referenceId)
      .filter(Boolean)
  );

  for (const tx of walletTx) {
    if (loggedWalletRefs.has(tx.id)) continue;
    const category = walletCategory(tx.type, tx.referenceType);
    const reasonCode = `wallet_${tx.type}`;
    pushDedup(
      events,
      seen,
      finalize({
        id: tx.id,
        occurredAt: tx.createdAt.toISOString(),
        category,
        action: actionFromWalletType(tx.type, tx.amount),
        actor: tx.type === "admin" ? { kind: "admin", label: "Admin" } : SYSTEM_ACTOR,
        target: { userId },
        delta: {
          gold: tx.currency === "gold" ? tx.amount : undefined,
          gems: tx.currency === "gems" ? tx.amount : undefined,
        },
        after: { gold: tx.currency === "gold" ? tx.balanceAfter : undefined },
        reason: humanReason(reasonCode, tx.memo),
        reasonCode,
        referenceType: tx.referenceType ?? "AptWalletTransaction",
        referenceId: tx.referenceId ?? tx.id,
        correlationId: tx.correlationId ?? undefined,
        source: "AptWalletTransaction",
        metadata: { balanceAfter: tx.balanceAfter, type: tx.type },
      })
    );
  }

  for (const listing of listingsAsSeller) {
    const item = listing.stickerTypeId ?? listing.itemKind;
    pushDedup(
      events,
      seen,
      finalize({
        id: `audit-list-${listing.id}`,
        occurredAt: listing.createdAt.toISOString(),
        category: listing.fleaEventId ? "Flea" : "Market",
        action: "LIST",
        actor: { kind: "user", id: userId, label: "Seller" },
        target: { userId, label: item },
        delta: { itemId: item, itemQty: 1 },
        reason: humanReason("market_list"),
        reasonCode: "market_list",
        referenceType: "AptMarketListing",
        referenceId: listing.id,
        source: "AptMarketListing",
        metadata: { priceGold: listing.priceGold, status: listing.status },
      })
    );
    if (listing.status === "SOLD" && listing.soldAt) {
      pushDedup(
        events,
        seen,
        finalize({
          id: `audit-sold-${listing.id}`,
          occurredAt: listing.soldAt.toISOString(),
          category: "Market",
          action: "SELL",
          actor: SYSTEM_ACTOR,
          target: { userId, label: item },
          delta: { gold: listing.priceGold, itemId: item },
          reason: humanReason("market_sell"),
          reasonCode: "market_sell",
          referenceType: "AptMarketListing",
          referenceId: listing.id,
          source: "AptMarketListing",
          metadata: { buyerId: listing.buyerId },
        })
      );
    }
  }

  for (const listing of listingsAsBuyer) {
    if (!listing.soldAt) continue;
    const item = listing.stickerTypeId ?? listing.itemKind;
    pushDedup(
      events,
      seen,
      finalize({
        id: `audit-bought-${listing.id}`,
        occurredAt: listing.soldAt.toISOString(),
        category: "Market",
        action: "BUY",
        actor: { kind: "user", id: userId, label: "Buyer" },
        target: { userId, label: item },
        delta: { gold: -listing.priceGold, itemId: item, itemQty: 1 },
        reason: humanReason("market_buy"),
        reasonCode: "market_buy",
        referenceType: "AptMarketListing",
        referenceId: listing.id,
        source: "AptMarketListing",
        metadata: { sellerId: listing.sellerId },
      })
    );
  }

  for (const op of offlineOps) {
    if (economyLogs.some((l) => l.referenceId === op.id)) continue;
    const isReturn = op.kind.includes("return");
    pushDedup(
      events,
      seen,
      finalize({
        id: op.id,
        occurredAt: op.createdAt.toISOString(),
        category: "Storage",
        action: isReturn ? "RESTORE" : "REMOVE",
        actor: SYSTEM_ACTOR,
        target: { userId, label: op.itemId ?? undefined },
        delta: { itemId: op.itemId ?? undefined, itemQty: op.amount },
        reason: humanReason(isReturn ? "storage_return" : "storage_consume"),
        reasonCode: `offline_${op.kind}`,
        referenceType: "AptEconomyOperation",
        referenceId: op.id,
        correlationId: op.correlationId ?? undefined,
        source: "AptEconomyOperation",
      })
    );
  }

  for (const fe of fraudEvents) {
    pushDedup(
      events,
      seen,
      finalize({
        id: fe.id,
        occurredAt: fe.createdAt.toISOString(),
        category: "Fraud",
        action: "WARN",
        actor: SYSTEM_ACTOR,
        target: { userId },
        reason: humanReason("fraud_rule_hit", `${fe.rule} +${fe.scoreDelta}`),
        reasonCode: "fraud_rule_hit",
        referenceType: "AptFraudEvent",
        referenceId: fe.id,
        source: "AptFraudEvent",
        metadata: { rule: fe.rule, scoreDelta: fe.scoreDelta },
      })
    );
  }

  for (const fa of fraudActions) {
    const act = fa.action.toUpperCase();
    const auditAction: AuditAction =
      act === "FREEZE" ? "FREEZE" : act === "WARN" ? "WARN" : "RESTORE";
    pushDedup(
      events,
      seen,
      finalize({
        id: fa.id,
        occurredAt: fa.createdAt.toISOString(),
        category: auditAction === "WARN" ? "Admin" : "Fraud",
        action: auditAction,
        actor: fa.admin
          ? { kind: "admin", id: fa.adminId ?? undefined, label: fa.admin.name ?? fa.admin.username }
          : SYSTEM_ACTOR,
        target: { userId },
        reason: humanReason(`fraud_action_${fa.action.toLowerCase()}`, fa.reason),
        reasonCode: `fraud_action_${fa.action.toLowerCase()}`,
        referenceType: "AptFraudAction",
        referenceId: fa.id,
        source: "AptFraudAction",
      })
    );
  }

  for (const iap of iapPurchases) {
    pushDedup(
      events,
      seen,
      finalize({
        id: iap.id,
        occurredAt: iap.createdAt.toISOString(),
        category: "IAP",
        action: iap.status === "REFUNDED" ? "REFUND" : "ADD",
        actor: { kind: "google", label: "Google Play" },
        target: { userId, label: iap.productId },
        delta: { gems: iap.gemsGranted || undefined, gold: iap.goldGranted || undefined },
        reason: humanReason(iap.status === "REFUNDED" ? "iap_refund" : "iap_purchase", iap.productId),
        reasonCode: "iap_purchase",
        referenceType: "AptIapPurchase",
        referenceId: iap.orderId,
        correlationId: iap.correlationId ?? undefined,
        source: "AptIapPurchase",
        metadata: { purchaseToken: iap.purchaseToken, status: iap.status },
      })
    );
  }

  for (const n of notifications) {
    pushDedup(
      events,
      seen,
      finalize({
        id: n.id,
        occurredAt: n.createdAt.toISOString(),
        category: "Notification",
        action: "ADD",
        actor: SYSTEM_ACTOR,
        target: { userId },
        reason: humanReason("notification_sent", n.title),
        reasonCode: n.type,
        referenceType: "AptNotification",
        referenceId: n.id,
        correlationId: n.correlationId ?? undefined,
        source: "AptNotification",
        metadata: { type: n.type, body: n.body },
      })
    );
  }

  events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  let filtered = events;
  if (options.categories?.length) {
    const set = new Set(options.categories);
    filtered = events.filter((e) => set.has(e.category));
  }
  return filtered.slice(-limit);
}

export async function searchAuditByCorrelation(
  correlationId: string,
  limit = 200
): Promise<{ userId: string; events: EconomyAuditEvent[] }[]> {
  const corr = correlationId.trim();
  const userIdSets = await Promise.all([
    db.aptEconomyLog.findMany({ where: { correlationId: corr }, select: { userId: true } }),
    db.aptWalletTransaction.findMany({ where: { correlationId: corr }, select: { userId: true } }),
    db.aptEconomyOperation.findMany({ where: { correlationId: corr }, select: { userId: true } }),
    db.aptIapPurchase.findMany({ where: { correlationId: corr }, select: { userId: true } }),
    db.aptNotification.findMany({ where: { correlationId: corr }, select: { userId: true } }),
  ]);
  const userIds = [
    ...new Set(userIdSets.flat().map((r) => r.userId)),
  ].slice(0, 20);

  const results: { userId: string; events: EconomyAuditEvent[] }[] = [];
  for (const userId of userIds) {
    const events = await buildAuditTimeline(userId, { correlationId: corr, days: 365, limit });
    if (events.length) results.push({ userId, events });
  }
  return results;
}

export function buildWalletLedgerFromAudit(events: EconomyAuditEvent[]) {
  return events
    .filter((e) => e.delta?.gold != null || e.before?.gold != null)
    .map((e) => {
      const delta = e.delta?.gold ?? 0;
      const goldAfter = e.after?.gold ?? (e.metadata?.balanceAfter as number | undefined) ?? 0;
      const goldBefore = e.before?.gold ?? goldAfter - delta;
      return {
        at: e.occurredAt,
        action: e.reason,
        goldBefore,
        deltaGold: delta,
        goldAfter,
        referenceId: e.referenceId,
        correlationId: e.correlationId,
      };
    });
}

export function auditEventsToCsv(events: EconomyAuditEvent[]): string {
  const header =
    "occurredAt,category,action,reason,deltaGold,goldBefore,goldAfter,referenceId,correlationId,severity,tags,actor";
  const lines = events.map((e) =>
    [
      e.occurredAt,
      e.category,
      e.action,
      `"${e.reason.replace(/"/g, '""')}"`,
      e.delta?.gold ?? "",
      e.before?.gold ?? "",
      e.after?.gold ?? "",
      e.referenceId ?? "",
      e.correlationId ?? "",
      e.severity,
      e.tags.join("|"),
      `"${e.actor.label.replace(/"/g, '""')}"`,
    ].join(",")
  );
  return [header, ...lines].join("\n");
}
