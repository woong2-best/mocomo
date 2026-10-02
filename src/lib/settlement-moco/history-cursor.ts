import type { UnifiedSettlementHistoryItem } from "@/lib/settlement-moco/history";

export type SettlementHistoryCursor = {
  at: string;
  id: string;
  kind: UnifiedSettlementHistoryItem["kind"];
};

export function encodeSettlementHistoryCursor(cursor: SettlementHistoryCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeSettlementHistoryCursor(raw: string | null): SettlementHistoryCursor | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as SettlementHistoryCursor;
    if (!parsed?.at || !parsed?.id || !parsed?.kind) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Sort key: newest first (at desc, id desc). */
export function compareHistoryItemsDesc(
  a: Pick<UnifiedSettlementHistoryItem, "at" | "id">,
  b: Pick<UnifiedSettlementHistoryItem, "at" | "id">,
): number {
  if (a.at !== b.at) return a.at > b.at ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id > b.id ? -1 : 1;
}

/** True if `item` is strictly older than cursor in desc-sorted timeline (eligible for next page). */
export function isHistoryItemBeforeCursor(
  item: Pick<UnifiedSettlementHistoryItem, "at" | "id">,
  cursor: SettlementHistoryCursor,
): boolean {
  if (item.at !== cursor.at) return item.at < cursor.at;
  return item.id < cursor.id;
}

export function mergeHistoryItemsDesc(
  items: UnifiedSettlementHistoryItem[],
  limit: number,
): {
  page: UnifiedSettlementHistoryItem[];
  nextCursor: SettlementHistoryCursor | null;
  hasMore: boolean;
} {
  const sorted = [...items].sort(compareHistoryItemsDesc);
  const page = sorted.slice(0, limit);
  const hasMore = sorted.length > limit;
  const last = page[page.length - 1];
  return {
    page,
    hasMore,
    nextCursor: hasMore && last ? { at: last.at, id: last.id, kind: last.kind } : null,
  };
}
