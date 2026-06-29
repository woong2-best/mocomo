/**
 * Economy Event Stream — Audit Timeline 기반 (레거시 EconomyEvent 호환)
 * @see buildAuditTimeline — Source of Truth
 */
import { db } from "@/lib/db";
import { auditEventsToLegacy } from "./audit/audit-to-legacy";
import {
  auditEventsToCsv,
  buildAuditTimeline,
  buildWalletLedgerFromAudit,
  searchAuditByCorrelation,
} from "./audit/build-audit-timeline";
import type { AuditCategory } from "./audit/audit-types";
import type {
  EconomyEvent,
  EconomyEventCategory,
  EconomyEventStreamOptions,
} from "./economy-event-types";

const LEGACY_TO_AUDIT: Record<EconomyEventCategory, AuditCategory | null> = {
  wallet: "Wallet",
  market: "Market",
  storage: "Storage",
  live: "Live",
  mission: "Mission",
  fraud: "Fraud",
  offline: "Storage",
  admin: "Admin",
  shop: "Shop",
  iap: "IAP",
};

function mapCategories(cats?: EconomyEventCategory[]): AuditCategory[] | undefined {
  if (!cats?.length) return undefined;
  return cats
    .map((c) => LEGACY_TO_AUDIT[c])
    .filter((c): c is AuditCategory => c != null);
}

export async function buildEconomyEventStream(
  userId: string,
  options: EconomyEventStreamOptions = {}
): Promise<EconomyEvent[]> {
  const audit = await buildAuditTimeline(userId, {
    days: options.days,
    limit: options.limit,
    categories: mapCategories(options.categories),
  });
  return auditEventsToLegacy(audit);
}

export async function getCachedEconomyEventStream(
  userId: string,
  options: EconomyEventStreamOptions = {}
): Promise<EconomyEvent[]> {
  const cacheTtlMs = 5 * 60 * 1000;
  const cached = await db.aptEconomyReplayCache.findUnique({ where: { userId } });
  if (cached && Date.now() - cached.generatedAt.getTime() < cacheTtlMs) {
    const events = cached.json as EconomyEvent[];
    if (options.categories?.length) {
      const set = new Set(options.categories);
      return events.filter((e) => set.has(e.category));
    }
    return events;
  }

  const events = await buildEconomyEventStream(userId, { ...options, limit: 500 });
  await db.aptEconomyReplayCache.upsert({
    where: { userId },
    create: { userId, generatedAt: new Date(), json: events as object[] },
    update: { generatedAt: new Date(), json: events as object[] },
  });

  if (options.categories?.length) {
    const set = new Set(options.categories);
    return events.filter((e) => set.has(e.category));
  }
  return events;
}

export function invalidateEconomyReplayCache(userId: string): Promise<unknown> {
  return db.aptEconomyReplayCache.deleteMany({ where: { userId } });
}

export type WalletLedgerRow = {
  at: string;
  action: string;
  goldBefore: number;
  deltaGold: number;
  goldAfter: number;
  referenceId?: string | null;
  correlationId?: string | null;
};

export async function buildWalletLedgerForUser(
  userId: string,
  days = 30
): Promise<WalletLedgerRow[]> {
  const audit = await buildAuditTimeline(userId, { days, limit: 500 });
  return buildWalletLedgerFromAudit(audit);
}

export function buildWalletLedger(events: EconomyEvent[]): WalletLedgerRow[] {
  const rows: WalletLedgerRow[] = [];
  for (const e of events) {
    if (e.goldBefore == null && e.goldAfter == null && e.deltaGold == null) continue;
    const delta = e.deltaGold ?? (e.goldAfter != null && e.goldBefore != null ? e.goldAfter - e.goldBefore : 0);
    if (delta === 0 && e.goldBefore == null) continue;
    rows.push({
      at: e.at,
      action: e.title,
      goldBefore: e.goldBefore ?? (e.goldAfter != null ? e.goldAfter - delta : 0),
      deltaGold: delta,
      goldAfter: e.goldAfter ?? (e.goldBefore != null ? e.goldBefore + delta : 0),
      referenceId: e.referenceId,
      correlationId:
        e.metadata && typeof e.metadata.correlationId === "string"
          ? e.metadata.correlationId
          : undefined,
    });
  }
  return rows;
}

export function filterEventsByCategories(
  events: EconomyEvent[],
  categories: EconomyEventCategory[]
): EconomyEvent[] {
  if (!categories.length) return events;
  const set = new Set(categories);
  return events.filter((e) => set.has(e.category));
}

export function eventsToCsv(events: EconomyEvent[]): string {
  const header =
    "at,category,action,title,summary,deltaGold,goldBefore,goldAfter,referenceId,correlationId";
  const lines = events.map((e) =>
    [
      e.at,
      e.category,
      e.action,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.summary.replace(/"/g, '""')}"`,
      e.deltaGold ?? "",
      e.goldBefore ?? "",
      e.goldAfter ?? "",
      e.referenceId ?? "",
      e.metadata?.correlationId ?? "",
    ].join(",")
  );
  return [header, ...lines].join("\n");
}

export { buildAuditTimeline, searchAuditByCorrelation, auditEventsToCsv };
