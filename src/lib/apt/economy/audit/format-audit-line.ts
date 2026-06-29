import type { AuditLine, EconomyAuditEvent } from "./audit-types";

function formatTimeShort(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeFull(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR");
}

function headlineFor(e: EconomyAuditEvent): string {
  const parts: string[] = [];
  if (e.delta?.gold != null && e.delta.gold !== 0) {
    parts.push(`${e.delta.gold >= 0 ? "+" : ""}${e.delta.gold.toLocaleString()} Gold`);
  }
  if (e.delta?.gems != null && e.delta.gems !== 0) {
    parts.push(`${e.delta.gems >= 0 ? "+" : ""}${e.delta.gems.toLocaleString()} Gems`);
  }
  if (e.delta?.itemId) {
    const qty = e.delta.itemQty ?? 1;
    parts.push(`${e.target.label ?? e.delta.itemId}${qty > 1 ? ` x${qty}` : ""}`);
  }
  if (e.action === "FREEZE") parts.push("Account Frozen");
  if (e.action === "WARN") parts.push("Warning");
  if (e.action === "LIST") parts.push("Listed for Sale");
  if (parts.length === 0 && e.metadata?.summary) {
    parts.push(String(e.metadata.summary));
  }
  if (parts.length === 0) parts.push(e.action);
  return parts.join(" · ");
}

function balanceLineFor(e: EconomyAuditEvent): string | undefined {
  if (e.before?.gold != null && e.after?.gold != null) {
    return `${e.before.gold.toLocaleString()} → ${e.after.gold.toLocaleString()}`;
  }
  if (e.before?.field && e.after?.value != null && e.before?.value != null) {
    return `${e.before.field}: ${e.before.value} → ${e.after.value}`;
  }
  if (e.metadata?.balanceAfter != null && e.delta?.gold != null) {
    const after = Number(e.metadata.balanceAfter);
    const before = after - e.delta.gold;
    return `${before.toLocaleString()} → ${after.toLocaleString()}`;
  }
  return undefined;
}

export function formatAuditLine(e: EconomyAuditEvent): AuditLine {
  return {
    id: e.id,
    time: formatTimeFull(e.occurredAt),
    timeShort: formatTimeShort(e.occurredAt),
    category: e.category,
    action: e.action,
    headline: headlineFor(e),
    reason: e.reason,
    reference: e.referenceId ?? undefined,
    balanceLine: balanceLineFor(e),
    actorLabel: e.actor.label,
    severity: e.severity,
    tags: e.tags,
    correlationId: e.correlationId,
  };
}

export function formatAuditLines(events: EconomyAuditEvent[]): AuditLine[] {
  return events.map(formatAuditLine);
}

export function formatAuditLineText(line: AuditLine): string {
  const rows = [
    line.timeShort,
    line.category,
    line.headline,
    line.reason,
    line.reference ? `Ref: ${line.reference}` : null,
    line.balanceLine ? `Balance: ${line.balanceLine}` : null,
    `Actor: ${line.actorLabel}`,
    line.correlationId ? `Corr: ${line.correlationId}` : null,
  ].filter(Boolean);
  return rows.join("\n");
}
