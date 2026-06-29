import type { EconomyEvent, EconomyEventCategory } from "../economy-event-types";
import type { AuditCategory, EconomyAuditEvent } from "./audit-types";

const CATEGORY_TO_LEGACY: Record<AuditCategory, EconomyEventCategory> = {
  Wallet: "wallet",
  Inventory: "storage",
  Storage: "storage",
  Market: "market",
  Shop: "shop",
  Mission: "mission",
  Live: "live",
  Flea: "shop",
  IAP: "iap",
  Fraud: "fraud",
  Admin: "admin",
  Notification: "admin",
};

/** @deprecated EconomyEvent 호환 — 점진적 제거 */
export function auditEventToLegacy(e: EconomyAuditEvent): EconomyEvent {
  const category = CATEGORY_TO_LEGACY[e.category] ?? "wallet";
  const title = `${e.category} ${e.action}`;
  const summaryParts = [e.reason];
  if (e.target.label) summaryParts.push(e.target.label);
  if (e.referenceId) summaryParts.push(String(e.referenceId).slice(0, 24));

  return {
    id: e.id,
    at: e.occurredAt,
    category,
    action: `${e.category.toLowerCase()}_${e.action.toLowerCase()}`,
    title,
    summary: summaryParts.join(" · "),
    deltaGold: e.delta?.gold,
    deltaGems: e.delta?.gems,
    goldBefore: e.before?.gold,
    goldAfter: e.after?.gold,
    gemsBefore: e.before?.gems,
    gemsAfter: e.after?.gems,
    referenceId: e.referenceId,
    referenceType: e.referenceType,
    metadata: {
      ...e.metadata,
      correlationId: e.correlationId,
      severity: e.severity,
      tags: e.tags,
      actor: e.actor,
      auditCategory: e.category,
      auditAction: e.action,
    },
    fraudOverlay:
      e.category === "Fraud" && e.metadata?.rule
        ? {
            rule: String(e.metadata.rule),
            scoreDelta: Number(e.metadata.scoreDelta ?? 0),
            status: e.metadata.status as string | undefined,
          }
        : undefined,
  };
}

export function auditEventsToLegacy(events: EconomyAuditEvent[]): EconomyEvent[] {
  return events.map(auditEventToLegacy);
}
