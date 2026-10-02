import type { EconomyAuditEvent } from "../audit/audit-types";
import { buildAuditTimeline } from "../audit/build-audit-timeline";
import { formatAuditLine } from "../audit/format-audit-line";

/** @deprecated Use EconomyAuditEvent from audit timeline */
export type EconomyReplayEntry = {
  at: string;
  kind: string;
  summary: string;
  deltaGold?: number;
  referenceId?: string | null;
  correlationId?: string | null;
};

export async function buildEconomyReplay(
  userId: string,
  days = 30
): Promise<EconomyReplayEntry[]> {
  const events = await buildAuditTimeline(userId, { days, limit: 300 });
  return events.map(replayEntryFromAuditEvent);
}

export function replayEntryFromAuditEvent(e: EconomyAuditEvent): EconomyReplayEntry {
  const line = formatAuditLine(e);
  return {
    at: e.occurredAt,
    kind: `${e.category}.${e.action}`,
    summary: `${line.headline} — ${line.reason}`,
    deltaGold: e.delta?.gold,
    referenceId: e.referenceId,
    correlationId: e.correlationId,
  };
}

/** @deprecated audit timeline 사용 */
export function replayEntryFromEvent(e: {
  at: string;
  action: string;
  summary: string;
  deltaGold?: number;
  referenceId?: string | null;
  metadata?: Record<string, unknown>;
}): EconomyReplayEntry {
  return {
    at: e.at,
    kind: e.action,
    summary: e.summary,
    deltaGold: e.deltaGold,
    referenceId: e.referenceId,
    correlationId:
      typeof e.metadata?.correlationId === "string" ? e.metadata.correlationId : undefined,
  };
}
